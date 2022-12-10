import { Deferred } from './deferred'
import { IsoDateString } from '../types'
import { Core } from './types'
import { splitList } from './tools'
import { supportedModules } from '../supportedModules'

const ignoreMissingIndexeddb = false

//------------------------------
// The current time, offset by the specified days
//------------------------------
const currentTimeOffset = (daysOffset:number) => {
    const offset = (24 * 60 * 60 * 1000) * daysOffset
    const date = new Date()
    date.setTime(date.getTime() + offset)
    return date
}

export class FileCache implements Core.FileCache {
    openPromise: Promise<IDBDatabase | null> | undefined
    dir: { [key: string]: {
            added: IsoDateString
            lastLoaded: IsoDateString
        }
    }

    syncTimer: NodeJS.Timeout | undefined

    constructor() {
        this.dir = {}
    }

    //------------------------------
    // Open the fileCache database (or return handle if open).
    //------------------------------
    async open() {
        if (this.openPromise) return this.openPromise
        const openDeferred = new Deferred<IDBDatabase | null>()

        const error = () => {
            console.log('indexedDB could not open!')
            this.dir = {}
            if (ignoreMissingIndexeddb) {
                openDeferred.resolve(null)
            } else {
                openDeferred.reject()
            }
        }

        const upgradeDB = (event:IDBVersionChangeEvent) => {
            if (!(event.target instanceof IDBOpenDBRequest)) {
                return
            }

            const db = event.target.result
            db.createObjectStore('files', { keyPath: 'name' })
        }

        const getDir = (event:Event) => {
            if (!(event.target instanceof IDBOpenDBRequest)) {
                return
            }
            const db = event.target.result
            const transaction = db.transaction('files', 'readonly')
            const store = transaction.objectStore('files')
            const request = store.get('[dir]')
            request.onsuccess = processDir
            transaction.oncomplete = openDeferred.resolve.bind(null, db)
            openDeferred.promise.then(setTimeout.bind(null, this.cleanup, 10000))
        }

        const processDir = (event: Event) => {
            if (!(event.target instanceof IDBRequest)) {
                return
            }
            const result = event.target.result

            if (result === undefined) {
                this.dir = {}
            } else {
                this.dir = JSON.parse(result.content)
            }
        }

        this.openPromise = openDeferred.promise
        const request = indexedDB.open('ksof.fileCache')
        request.onupgradeneeded = upgradeDB
        request.onsuccess = getDir
        request.onerror = error
        return openDeferred.promise
    }

    //------------------------------
    // Remove files that haven't been accessed in a while.
    //------------------------------
    cleanup() {
        const threshold = currentTimeOffset(-14)
        const oldFiles = []
        for (const fname in this.dir) {
            if (fname.match(/^ksof\.settings\./)) continue // Don't flush settings files.
            const fdate = new Date(this.dir[fname].lastLoaded)
            if (fdate < threshold) oldFiles.push(fname)
        }
        if (oldFiles.length === 0) return
        console.log(`Cleaning out ${oldFiles.length} old file(s) from "ksof.fileCache":`)
        for (const fnum in oldFiles) {
            console.log(`  ${Number(fnum) + 1}: ${oldFiles[fnum]}}`)
            this.delete(oldFiles[fnum])
        }
    }

    //------------------------------
    // Lists the content of the fileCache.
    //------------------------------
    ls() {
        console.log(Object.keys(this.dir).sort()
            .join('\n'))
    }

    //------------------------------
    // Clear the fileCache database.
    //------------------------------
    async clear() {
        const db = await this.open()

        const clearDeferred = new Deferred<void | Event>()
        this.dir = {}
        if (db === null) {
            return clearDeferred.resolve()
        }
        const transaction = db.transaction('files', 'readwrite')
        const store = transaction.objectStore('files')
        store.clear()
        transaction.oncomplete = clearDeferred.resolve
        return clearDeferred.promise
    }

