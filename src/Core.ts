// ==UserScript==
// @name        KameSame Open Framework
// @namespace   timberpile
// @description Framework for writing scripts for KameSame
// @version     0.1
// @match       http*://*kamesame.com/*
// @copyright   2022+, Robin Findley, Timberpile
// @license     MIT; http://opensource.org/licenses/MIT
// @run-at      document-start
// @grant       none
// ==/UserScript==

import { CallbackFunction, StateListener, unknownCallback, KSOFI } from './types';

(function(global: Window) {
    'use strict';


    /* eslint no-multi-spaces: off */
    /* globals ksof */

    const version = '0.1';
    const ignore_missing_indexeddb = false;

    //########################################################################
    //------------------------------
    // Supported Modules
    //------------------------------
    const supported_modules: { [key:string]: {url: string}} = {
        // Apiv2:    { url: 'https://greasyfork.org/scripts/38581-wanikani-open-framework-apiv2-module/code/Wanikani%20Open%20Framework%20-%20Apiv2%20module.js?version=1091785'},
        // ItemData: { url: 'https://greasyfork.org/scripts/38580-wanikani-open-framework-itemdata-module/code/Wanikani%20Open%20Framework%20-%20ItemData%20module.js?version=1030159'},
        // Jquery:   { url: 'https://greasyfork.org/scripts/451078-wanikani-open-framework-jquery-module/code/Wanikani%20Open%20Framework%20-%20Jquery%20module.js?version=1091794'},
        // Menu:     { url: 'https://greasyfork.org/scripts/38578-wanikani-open-framework-menu-module/code/Wanikani%20Open%20Framework%20-%20Menu%20module.js?version=1091787'},
        // Progress: { url: 'https://greasyfork.org/scripts/38577-wanikani-open-framework-progress-module/code/Wanikani%20Open%20Framework%20-%20Progress%20module.js?version=1091792'},
        // Settings: { url: 'https://greasyfork.org/scripts/38576-wanikani-open-framework-settings-module/code/Wanikani%20Open%20Framework%20-%20Settings%20module.js?version=1091793'},

        // Apiv2:    { url: ''},
        // ItemData: { url: ''},
        Jquery:   { url: 'https://greasyfork.org/scripts/451523-kamesame-open-framework-jquery-module/code/KameSame%20Open%20Framework%20-%20Jquery%20module.js'},
        // Menu:     { url: 'https://greasyfork.org/scripts/451522-kamesame-open-framework-menu-module/code/KameSame%20Open%20Framework%20-%20Menu%20module.js'},
        Menu:     { url: 'https://greasyfork.org/scripts/451522-kamesame-open-framework-menu-module/code/KameSame%20Open%20Framework%20-%20Menu%20module.js?version=1099676'},
        // Progress: { url: ''},
        Settings: { url: 'https://greasyfork.org/scripts/451521-kamesame-open-framework-settings-module/code/KameSame%20Open%20Framework%20-%20Settings%20module.js'},
    }

    //########################################################################
    //------------------------------
    // Published interface
    //------------------------------

    class KSOF implements KSOFI {
        file_cache: FileCache
        support_files: { [key: string]: string }
        version: Version
        state_listeners: {[key:string]: StateListener[]}
        state_values: {[key:string]: string}
        event_listeners: {[key:string]: unknownCallback[]}
        include_promises: {[key:string]: Promise<string>}

        constructor() {
            this.file_cache = new FileCache()
            this.version = new Version(version)
            this.state_listeners = {}
            this.state_values = {}
            this.event_listeners = {}
            this.include_promises = {}
            this.support_files = {
                'jquery.js': 'https://ajax.googleapis.com/ajax/libs/jquery/3.6.1/jquery.min.js',
                'jquery_ui.js': 'https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js',
                'jqui_ksmain.css': 'https://raw.githubusercontent.com/timberpile/kamesame-open-framework/master/jqui-ksmain.css',
            }
        }

        //------------------------------
        // Load a file asynchronously, and pass the file as resolved Promise data.
        //------------------------------
        async load_file(url: string, use_cache: boolean) {
            const fetch_promise = new Deferred<any>();
            const no_cache = split_list(localStorage.getItem('ksof.load_file.nocache') || '');
            if (no_cache.indexOf(url) >= 0 || no_cache.indexOf('*') >= 0) {
                use_cache = false;
            }

            if (use_cache === true) {
                try {
                    return this.file_cache.load(url)
                } catch(error) {
                    // file not in cache
                }
            }

            // Retrieve file from server
            const request = new XMLHttpRequest();
            request.onreadystatechange = async (event) => {
                if (event.target != request) {
                    return
                }
                if (request.readyState !== 4) return;
                if (request.status >= 400 || request.status === 0) return fetch_promise.reject(request.status);
                if (use_cache) {
                    await ksof.file_cache.save(url, request.response)
                    fetch_promise.resolve.bind(null, request.response)
                } else {
                    fetch_promise.resolve(request.response);
                }
            }
            request.open('GET', url, true);
            request.send();
            return fetch_promise.promise;
        }

        //------------------------------
        // Get the value of a state variable, and notify listeners.
        //------------------------------
        get_state(state_var:string) {
            return this.state_values[state_var];
        }

        //------------------------------
        // Set the value of a state variable, and notify listeners.
        //------------------------------
        set_state(state_var:string, value:string) {
            const old_value = this.state_values[state_var];
            if (old_value === value) return;
            this.state_values[state_var] = value;

            // Do listener callbacks, and remove non-persistent listeners
            const listeners = this.state_listeners[state_var];
            const persistent_listeners:StateListener[] = [];
            for (const idx in listeners) {
                const listener = listeners[idx];
                let keep = true;
                if (listener.value === value || listener.value === '*') {
                    keep = listener.persistent;
                    try {
                        if (listener.callback) {
                            listener.callback(value, old_value);
                        }
                    } catch (e) {
                        //do nothing
                    }
                }
                if (keep) persistent_listeners.push(listener);
            }
            this.state_listeners[state_var] = persistent_listeners;
        }

        //------------------------------
        // When state of state_var changes to value, call callback.
        // If persistent === true, continue listening for additional state changes
        // If value is '*', callback will be called for all state changes.
        //------------------------------
        wait_state(state_var:string, value:string, callback: CallbackFunction | null = null, persistent = false) {
            // TODO better return value if callback defined
            let promise;
            if (callback === undefined) {
                promise = new Promise((resolve) => {
                    callback = resolve;
                });
            }
            if (this.state_listeners[state_var] === undefined) this.state_listeners[state_var] = [ ];
            persistent = (persistent === true);
            const current_value = this.state_values[state_var];
            if (persistent || value !== current_value) this.state_listeners[state_var].push({callback:callback, persistent:persistent, value:value});

            // If it's already at the desired state, call the callback immediately.
            if (value === current_value) {
                try {
                    if(callback) {
                        callback(value, current_value);
                    }
                } catch (err) {
                    //do nothing
                }
            }
            return promise;
        }

        //------------------------------
        // Fire an event, which then calls callbacks for any listeners.
        //------------------------------
        trigger_event(event: string, ...args_: unknown[]) {
            const listeners = this.event_listeners[event];
            if (listeners === undefined) return this;
            const args:unknown[] = [];
            Array.prototype.push.apply(args,args_);
            args.shift();
            for (const idx in listeners) try {
                listeners[idx].apply(null, args);
            } catch (err) {
                //do nothing
            }
            return this
        }

        //------------------------------
        // Add a listener for an event.
        //------------------------------
        wait_event(event:string, callback: unknownCallback) {
            if (this.event_listeners[event] === undefined) this.event_listeners[event] = [];
            this.event_listeners[event].push(callback);
            return this
        }

        //------------------------------
        // Load and install a specific file type into the DOM.
        //------------------------------
        async load_and_append(url:string, tag_name:string, location:string, use_cache:boolean) {
            url = url.replace(/"/g,'\'');
            if (document.querySelector(tag_name+'[uid="'+url+'"]') !== null) {
                return Promise.resolve('');
            }
            const content = await this.load_file(url, use_cache)

            const tag = document.createElement(tag_name);
            tag.innerHTML = content;
            tag.setAttribute('uid', url);
            const locationElem = document.querySelector(location)
            if (locationElem) {
                locationElem.appendChild(tag);
            }
            return url;
        }

        //------------------------------
        // Load and install Javascript.
        //------------------------------
        async load_script(url:string, use_cache: boolean) {
            return this.load_and_append(url, 'script', 'body', use_cache);
        }

        //------------------------------
        // Load and install a CSS file.
        //------------------------------
        async load_css(url:string, use_cache:boolean) {
            return this.load_and_append(url, 'style', 'head', use_cache);
        }

        //------------------------------
        // Include a list of modules.
        //------------------------------
        async include(module_list:string): Promise<object> {
            if (this.get_state('ksof.ksof') !== 'ready') {
                await this.ready('ksof')
                return this.include(module_list)
            }

            const include_promise = new Deferred<object>();
            const module_names = split_list(module_list);
            const script_cnt = module_names.length;
            if (script_cnt === 0) {
                include_promise.resolve({loaded:[], failed:[]});
                return include_promise.promise;
            }

            let done_cnt = 0;
            const loaded: string[] = []
            const failed: {name:string, url:string|undefined}[] = [];
            const no_cache = split_list(localStorage.getItem('ksof.include.nocache') || '');
            for (let idx = 0; idx < module_names.length; idx++) {
                const module_name = module_names[idx];
                const module = supported_modules[module_name];
                if (!module) {
                    failed.push({name:module_name, url:undefined});
                    check_done();
                    continue;
                }
                let await_load = this.include_promises[module_name];
                const use_cache = (no_cache.indexOf(module_name) < 0) && (no_cache.indexOf('*') < 0);
                if (!use_cache) ksof.file_cache.delete(module.url);
                if (await_load === undefined) {
                    this.include_promises[module_name] = await_load = this.load_script(module.url, use_cache);
                }
                await_load.then(push_loaded, push_failed);
            }

            return include_promise.promise;

            function push_loaded(url:string) {
                loaded.push(url);
                check_done();
            }

            function push_failed(url:string) {
                failed.push({name: '', url: url}); // TODO name
                check_done();
            }

            function check_done() {
                if (++done_cnt < script_cnt) return;
                if (failed.length === 0) include_promise.resolve({loaded:loaded, failed:failed});
                else include_promise.reject({error:'Failure loading module', loaded:loaded, failed:failed});
            }
        }

        //------------------------------
        // Wait for all modules to report that they are ready
        //------------------------------
        ready(module_list:string) {
            const module_names = split_list(module_list);

            const ready_promises = [ ];
            for (const idx in module_names) {
                const module_name = module_names[idx];
                ready_promises.push(this.wait_state('ksof.' + module_name, 'ready'));
            }

            if (ready_promises.length === 0) {
                return Promise.resolve();
            } else if (ready_promises.length === 1) {
                return ready_promises[0];
            } else {
                return Promise.all(ready_promises);
            }
        }
    }

    interface FileCacheEntry {
        added: string
        last_loaded: string
    }

    class Version {
        value: string

        constructor(version:string) {
            this.value = version
        }

        //------------------------------
        // Compare the framework version against a specific version.
        //------------------------------
        compare_to(client_version:string) {
            const client_ver = client_version.split('.').map(d => Number(d));
            const ksof_ver = version.split('.').map(d => Number(d));
            const len = Math.max(client_ver.length, ksof_ver.length);
            for (let idx = 0; idx < len; idx++) {
                const a = client_ver[idx] || 0;
                const b = ksof_ver[idx] || 0;
                if (a === b) continue;
                if (a < b) return 'newer';
                return 'older';
            }
            return 'same';
        }
    }

    class FileCache {
        dir: { [key: string]: FileCacheEntry }
        sync_timer: number | undefined

        constructor() {
            this.dir = {}
        }

        //------------------------------
        // Lists the content of the file_cache.
        //------------------------------
        ls() {
            console.log(Object.keys(ksof.file_cache.dir).sort().join('\n'));
        }

        //------------------------------
        // Clear the file_cache database.
        //------------------------------
        async clear() {
            const db = await file_cache_open()

            const clear_promise = new Deferred<void | Event>();
            ksof.file_cache.dir = {};
            if (db === null) {
                return clear_promise.resolve();
            }
            const transaction = db.transaction('files', 'readwrite');
            const store = transaction.objectStore('files');
            store.clear();
            transaction.oncomplete = clear_promise.resolve;
            return clear_promise.promise
        }

        //------------------------------
        // Delete a file from the file_cache database.
        //------------------------------
        async delete(pattern: string | RegExp): Promise<unknown> {
            const db = await file_cache_open()

            const del_promise = new Deferred<string[]>();
            if (db === null) return del_promise.resolve([]);
            const transaction = db.transaction('files', 'readwrite');
            const store = transaction.objectStore('files');
            const files = Object.keys(ksof.file_cache.dir).filter(function(file){
                if (pattern instanceof RegExp) {
                    return file.match(pattern) !== null;
                } else {
                    return (file === pattern);
                }
            });
            files.forEach(function(file){
                store.delete(file);
                delete ksof.file_cache.dir[file];
            });
            this.dir_save();
            transaction.oncomplete = del_promise.resolve.bind(null, files);
            return del_promise;
        }

        //------------------------------
        // Save a the file_cache directory contents.
        //------------------------------
        dir_save(immediately = false) {
            const delay = (immediately ? 0 : 2000)

            if (this.sync_timer !== undefined) {
                clearTimeout(this.sync_timer)
            }

            this.sync_timer = setTimeout(() => {
                file_cache_open()
                    .then((db) => {
                        if(!db) {
                            return
                        }
                        this.sync_timer = undefined;
                        const transaction = db.transaction('files', 'readwrite');
                        const store = transaction.objectStore('files');
                        store.put({name:'[dir]',content:JSON.stringify(ksof.file_cache.dir)});
                    });
            }, delay);
        }

        //------------------------------
        // Force immediate save of file_cache directory.
        //------------------------------
        flush() {
            this.dir_save(true /* immediately */);
        }

        //------------------------------
        // Load a file from the file_cache database.
        //------------------------------
        async load(name:string) {
            const db = await file_cache_open()
            if (!db) {
                return Promise.reject()
            }
            
            if (ksof.file_cache.dir[name] === undefined) {
                return Promise.reject(name)
            }
            const load_promise = new Deferred<any>()
            const transaction = db.transaction('files', 'readonly');
            const store = transaction.objectStore('files');
            const request = store.get(name);
            this.dir[name].last_loaded = new Date().toISOString();
            this.dir_save();
            request.onsuccess = finish;
            request.onerror = error;
            return load_promise.promise;

            function finish(event: Event){
                if(!(event.target instanceof IDBRequest)) {
                    return
                }

                if (event.target.result === undefined) {
                    load_promise.reject(name);
                } else {
                    load_promise.resolve(event.target.result.content);
                }
            }

            function error(){
                load_promise.reject(name);
            }
        }

        //------------------------------
        // Save a file into the file_cache database.
        //------------------------------
        async save(name:string, content:object, extra_attribs:object = {}) {
            const db = await file_cache_open()

            if (db === null) return Promise.resolve(name)

            const save_promise = new Deferred<string>()
            const transaction = db.transaction('files', 'readwrite');
            const store = transaction.objectStore('files');
            store.put({name:name,content:content});
            const now = new Date().toISOString();
            ksof.file_cache.dir[name] = Object.assign({added:now, last_loaded:now}, extra_attribs);
            ksof.file_cache.dir_save(true /* immediately */);
            transaction.oncomplete = save_promise.resolve.bind(null, name);
            return save_promise.promise
        }

        //------------------------------
        // Process no-cache requests.
        //------------------------------
        file_nocache(list:string | string[] | undefined) {
            if (list === undefined) {
                list = split_list(localStorage.getItem('ksof.include.nocache') || '');
                list = list.concat(split_list(localStorage.getItem('ksof.load_file.nocache') || ''));
                console.log(list.join(','));
            } else if (typeof list === 'string') {
                const no_cache = split_list(list);
                const modules = [], urls = [];
                for (let idx = 0; idx < no_cache.length; idx++) {
                    const item = no_cache[idx];
                    if (supported_modules[item] !== undefined) {
                        modules.push(item);
                    } else {
                        urls.push(item);
                    }
                }
                console.log('Modules: '+modules.join(','));
                console.log('   URLs: '+urls.join(','));
                localStorage.setItem('ksof.include.nocache', modules.join(','));
                localStorage.setItem('ksof.load_file.nocache', urls.join(','));
            }
        }
    }

    //########################################################################

    // eslint-disable-next-line no-irregular-whitespace
    function split_list(str: string) {return str.replace(/、/g,',').replace(/[\s　]+/g,' ').trim().replace(/ *, */g, ',').split(',').filter(function(name) {return (name.length > 0);});}
    
    class Deferred<T> {
        promise: Promise<T>
        resolve: (value: T | PromiseLike<T>) => void
        reject: (value?: any) => void

        constructor() {
            this.resolve = () => {/*placeholder*/}
            this.reject = () => {/*placeholder*/}
            this.promise = new Promise<T>((resolve, reject)=> {
                this.reject = reject
                this.resolve = resolve
            })
        }
    }

    //########################################################################


    //########################################################################

    let file_cache_open_promise: Promise<IDBDatabase | null> | undefined;

    //------------------------------
    // Open the file_cache database (or return handle if open).
    //------------------------------
    async function file_cache_open() {
        if (file_cache_open_promise) return file_cache_open_promise;
        const open_promise = new Deferred<IDBDatabase | null>();

        file_cache_open_promise = open_promise.promise;
        const request = indexedDB.open('ksof.file_cache')
        request.onupgradeneeded = upgrade_db;
        request.onsuccess = get_dir;
        request.onerror = error;
        return open_promise.promise;

        function error() {
            console.log('indexedDB could not open!');
            ksof.file_cache.dir = {};
            if (ignore_missing_indexeddb) {
                open_promise.resolve(null);
            } else {
                open_promise.reject();
            }
        }

        function upgrade_db(event:IDBVersionChangeEvent){
            if(!(event.target instanceof IDBOpenDBRequest)) {
                return
            }

            const db = event.target.result;
            db.createObjectStore('files', {keyPath:'name'});
        }

        function get_dir(event:Event){
            if(!(event.target instanceof IDBOpenDBRequest)) {
                return
            }
            const db = event.target.result;
            const transaction = db.transaction('files', 'readonly');
            const store = transaction.objectStore('files');
            const request = store.get('[dir]');
            request.onsuccess = process_dir
            transaction.oncomplete = open_promise.resolve.bind(null, db);
            open_promise.promise.then(setTimeout.bind(null, file_cache_cleanup, 10000));
        }

        function process_dir(event: Event){
            if(!(event.target instanceof IDBRequest)) {
                return
            }
            const result = event.target.result

            if (result === undefined) {
                ksof.file_cache.dir = {};
            } else {
                ksof.file_cache.dir = JSON.parse(result.content);
            }
        }
    }

    //
    // The current time, offset by the specified days
    //
    function current_time_offset(days_offset:number) {
        const offset = (24*60*60*1000) * days_offset
        const date = new Date()
        date.setTime(date.getTime() + offset)
        return date
    }

    //------------------------------
    // Remove files that haven't been accessed in a while.
    //------------------------------
    function file_cache_cleanup() {
        const threshold = current_time_offset(-14)
        const old_files = [];
        for (const fname in ksof.file_cache.dir) {
            if (fname.match(/^ksof\.settings\./)) continue; // Don't flush settings files.
            const fdate = new Date(ksof.file_cache.dir[fname].last_loaded);
            if (fdate < threshold) old_files.push(fname);
        }
        if (old_files.length === 0) return;
        console.log('Cleaning out '+old_files.length+' old file(s) from "ksof.file_cache":');
        for (const fnum in old_files) {
            console.log('  '+(Number(fnum)+1)+': '+old_files[fnum]);
            ksof.file_cache.delete(old_files[fnum]);
        }
    }

    function doc_ready() {
        ksof.set_state('ksof.document', 'ready');
    }

    //########################################################################
    // Bootloader Startup
    //------------------------------
    function startup() {
        // Mark document state as 'ready'.
        if (document.readyState === 'complete') {
            doc_ready();
        } else {
            window.addEventListener('load', doc_ready, false);  // Notify listeners that we are ready.
        }

        // Open cache, so ksof.file_cache.dir is available to console immediately.
        file_cache_open();
        ksof.set_state('ksof.ksof', 'ready');
    }

    // eslint-disable-next-line no-var
    var ksof = new KSOF();
    global.ksof = ksof

    startup();
})(window);
