import { Core } from './types'
import { ReviewInfo } from './reviewInfo'
import { PageInfo } from './pageInfo'
import { ItemInfo } from './itemInfo'
import { Version } from './version'
import { Deferred } from './deferred'
import { FileCache } from './fileCache'
import { splitList } from './tools'
import { supportedModules } from '../supportedModules'
import { DomObserver } from './domObserver'

const version = '0.4'

//------------------------------
// Published interface
//------------------------------
export class KSOF implements Core.Module {
    fileCache: FileCache
    supportFiles: { [key: string]: string }
    version: Version
    stateListeners: {[key:string]: Core.StateListener[]}
    stateValues: {[key:string]: string}
    eventListeners: {[key:string]: Core.UnknownCallback[]}
    domObserver: Core.DomObserver // TODO write documentation about DOM observers
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
        this.domObserver = new DomObserver()
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
                await this.fileCache.save(url, request.response)
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
            if (!useCache) this.fileCache.delete(module.url)
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
}