    //------------------------------
    // Delete a file from the fileCache database.
    //------------------------------
    async delete(pattern: string | RegExp) {
        const db = await this.open()

        const delDeferred = new Deferred<string[]>()
        if (db === null) return delDeferred.resolve([])
        const transaction = db.transaction('files', 'readwrite')
        const store = transaction.objectStore('files')
        const files = Object.keys(this.dir).filter((file) => {
            if (pattern instanceof RegExp) {
                return file.match(pattern) !== null
            } else {
                return (file === pattern)
            }
        })
        files.forEach((file) => {
            store.delete(file)
            delete this.dir[file]
        })
        this.dirSave()
        transaction.oncomplete = delDeferred.resolve.bind(null, files)
        return delDeferred.promise
    }

    //------------------------------
    // Save a the fileCache directory contents.
    //------------------------------
    dirSave(immediately = false) {
        const delay = (immediately ? 0 : 2000)

        if (this.syncTimer) {
            clearTimeout(this.syncTimer)
        }

        this.syncTimer = setTimeout(() => {
            this.open()
                .then((db) => {
                    if (!db) {
                        return
                    }
                    this.syncTimer = undefined
                    const transaction = db.transaction('files', 'readwrite')
                    const store = transaction.objectStore('files')
                    store.put({ name: '[dir]', content: JSON.stringify(this.dir) })
                })
        }, delay)
    }

    //------------------------------
    // Force immediate save of fileCache directory.
    //------------------------------
    flush() {
        this.dirSave(true /* immediately */)
    }

    //------------------------------
    // Load a file from the fileCache database.
    //------------------------------
    async load(name:string) {
        const db = await this.open()
        if (!db) {
            return Promise.reject()
        }

        if (this.dir[name] === undefined) {
            return Promise.reject(name)
        }
        const loadDeferred = new Deferred<string | { [key: string]: any }>()
        const transaction = db.transaction('files', 'readonly')
        const store = transaction.objectStore('files')
        const request = store.get(name)
        this.dir[name].lastLoaded = new Date().toISOString() as IsoDateString
        this.dirSave()

        request.onsuccess = (event: Event) => {
            if (!(event.target instanceof IDBRequest)) {
                return
            }

            if (event.target.result === undefined) {
                loadDeferred.reject(name)
            } else {
                loadDeferred.resolve(event.target.result.content)
            }
        }

        request.onerror = () => {
            loadDeferred.reject(name)
        }

        return loadDeferred.promise
    }

    //------------------------------
    // Save a file into the fileCache database.
    //------------------------------
    async save(name:string, content: unknown, extraAttribs:object = {}) {
        const db = await this.open()

        if (db === null) return Promise.resolve(name)

        const saveDeferred = new Deferred<string>()
        const transaction = db.transaction('files', 'readwrite')
        const store = transaction.objectStore('files')
        store.put({ name, content })
        const now = new Date().toISOString() as IsoDateString
        this.dir[name] = Object.assign({ added: now, lastLoaded: now }, extraAttribs)
        this.dirSave(true /* immediately */)
        transaction.oncomplete = saveDeferred.resolve.bind(null, name)
        return saveDeferred.promise
    }

    //------------------------------
    // Process no-cache requests.
    //------------------------------
    fileNocache(list:string | string[] | undefined) {
        if (list === undefined) {
            list = splitList(localStorage.getItem('ksof.include.nocache') || '')
            list = list.concat(splitList(localStorage.getItem('ksof.load_file.nocache') || ''))
            console.log(list.join(','))
        } else if (typeof list === 'string') {
            const noCache = splitList(list)
            const modules = [], urls = []
            for (let idx = 0; idx < noCache.length; idx++) {
                const item = noCache[idx]
                if (supportedModules[item] !== undefined) {
                    modules.push(item)
                } else {
                    urls.push(item)
                }
            }
            console.log(`Modules: ${modules.join(',')}`)
            console.log(`   URLs: ${urls.join(',')}`)
            localStorage.setItem('ksof.include.nocache', modules.join(','))
            localStorage.setItem('ksof.load_file.nocache', urls.join(','))
        }
    }
}
