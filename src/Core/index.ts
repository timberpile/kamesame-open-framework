// ==UserScript==
// @name        KameSame Open Framework
// @namespace   timberpile
// @description Framework for writing scripts for KameSame
// @version     0.3
// @match       http*://*.kamesame.com/*
// @copyright   2022+, Robin Findley, Timberpile
// @license     MIT http://opensource.org/licenses/MIT
// @run-at      document-start
// @grant       none
// ==/UserScript==

// deprecated in favor of after_build.py
// These lines are necessary to make sure that TSC does not put any exports in the
// compiled js, which causes the script to crash
// eslint-disable-next-line no-var, @typescript-eslint/no-unused-vars
// var module = {}
// export = null

import { Core } from './types'
import { IsoDateString } from '../types'

declare global {
    interface Window {
        ksof: Core.Module
        $: JQueryStatic
    }
}

// Ensure locationchange always works
// https://stackoverflow.com/questions/6390341/how-to-detect-if-url-has-changed-after-hash-in-javascript
(() => {
    const oldPushState = history.pushState
    history.pushState = function pushState() {
        //eslint-disable-next-line prefer-rest-params
        const ret = oldPushState.apply(this, arguments as any)
        window.dispatchEvent(new Event('pushstate'))
        window.dispatchEvent(new Event('locationchange'))
        return ret
    }

    const oldReplaceState = history.replaceState
    history.replaceState = function replaceState() {
        //eslint-disable-next-line prefer-rest-params
        const ret = oldReplaceState.apply(this, arguments as any)
        window.dispatchEvent(new Event('replacestate'))
        window.dispatchEvent(new Event('locationchange'))
        return ret
    }

    window.addEventListener('popstate', () => {
        window.dispatchEvent(new Event('locationchange'))
    })
})();

(((global: Window) => {
    'use strict'

    const version = '0.1'
    const ignoreMissingIndexeddb = false

    //########################################################################
    //------------------------------
    // Supported Modules
    //------------------------------
    const supportedModules: { [key:string]: {url: string}} = {
        // Apiv2:    { url: ''},
        // ItemData: { url: ''},
        Jquery: { url: 'https://greasyfork.org/scripts/451523-kamesame-open-framework-jquery-module/code/KameSame%20Open%20Framework%20-%20Jquery%20module.js?version=1113601' },
        Menu: { url: 'https://greasyfork.org/scripts/451522-kamesame-open-framework-menu-module/code/KameSame%20Open%20Framework%20-%20Menu%20module.js?version=1113603' },
        // Progress: { url: ''},
        Settings: { url: 'https://greasyfork.org/scripts/451521-kamesame-open-framework-settings-module/code/KameSame%20Open%20Framework%20-%20Settings%20module.js?version=1113605' },
    }

    //########################################################################
    //------------------------------
    // Published interface
    //------------------------------

    const KANA_CHARS = '\u3040-\u30ff\uff66-\uff9f'
    const KANJI_CHARS = '\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff'
    const JAPANESE_CHARS = `${KANA_CHARS}${KANJI_CHARS}`

    class ReviewInfo implements Core.ReviewInfo {
        get answerCorrect() {
            const input = document.querySelector('#app.kamesame #study .input-area input')
            if (!input) {
                return null
            }
            const outcomes: Core.AnswerOutcome[] = [
                'exactly_correct',
                'reading_correct',
                'alternative_match_completion',
                'alternative_match',
                'incorrect',
            ]
            for (const outcome of outcomes) {
                if (input.classList.contains(outcome)) {
                    return outcome
                }
            }
            return null
        }

        get reviewType() {
            const input = document.querySelector('#app.kamesame #study .input-area input')
            if (!input) {
                return null
            }
            if (input.classList.contains('production')) {
                return 'production'
            }
            if (input.classList.contains('recognition')) {
                return 'recognition'
            }
            return null
        }
    }

    class PageInfo implements Core.PageInfo {
        // returns the type of the current page
        get on() {
            const matches: {
                tag: Core.Page
                matcher: RegExp
            }[] = [
                { tag: 'review', matcher: /kamesame\.com\/app\/reviews\/study\/[a-z0-9]+/ },
                { tag: 'review', matcher: /kamesame\.com\/app\/lessons\/study\/[a-z0-9]+/ },
                { tag: 'review_summary', matcher: /kamesame\.com\/app\/reviews\/summary/ },
                { tag: 'lessons_summary', matcher: /kamesame\.com\/app\/lessons\/summary/ },
                { tag: 'item_page', matcher: /kamesame\.com\/app\/items\/\d+/ },
                { tag: 'lessons', matcher: /kamesame\.com\/app\/lessons$/ },
                { tag: 'search', matcher: /kamesame\.com\/app\/search$/ },
                { tag: 'search_result', matcher: /kamesame\.com\/app\/search\// },
                { tag: 'account', matcher: /kamesame\.com\/app\/account/ },
                { tag: 'home', matcher: /kamesame\.com\/app$/ },
            ]

            for (const match of matches) {
                if (document.URL.match(match.matcher)) {
                    return match.tag
                }
            }

            return null
        }
    }

    // TODO better structure for Infos
    class ItemInfo implements Core.ItemInfo {
        constructor() {
            //
        }

        get variations() {
            switch (ksof.pageInfo.on) {
            case 'item_page':
                switch (this.type) {
                case 'vocabulary':
                    return this.facts['Variations'].split('、')
                case 'kanji':
                    break
                }
            }

            return null
        }

        get partsOfSpeech() {
            switch (ksof.pageInfo.on) {
            case 'item_page':
                switch (this.type) {
                case 'vocabulary':
                    return this.facts['Parts of Speech'].split(', ')
                case 'kanji':
                    break
                }
            }

            return null
        }

        get wanikaniLevel() {
            switch (ksof.pageInfo.on) {
            case 'item_page':
                switch (this.type) {
                case 'vocabulary':
                    return parseInt(this.facts['WaniKani Level'], 10)
                case 'kanji':
                    break
                }
            }

            return null
        }

        get tags() {
            switch (ksof.pageInfo.on) {
            case 'item_page':
                switch (this.type) {
                case 'vocabulary':
                    return this.facts['Tags'].split(', ')
                case 'kanji':
                    break
                }
            }

            return null
        }

        get id() {
            let url = ''
            if (ksof.pageInfo.on == 'review') {
                const itemLink = document.querySelector('#app.kamesame #study .outcome p a.item') as HTMLLinkElement | null
                if (!itemLink) {
                    return null
                }
                url = itemLink.href
            }
            else if (ksof.pageInfo.on == 'item_page') {
                url = document.URL
            }

            const match = RegExp(/app\/items\/(\d+)/).exec(url)
            if (!match) {
                return null
            }
            if (match.length < 2) {
                return null
            }
            return Number(match[1])
        }

        get characters() {
            if (ksof.pageInfo.on == 'review') {
                const outcomeText = document.querySelector('#app.kamesame #study .outcome p')?.textContent
                if (!outcomeText) {
                    return null
                }

                const regexes = [
                    // characters with reading explanation
                    RegExp(`([${JAPANESE_CHARS}]+)\\(read as`),
                    // characters without reading explanation, failed
                    RegExp(`looking for ([${JAPANESE_CHARS}]+)[\\s⏯]* instead`),
                    // characters without reading explanation, success
                    RegExp(`Indeed, ([${JAPANESE_CHARS}]+)[\\s⏯]*`),
                    RegExp(`That's right! ([${JAPANESE_CHARS}]+)[\\s⏯]*`),
                    // characters without reading explanation, different answer expected
                    RegExp(`we were actually looking for ([${JAPANESE_CHARS}]+)[\\s⏯]*`),
                ]

                // try out the different possible regexes until one hits
                for (const regex of regexes) {
                    const match = regex.exec(outcomeText)
                    if (match) {
                        return match[1]
                    }
                }
                return null
            }
            else if (ksof.pageInfo.on == 'item_page') {
                if (this.type == 'vocabulary') {
                    return document.querySelector('.name.vocabulary')?.textContent || null
                }
            }

            return null
        }

        get meanings() {
            if (ksof.pageInfo.on == 'review') {
                const outcomeText = document.querySelector('#app.kamesame #study .outcome p')?.textContent
                if (!outcomeText) {
                    return null
                }

                const regexes = [
                    /does(?: not)? mean[\s\n]*((?:".*?"[, or]*)+)/g,
                    /We'd have accepted[\s\n]*((?:".*?"[, or]*)+)/g,
                ]

                // try out all possible regexes
                const meanings:string[] = []
                for (const regex of regexes) {
                    const match = regex.exec(outcomeText)
                    if (match) {
                        const match1 = match[1]
                        const match2 = match1.replaceAll(' or ', ',')
                        const match3 = match2.split(',')

                        for (const item of match3) {
                            meanings.push(item.replaceAll('"', '').trim())
                        }
                    }
                }
                return meanings
            }
            else if (ksof.pageInfo.on == 'item_page') {
                if (this.type == 'vocabulary') {
                    return this.facts['Meanings'].split(', ')
                }
            }

            return null
        }

        get readings() {
            if (ksof.pageInfo.on == 'review') {
                const outcomeText = document.querySelector('#app.kamesame #study .outcome p')?.textContent
                if (!outcomeText) {
                    return null
                }
                const readings:string[] = []

                const rawReadingsRegex = new RegExp(`\\(read as ([${KANA_CHARS},a-z\\s⏯]+)\\)`)
                let match = rawReadingsRegex.exec(outcomeText)
                if (match) {
                    const readingsRaw = match[1]

                    const readingsRegex = new RegExp(`[${KANA_CHARS}]+`, 'g')
                    match = readingsRegex.exec(readingsRaw)
                    while (match != null) {
                        readings.push(match[0]) // captured readings
                        match = readingsRegex.exec(readingsRaw)
                    }
                }

                if (readings.length == 0) {
                    const characters = this.characters || ''
                    if (RegExp(`[${KANA_CHARS}]`).test(characters)) {
                        readings.push(characters) // if word only consists of kana, then there are no readings in the outcome text, so we just use the word itself
                    }
                }
                return readings
            }
            else if (ksof.pageInfo.on == 'item_page') {
                if (this.type == 'vocabulary') {
                    return this.facts['Readings'].replaceAll(' ⏯', '').split('、')
                }
            }

            return null
        }

        get facts() {
            const facts: {[key: string]: string} = {}
            for (const fact of document.querySelectorAll('#item .facts .fact')) {
                const key = fact.querySelector('.key')?.textContent || ''
                let val = ''

                if (key == 'Tags') {
                    const tags: string[] = []
                    for (const tag of fact.querySelectorAll('.value .item-tag')) {
                        if (tag.textContent) {
                            tags.push(tag.textContent)
                        }
                    }
                    val = tags.join(', ')
                }
                else {
                    val = fact.querySelector('.value')?.textContent || ''
                }
                facts[key] = val
            }

            return facts
        }

        get type() {
            if (ksof.pageInfo.on == 'review') {
                //
            }
            else if (ksof.pageInfo.on == 'item_page') {
                if (document.querySelector('#item h2')?.textContent == 'Vocabulary summary') {
                    return 'vocabulary'
                }
                else if (document.querySelector('#item h2')?.textContent == 'Kanji summary') {
                    return 'kanji'
                }
            }
            return null
        }

        get summary() {
            return {
                characters: this.characters,
                meanings: this.meanings,
                readings: this.readings,
                variations: this.variations,
                partsOfSpeech: this.partsOfSpeech,
                wanikaniLevel: this.wanikaniLevel,
                tags: this.tags,
                on: ksof.pageInfo.on,
                type: this.type,
            }
        }
    }

    class KSOF implements Core.Module {
        fileCache: FileCache
        supportFiles: { [key: string]: string }
        version: Version
        stateListeners: {[key:string]: Core.StateListener[]}
        stateValues: {[key:string]: string}
        eventListeners: {[key:string]: Core.UnknownCallback[]}
        domObservers: Core.DomObserver[] // TODO write documentation about DOM observers
        includePromises: {[key:string]: Promise<string>} // Promise<url>
        itemInfo: ItemInfo
        reviewInfo: ReviewInfo
        pageInfo: PageInfo

        constructor() {
            this.fileCache = new FileCache()
            this.version = new Version(version)
            this.stateListeners = {}
            this.stateValues = {}
            this.eventListeners = {}
            this.domObservers = []
            this.includePromises = {}
            this.itemInfo = new ItemInfo()
            this.reviewInfo = new ReviewInfo()
            this.pageInfo = new PageInfo()
            this.supportFiles = {
                'jquery.js': 'https://ajax.googleapis.com/ajax/libs/jquery/3.6.1/jquery.min.js',
                'jquery_ui.js': 'https://ajax.googleapis.com/ajax/libs/jqueryui/1.13.2/jquery-ui.min.js',
                'jqui_ksmain.css': 'https://raw.githubusercontent.com/timberpile/kamesame-open-framework/master/src/jqui-ksmain.css',
            }
        }

        //------------------------------
        // Load a file asynchronously, and pass the file as resolved Promise data.
        //------------------------------
        async loadFile(url: string, useCache?: boolean) {
            const fetchDeferred = new Deferred<any>()
            const noCache = splitList(localStorage.getItem('ksof.load_file.nocache') || '')
            if (noCache.indexOf(url) >= 0 || noCache.indexOf('*') >= 0) {
                useCache = false
            }
            if (useCache === true) {
                try {
                    return await this.fileCache.load(url)
                } catch (error) {
                    // file not in cache
                }
            }

            // Retrieve file from server
            const request = new XMLHttpRequest()
            request.onreadystatechange = async (event) => {
                if (event.target != request) {
                    return
                }
                if (request.readyState !== 4) {
                    return
                }
                if (request.status >= 400 || request.status === 0) {
                    fetchDeferred.reject(request.status)
                    return
                }
                if (useCache) {
                    await ksof.fileCache.save(url, request.response)
                    fetchDeferred.resolve.bind(null, request.response)
                } else {
                    fetchDeferred.resolve(request.response)
                }
            }
            request.open('GET', url, true)
            request.send()
            request.onerror = (event) => {
                if (event.target != request) {
                    return
                }

                fetchDeferred.reject(request.status)
            }
            return fetchDeferred.promise
        }

        //------------------------------
        // Get the value of a state variable, and notify listeners.
        //------------------------------
        getState(stateVar:string) {
            return this.stateValues[stateVar]
        }

        //------------------------------
        // Set the value of a state variable, and notify listeners.
        //------------------------------
        setState(stateVar:string, value:string) {
            const oldValue = this.stateValues[stateVar]
            if (oldValue === value) return
            this.stateValues[stateVar] = value

            // Do listener callbacks, and remove non-persistent listeners
            const listeners = this.stateListeners[stateVar]
            const persistentListeners:Core.StateListener[] = []
            for (const idx in listeners) {
                const listener = listeners[idx]
                let keep = true
                if (listener.value === value || listener.value === '*') {
                    keep = listener.persistent
                    try {
                        if (listener.callback) {
                            listener.callback(value, oldValue)
                        }
                    } catch (e) {
                        //do nothing
                    }
                }
                if (keep) persistentListeners.push(listener)
            }
            this.stateListeners[stateVar] = persistentListeners
        }

        //------------------------------
        // When state of stateVar changes to value, call callback.
        // If persistent === true, continue listening for additional state changes
        // If value is '*', callback will be called for all state changes.
        //------------------------------
        waitState(stateVar:string, value:Core.StateValue, callback?: Core.StateCallback, persistent = false) {
            const promise = new Deferred<string>()

            // if no callback defined, set resolve as callback
            // if callback defined, set callback and resolve as callback
            const promiseCallback = callback ? ((newValue:Core.StateValue, prevValue:Core.StateValue) => { callback(newValue, prevValue); promise.resolve(newValue) }) : promise.resolve

            if (this.stateListeners[stateVar] === undefined) {
                this.stateListeners[stateVar] = []
            }
            const currentValue = this.stateValues[stateVar]
            if (persistent || value !== currentValue) {
                this.stateListeners[stateVar].push({ callback: promiseCallback, persistent, value })
            }

            // If it's already at the desired state, call the callback immediately.
            if (value === currentValue) {
                try {
                    promiseCallback(value, currentValue)
                } catch (err) {
                    //do nothing
                }
            }
            return promise.promise
        }

        //------------------------------
        // Fire an event, which then calls callbacks for any listeners.
        //------------------------------
        trigger(event: string, ...args_: unknown[]) {
            const listeners = this.eventListeners[event]
            if (listeners === undefined) return this
            const args:unknown[] = []
            Array.prototype.push.apply(args, args_)
            args.shift()
            for (const idx in listeners) try {
                listeners[idx].apply(null, args)
            } catch (err) {
                //do nothing
            }
        }

        //------------------------------
        // Add a listener for an event.
        //------------------------------
        on(event:string, callback: Core.UnknownCallback) {
            if (this.eventListeners[event] === undefined) this.eventListeners[event] = []
            this.eventListeners[event].push(callback)
        }

        //------------------------------
        // Load and install a specific file type into the DOM.
        //------------------------------
        async #loadAndAppend(url:string, tagname:string, location:string, useCache?:boolean) {
            url = url.replace(/"/g, '\'')
            if (document.querySelector(`${tagname}[uid="${url}"]`) !== null) {
                return Promise.resolve(url)
            }

            let content:string
            try {
                content = await this.loadFile(url, useCache)
            } catch (error) {
                return Promise.reject(url)
            }

            const tag = document.createElement(tagname)
            tag.innerHTML = content
            tag.setAttribute('uid', url)
            const locationElem = document.querySelector(location)
            if (locationElem) {
                locationElem.appendChild(tag)
            }
            return Promise.resolve(url)
        }

        //------------------------------
        // Load and install Javascript.
        //------------------------------
        async loadScript(url:string, useCache?: boolean) {
            return this.#loadAndAppend(url, 'script', 'body', useCache)
        }

        //------------------------------
        // Load and install a CSS file.
        //------------------------------
        async loadCSS(url:string, useCache?:boolean) {
            return this.#loadAndAppend(url, 'style', 'head', useCache)
        }

        //------------------------------
        // Include a list of modules.
        //------------------------------
        async include(moduleList:string): Promise<{loaded:string[]; failed:Core.FailedInclude[]}> {
            await this.ready('ksof')

            const includeDeferred = new Deferred<{loaded:string[]; failed:Core.FailedInclude[]}>()
            const moduleNames = splitList(moduleList)
            const scriptCount = moduleNames.length
            if (scriptCount === 0) {
                includeDeferred.resolve({ loaded: [], failed: [] })
                return includeDeferred.promise
            }

            const checkDone = () => {
                if (++doneCount < scriptCount) return
                if (failed.length === 0) includeDeferred.resolve({ loaded, failed })
                else includeDeferred.reject({ error: 'Failure loading module', loaded, failed })
            }

            const pushLoaded = (url:string) => {
                loaded.push(url)
                checkDone()
            }

            const pushFailed = (url:string) => {
                failed.push({ url })
                checkDone()
            }

            let doneCount = 0
            const loaded: string[] = []
            const failed: Core.FailedInclude[] = []
            const noCache = splitList(localStorage.getItem('ksof.include.nocache') || '')
            for (const moduleName of moduleNames) {
                const module = supportedModules[moduleName]
                if (!module) {
                    failed.push({ name: moduleName })
                    checkDone()
                    continue
                }
                let awaitLoad = this.includePromises[moduleName]
                const useCache = (noCache.indexOf(moduleName) < 0) && (noCache.indexOf('*') < 0)
                if (!useCache) ksof.fileCache.delete(module.url)
                if (awaitLoad === undefined) {
                    this.includePromises[moduleName] = awaitLoad = this.loadScript(module.url, useCache)
                }
                awaitLoad.then(pushLoaded, pushFailed)
            }

            return includeDeferred.promise
        }

        //------------------------------
        // Wait for all modules to report that they are ready
        //------------------------------
        ready(moduleList:string): Promise<'ready' | 'ready'[]> {
            const moduleNames = splitList(moduleList)

            const readyPromises: Promise<'ready'>[] = []
            for (const idx in moduleNames) {
                const moduleName = moduleNames[idx]
                readyPromises.push(this.waitState(`ksof.${moduleName}`, 'ready') as Promise<'ready'>)
            }

            if (readyPromises.length === 0) {
                return Promise.resolve('ready')
            } else if (readyPromises.length === 1) {
                return readyPromises[0]
            } else {
                return Promise.all(readyPromises)
            }
        }

        // Throws Error if observer with the given name or query already exists
        addDomObserver(observer:Core.DomObserver) {
            for (const _observer of this.domObservers) {
                if (_observer.name == observer.name) {
                    throw new Error(`Observer with the name ${observer.name} already exists`)
                }
                if (_observer.query == observer.query) {
                    throw new Error(`Observer with the query ${observer.query} already exists under the name ${observer.name}`)
                }
            }

            this.domObservers.push(observer)
            this.checkDomObserver(observer)
        }

        domObserverState(name: string) {
            return `ksof.dom_observer.${name}`
        }

        checkDomObserver(observer:Core.DomObserver) {
            const visible = (document.querySelector(observer.query) != null)
            this.setState(this.domObserverState(observer.name), visible ? 'present' : 'absent')
        }
    }

    class Version implements Core.Version {
        value: string

        constructor(version:string) {
            this.value = version
        }

        //------------------------------
        // Compare the framework version against a specific version.
        //------------------------------
        compareTo(clientVersion:string) {
            const clientVer = clientVersion.split('.').map(d => Number(d))
            const ksofVer = version.split('.').map(d => Number(d))
            const len = Math.max(clientVer.length, ksofVer.length)
            for (let idx = 0; idx < len; idx++) {
                const a = clientVer[idx] || 0
                const b = ksofVer[idx] || 0
                if (a === b) continue
                if (a < b) return 'newer'
                return 'older'
            }
            return 'same'
        }
    }

    class FileCache implements Core.FileCache {
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
        // Lists the content of the fileCache.
        //------------------------------
        ls() {
            console.log(Object.keys(ksof.fileCache.dir).sort()
                .join('\n'))
        }

        //------------------------------
        // Clear the fileCache database.
        //------------------------------
        async clear() {
            const db = await fileCacheOpen()

            const clearDeferred = new Deferred<void | Event>()
            ksof.fileCache.dir = {}
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
            const db = await fileCacheOpen()

            const delDeferred = new Deferred<string[]>()
            if (db === null) return delDeferred.resolve([])
            const transaction = db.transaction('files', 'readwrite')
            const store = transaction.objectStore('files')
            const files = Object.keys(ksof.fileCache.dir).filter((file) => {
                if (pattern instanceof RegExp) {
                    return file.match(pattern) !== null
                } else {
                    return (file === pattern)
                }
            })
            files.forEach((file) => {
                store.delete(file)
                delete ksof.fileCache.dir[file]
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
                fileCacheOpen()
                    .then((db) => {
                        if (!db) {
                            return
                        }
                        this.syncTimer = undefined
                        const transaction = db.transaction('files', 'readwrite')
                        const store = transaction.objectStore('files')
                        store.put({ name: '[dir]', content: JSON.stringify(ksof.fileCache.dir) })
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
            const db = await fileCacheOpen()
            if (!db) {
                return Promise.reject()
            }

            if (ksof.fileCache.dir[name] === undefined) {
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
            const db = await fileCacheOpen()

            if (db === null) return Promise.resolve(name)

            const saveDeferred = new Deferred<string>()
            const transaction = db.transaction('files', 'readwrite')
            const store = transaction.objectStore('files')
            store.put({ name, content })
            const now = new Date().toISOString() as IsoDateString
            ksof.fileCache.dir[name] = Object.assign({ added: now, lastLoaded: now }, extraAttribs)
            ksof.fileCache.dirSave(true /* immediately */)
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

    //########################################################################

    const splitList = (str: string) => {
        // eslint-disable-next-line no-irregular-whitespace
        return str.replace(/、/g, ',').replace(/[\s　]+/g, ' ')
            .trim()
            .replace(/ *, */g, ',')
            .split(',')
            .filter((name) => { return (name.length > 0) })
    }

    class Deferred<T> {
        promise: Promise<T>
        resolve: (value: T | PromiseLike<T>) => void
        reject: (value?: any) => void

        constructor() {
            this.resolve = () => { /*placeholder*/ }
            this.reject = () => { /*placeholder*/ }
            this.promise = new Promise<T>((resolve, reject)=> {
                this.reject = reject
                this.resolve = resolve
            })
        }
    }

    //########################################################################


    //########################################################################

    let fileCacheOpenPromise: Promise<IDBDatabase | null> | undefined

    //------------------------------
    // Open the fileCache database (or return handle if open).
    //------------------------------
    const fileCacheOpen = async () => {
        if (fileCacheOpenPromise) return fileCacheOpenPromise
        const openDeferred = new Deferred<IDBDatabase | null>()

        const error = () => {
            console.log('indexedDB could not open!')
            ksof.fileCache.dir = {}
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
            openDeferred.promise.then(setTimeout.bind(null, fileCacheCleanup, 10000))
        }

        const processDir = (event: Event) => {
            if (!(event.target instanceof IDBRequest)) {
                return
            }
            const result = event.target.result

            if (result === undefined) {
                ksof.fileCache.dir = {}
            } else {
                ksof.fileCache.dir = JSON.parse(result.content)
            }
        }

        fileCacheOpenPromise = openDeferred.promise
        const request = indexedDB.open('ksof.fileCache')
        request.onupgradeneeded = upgradeDB
        request.onsuccess = getDir
        request.onerror = error
        return openDeferred.promise
    }

    //------------------------------
    // The current time, offset by the specified days
    //------------------------------
    const currentTimeOffset = (daysOffset:number) => {
        const offset = (24 * 60 * 60 * 1000) * daysOffset
        const date = new Date()
        date.setTime(date.getTime() + offset)
        return date
    }

    //------------------------------
    // Remove files that haven't been accessed in a while.
    //------------------------------
    const fileCacheCleanup = () => {
        const threshold = currentTimeOffset(-14)
        const oldFiles = []
        for (const fname in ksof.fileCache.dir) {
            if (fname.match(/^ksof\.settings\./)) continue // Don't flush settings files.
            const fdate = new Date(ksof.fileCache.dir[fname].lastLoaded)
            if (fdate < threshold) oldFiles.push(fname)
        }
        if (oldFiles.length === 0) return
        console.log(`Cleaning out ${oldFiles.length} old file(s) from "ksof.fileCache":`)
        for (const fnum in oldFiles) {
            console.log(`  ${Number(fnum) + 1}: ${oldFiles[fnum]}}`)
            ksof.fileCache.delete(oldFiles[fnum])
        }
    }

    const initPageDomObservers = () => {
        const pageQueries = new Map([
            ['item_page',       '#app.kamesame #item .facts .fact'],
            ['review',         '#app.kamesame #study .meaning'],
            ['review_summary',  '#app.kamesame #reviews #reviewsSummary .level-bars'],
            ['lessons_summary', '#app.kamesame #summary .item-list li a.item'],
            ['lessons',        '#app.kamesame #lessons #lessonsFromLists.section'],
            ['search',         '#app.kamesame #search form .search-bar #searchQuery'],
            ['search_result',   '#app.kamesame #search .fancy-item-list .actions'],
            ['home',           '#app.kamesame #home .section .stats'],
            ['account',        '#app.kamesame #account .fun-stuff'],
        ])

        const setStateReady = () => { ksof.setState('ksof.document', 'ready') }

        for (const query of pageQueries) {
            const observer = { name: `page.${query[0]}`, query: query[1] }
            ksof.addDomObserver(observer)
            ksof.waitState(ksof.domObserverState(observer.name), 'present', setStateReady)
        }
    }

    //########################################################################
    //------------------------------
    // Body Changes Observation
    //------------------------------

    const onBodyMutated = () => {
        for (const observer of ksof.domObservers) {
            ksof.checkDomObserver(observer)
        }
    }

    // Because KameSame loads its DOM data after the doc is already loaded, we need to make an additional check
    // to see if the DOM elements have been added to the body already before we can mark the doc as truly ready
    const initDomObserver = () => {
        const bodyObserver = new MutationObserver(onBodyMutated)

        bodyObserver.observe(document.body, { childList: true, subtree: true })

        // Add default Observers
        ksof.addDomObserver({ name: 'study_outcome', query: '#app.kamesame #study .outcome p a.item' })

        // TODO
        // HACK THAT SHOULD BE REMOVED ONCE ISSUE FIXED:
        // On some of the KameSame pages (like during reviews) bodyObserver never automatically
        // processes the mutations it records. I have no idea why. On the dicionary entry pages
        // this isn't a problem. So we also manually process these events instead once in a while
        const checkObserver = () => {
            const mutations = bodyObserver.takeRecords()
            if (mutations.length > 0) {
                onBodyMutated()
            }
            setTimeout(checkObserver, 100)
        }
        checkObserver()
    }

    const onDocumentLoaded = () => {
        initDomObserver()

        initPageDomObservers()

        window.addEventListener('locationchange', () => {
            ksof.setState('ksof.document', '') // Reset document state when navigating to different page

            setTimeout(() => { ksof.setState('ksof.document', 'ready') }, 2000) // fallback if unknown page -> assume everything loaded after 2 seconds

            ksof.trigger('ksof.page_changed')
        })
    }

    //########################################################################
    //------------------------------
    // Bootloader Startup
    //------------------------------
    const startup = () => {
        // Start doc ready check once doc is loaded
        if (document.readyState === 'complete') {
            onDocumentLoaded()
        } else {
            window.addEventListener('load', onDocumentLoaded, false)  // Notify listeners that we are ready.
        }

        // Open cache, so ksof.fileCache.dir is available to console immediately.
        fileCacheOpen()
        ksof.setState('ksof.ksof', 'ready')
    }

    // eslint-disable-next-line no-var
    var ksof = new KSOF()
    global.ksof = ksof

    startup()
})(window))
