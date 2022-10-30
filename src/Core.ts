// ==UserScript==
// @name        KameSame Open Framework
// @namespace   timberpile
// @description Framework for writing scripts for KameSame
// @version     0.2
// @match       http*://*.kamesame.com/*
// @copyright   2022+, Robin Findley, Timberpile
// @license     MIT; http://opensource.org/licenses/MIT
// @run-at      document-start
// @grant       none
// ==/UserScript==

// deprecated in favor of after_build.py
// These lines are necessary to make sure that TSC does not put any exports in the
// compiled js, which causes the script to crash
// eslint-disable-next-line no-var, @typescript-eslint/no-unused-vars
// var module = {}
// export = null

import { Core, IsoDateString } from './ksof';

declare global {
    interface Window {
        //eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        ksof: Core.Module
        $: JQueryStatic
    }
}

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
        // Apiv2:    { url: ''},
        // ItemData: { url: ''},
        Jquery:   { url: 'https://greasyfork.org/scripts/451523-kamesame-open-framework-jquery-module/code/KameSame%20Open%20Framework%20-%20Jquery%20module.js?version=1102410'},
        Menu:     { url: 'https://greasyfork.org/scripts/451522-kamesame-open-framework-menu-module/code/KameSame%20Open%20Framework%20-%20Menu%20module.js?version=1110889'},
        // Progress: { url: ''},
        Settings: { url: 'https://greasyfork.org/scripts/451521-kamesame-open-framework-settings-module/code/KameSame%20Open%20Framework%20-%20Settings%20module.js?version=1102409'},
    }

    //########################################################################
    //------------------------------
    // Published interface
    //------------------------------

    const KANA_CHARS = '\u3040-\u30ff\uff66-\uff9f'
    const KANJI_CHARS = '\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff'
    const JAPANESE_CHARS = `${KANA_CHARS}${KANJI_CHARS}`

    function dom_observer_state(name: string) {
        return 'ksof.dom_observer.' + name
    }

    class ReviewInfo implements Core.ReviewInfo {
        get answer_correct() {
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

        get review_type() {
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
                tag: Core.Page;
                matcher: RegExp;
            }[] = [
                {tag: 'review', matcher: /kamesame\.com\/app\/reviews\/study\/[a-z0-9]+/},
                {tag: 'review', matcher: /kamesame\.com\/app\/lessons\/study\/[a-z0-9]+/},
                {tag: 'reviewSummary', matcher: /kamesame\.com\/app\/reviews\/summary/},
                {tag: 'lessonsSummary', matcher: /kamesame\.com\/app\/lessons\/summary/},
                {tag: 'itemPage', matcher: /kamesame\.com\/app\/items\/\d+/},
                {tag: 'lessons', matcher: /kamesame\.com\/app\/lessons$/},
                {tag: 'search', matcher: /kamesame\.com\/app\/search$/},
                {tag: 'searchResult', matcher: /kamesame\.com\/app\/search\//},
                {tag: 'account', matcher: /kamesame\.com\/app\/account/},
                {tag: 'home', matcher: /kamesame\.com\/app$/},
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
            case 'itemPage':
                switch (this.type) {
                case 'vocabulary':
                    return this.facts['Variations'].split('、')
                case 'kanji':
                    break;
                }
            }

            return null
        }

        get parts_of_speech() {
            switch (ksof.pageInfo.on) {
            case 'itemPage':
                switch (this.type) {
                case 'vocabulary':
                    return this.facts['Parts of Speech'].split(', ')
                case 'kanji':
                    break;
                }
            }

            return null
        }

        get wanikani_level() {
            switch (ksof.pageInfo.on) {
            case 'itemPage':
                switch (this.type) {
                case 'vocabulary':
                    return parseInt(this.facts['WaniKani Level'])
                case 'kanji':
                    break;
                }
            }

            return null
        }

        get tags() {
            switch (ksof.pageInfo.on) {
            case 'itemPage':
                switch (this.type) {
                case 'vocabulary':
                    return this.facts['Tags'].split(', ')
                case 'kanji':
                    break;
                }
            }

            return null
        }

        get id() {
            let url = ''
            if (ksof.pageInfo.on == 'review') {
                const item_link = document.querySelector('#app.kamesame #study .outcome p a.item') as HTMLLinkElement | null
                if (!item_link) {
                    return null
                }
                url = item_link.href
            }
            else if (ksof.pageInfo.on == 'itemPage') {
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
                const outcome_text = document.querySelector('#app.kamesame #study .outcome p')?.textContent
                if (!outcome_text) {
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
                    const match = regex.exec(outcome_text);
                    if (match) {
                        return match[1]
                    }
                }
                return null
            }
            else if (ksof.pageInfo.on == 'itemPage') {
                if (this.type == 'vocabulary') {
                    return document.querySelector('.name.vocabulary')?.textContent || null
                }
            }

            return null
        }

        get meanings() {

            if (ksof.pageInfo.on == 'review') {
                const outcome_text = document.querySelector('#app.kamesame #study .outcome p')?.textContent
                if (!outcome_text) {
                    return null
                }
    
                const regexes = [
                    /does(?: not)? mean[\s\n]*((?:".*?"[, or]*)+)/g,
                    /We'd have accepted[\s\n]*((?:".*?"[, or]*)+)/g,
                ]
    
                // try out all possible regexes
                const meanings:string[] = []
                for (const regex of regexes) {
                    const match = regex.exec(outcome_text);
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
            else if (ksof.pageInfo.on == 'itemPage') {
                if (this.type == 'vocabulary') {
                    return this.facts['Meanings'].split(', ')
                }
            }

            return null
        }

        get readings() {
            if (ksof.pageInfo.on == 'review') {
                const outcome_text = document.querySelector('#app.kamesame #study .outcome p')?.textContent
                if (!outcome_text) {
                    return null
                }
                const readings:string[] = []
                
                const rawReadingsRegex = new RegExp(`\\(read as ([${KANA_CHARS},a-z\\s⏯]+)\\)`);
                let match = rawReadingsRegex.exec(outcome_text);
                if (match) {
                    const readings_raw = match[1]
                    
                    const readingsRegex = new RegExp(`[${KANA_CHARS}]+`, 'g');
                    match = readingsRegex.exec(readings_raw);
                    while (match != null) {
                        readings.push(match[0]) // captured readings
                        match = readingsRegex.exec(readings_raw);
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
            else if (ksof.pageInfo.on == 'itemPage') {
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
                    for(const tag of fact.querySelectorAll('.value .item-tag')) {
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
            else if (ksof.pageInfo.on == 'itemPage') {
                if(document.querySelector('#item h2')?.textContent == 'Vocabulary summary') {
                    return 'vocabulary'
                }
                else if(document.querySelector('#item h2')?.textContent == 'Kanji summary') {
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
                parts_of_speech: this.parts_of_speech,
                wanikani_level: this.wanikani_level,
                tags: this.tags,
                on: ksof.pageInfo.on,
                type: this.type
            }
        }
    }

    class KSOF implements Core.Module {
        file_cache: FileCache
        support_files: { [key: string]: string }
        version: Version
        state_listeners: {[key:string]: Core.StateListener[]}
        state_values: {[key:string]: string}
        event_listeners: {[key:string]: Core.UnknownCallback[]}
        dom_observers: Core.DomObserver[] // TODO write documentation about DOM observers
        include_promises: {[key:string]: Promise<string>} // Promise<url>
        itemInfo: ItemInfo
        reviewInfo: ReviewInfo
        pageInfo: PageInfo

        constructor() {
            this.file_cache = new FileCache()
            this.version = new Version(version)
            this.state_listeners = {}
            this.state_values = {}
            this.event_listeners = {}
            this.dom_observers = []
            this.include_promises = {}
            this.itemInfo = new ItemInfo()
            this.reviewInfo = new ReviewInfo()
            this.pageInfo = new PageInfo()
            this.support_files = {
                'jquery.js': 'https://ajax.googleapis.com/ajax/libs/jquery/3.6.1/jquery.min.js',
                'jquery_ui.js': 'https://ajax.googleapis.com/ajax/libs/jqueryui/1.13.2/jquery-ui.min.js',
                'jqui_ksmain.css': 'https://raw.githubusercontent.com/timberpile/kamesame-open-framework/master/src/jqui-ksmain.css',
            }
        }

        //------------------------------
        // Load a file asynchronously, and pass the file as resolved Promise data.
        //------------------------------
        async load_file(url: string, use_cache?: boolean) {
            const fetch_deferred = new Deferred<any>();
            const no_cache = split_list(localStorage.getItem('ksof.load_file.nocache') || '');
            if (no_cache.indexOf(url) >= 0 || no_cache.indexOf('*') >= 0) {
                use_cache = false;
            }
            if (use_cache === true) {
                try {
                    return await this.file_cache.load(url)
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
                if (request.status >= 400 || request.status === 0) return Promise.reject(request.status);
                if (use_cache) {
                    await ksof.file_cache.save(url, request.response)
                    fetch_deferred.resolve.bind(null, request.response)
                } else {
                    fetch_deferred.resolve(request.response);
                }
            }
            request.open('GET', url, true);
            request.send();
            return fetch_deferred.promise;
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
            const persistent_listeners:Core.StateListener[] = [];
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
        wait_state(state_var:string, value:Core.StateValue, callback?: Core.StateCallback, persistent = false) {
            const promise = new Deferred<string>()

            // if no callback defined, set resolve as callback
            // if callback defined, set callback and resolve as callback
            const promise_callback = callback ? ((new_value:Core.StateValue, prev_value:Core.StateValue) => {callback(new_value, prev_value); promise.resolve(new_value) }) : promise.resolve

            if (this.state_listeners[state_var] === undefined) {
                this.state_listeners[state_var] = []
            }
            const current_value = this.state_values[state_var];
            if (persistent || value !== current_value) {
                this.state_listeners[state_var].push({callback:promise_callback, persistent:persistent, value:value})
            }

            // If it's already at the desired state, call the callback immediately.
            if (value === current_value) {
                try {
                    promise_callback(value, current_value);
                } catch (err) {
                    //do nothing
                }
            }
            return promise.promise;
        }

        //------------------------------
        // Fire an event, which then calls callbacks for any listeners.
        //------------------------------
        trigger(event: string, ...args_: unknown[]) {
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
        }

        //------------------------------
        // Add a listener for an event.
        //------------------------------
        on(event:string, callback: Core.UnknownCallback) {
            if (this.event_listeners[event] === undefined) this.event_listeners[event] = [];
            this.event_listeners[event].push(callback);
        }

        //------------------------------
        // Load and install a specific file type into the DOM.
        //------------------------------
        async #load_and_append(url:string, tag_name:string, location:string, use_cache?:boolean) {
            url = url.replace(/"/g,'\'');
            if (document.querySelector(tag_name+'[uid="'+url+'"]') !== null) {
                return Promise.resolve(url);
            }
 
            let content:string
            try {
                content = await this.load_file(url, use_cache)
            } catch (error) {
                return Promise.reject(url)
            }

            const tag = document.createElement(tag_name);
            tag.innerHTML = content;
            tag.setAttribute('uid', url);
            const locationElem = document.querySelector(location)
            if (locationElem) {
                locationElem.appendChild(tag);
            }
            return Promise.resolve(url);
        }

        //------------------------------
        // Load and install Javascript.
        //------------------------------
        async load_script(url:string, use_cache?: boolean) {
            return this.#load_and_append(url, 'script', 'body', use_cache);
        }

        //------------------------------
        // Load and install a CSS file.
        //------------------------------
        async load_css(url:string, use_cache?:boolean) {
            return this.#load_and_append(url, 'style', 'head', use_cache);
        }

        //------------------------------
        // Include a list of modules.
        //------------------------------
        async include(module_list:string): Promise<{loaded:string[];failed:Core.FailedInclude[]}> {
            await this.ready('ksof')

            const include_deferred = new Deferred<{loaded:string[];failed:Core.FailedInclude[]}>();
            const module_names = split_list(module_list);
            const script_cnt = module_names.length;
            if (script_cnt === 0) {
                include_deferred.resolve({loaded:[], failed:[]});
                return include_deferred.promise;
            }

            let done_cnt = 0;
            const loaded: string[] = []
            const failed: Core.FailedInclude[] = [];
            const no_cache = split_list(localStorage.getItem('ksof.include.nocache') || '');
            for (let idx = 0; idx < module_names.length; idx++) {
                const module_name = module_names[idx];
                const module = supported_modules[module_name];
                if (!module) {
                    failed.push({name:module_name});
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

            return include_deferred.promise;

            function push_loaded(url:string) {
                loaded.push(url);
                check_done();
            }

            function push_failed(url:string) {
                failed.push({url: url});
                check_done();
            }

            function check_done() {
                if (++done_cnt < script_cnt) return;
                if (failed.length === 0) include_deferred.resolve({loaded:loaded, failed:failed});
                else include_deferred.reject({error:'Failure loading module', loaded:loaded, failed:failed});
            }
        }

        //------------------------------
        // Wait for all modules to report that they are ready
        //------------------------------
        ready(module_list:string): Promise<'ready' | 'ready'[]> {
            const module_names = split_list(module_list);
            
            const ready_promises: Promise<'ready'>[] = [];
            for (const idx in module_names) {
                const module_name = module_names[idx];
                ready_promises.push(this.wait_state('ksof.' + module_name, 'ready') as Promise<'ready'>);
            }
            
            if (ready_promises.length === 0) {
                return Promise.resolve('ready');
            } else if (ready_promises.length === 1) {
                return ready_promises[0];
            } else {
                return Promise.all(ready_promises);
            }
        }

        // Throws Error if observer with the given name or query already exists
        add_dom_observer(observer:Core.DomObserver) {
            for (const _observer of this.dom_observers) {
                if (_observer.name == observer.name) {
                    throw new Error(`Observer with the name ${observer.name} already exists`)
                }
                if (_observer.query == observer.query) {
                    throw new Error(`Observer with the query ${observer.query} already exists under the name ${observer.name}`)
                }
            }

            this.dom_observers.push(observer)
            this.check_dom_observer(observer)
        }

        check_dom_observer(observer:Core.DomObserver) {
            const visible = (document.querySelector(observer.query) != null)
            this.set_state(dom_observer_state(observer.name), visible ? 'exists' : 'gone')
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

    class FileCache implements Core.FileCache {
        dir: { [key: string]: {
                added: IsoDateString
                last_loaded: IsoDateString
            }
        }
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

            const clear_deferred = new Deferred<void | Event>();
            ksof.file_cache.dir = {};
            if (db === null) {
                return clear_deferred.resolve();
            }
            const transaction = db.transaction('files', 'readwrite');
            const store = transaction.objectStore('files');
            store.clear();
            transaction.oncomplete = clear_deferred.resolve;
            return clear_deferred.promise
        }

        //------------------------------
        // Delete a file from the file_cache database.
        //------------------------------
        async delete(pattern: string | RegExp) {
            const db = await file_cache_open()

            const del_deferred = new Deferred<string[]>();
            if (db === null) return del_deferred.resolve([]);
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
            transaction.oncomplete = del_deferred.resolve.bind(null, files);
            return del_deferred.promise;
        }

        //------------------------------
        // Save a the file_cache directory contents.
        //------------------------------
        dir_save(immediately = false) {
            const delay = (immediately ? 0 : 2000)

            if (this.sync_timer) {
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
            const load_deferred = new Deferred<string | { [key: string]: any }>()
            const transaction = db.transaction('files', 'readonly');
            const store = transaction.objectStore('files');
            const request = store.get(name);
            this.dir[name].last_loaded = new Date().toISOString() as IsoDateString;
            this.dir_save();
            request.onsuccess = finish;
            request.onerror = error;
            return load_deferred.promise;

            function finish(event: Event){
                if(!(event.target instanceof IDBRequest)) {
                    return
                }

                if (event.target.result === undefined) {
                    load_deferred.reject(name);
                } else {
                    load_deferred.resolve(event.target.result.content);
                }
            }

            function error(){
                load_deferred.reject(name);
            }
        }

        //------------------------------
        // Save a file into the file_cache database.
        //------------------------------
        async save(name:string, content:string | { [key: string]: any }, extra_attribs:object = {}) {
            const db = await file_cache_open()

            if (db === null) return Promise.resolve(name)

            const save_deferred = new Deferred<string>()
            const transaction = db.transaction('files', 'readwrite');
            const store = transaction.objectStore('files');
            store.put({name:name,content:content});
            const now = new Date().toISOString() as IsoDateString;
            ksof.file_cache.dir[name] = Object.assign({added:now, last_loaded:now}, extra_attribs);
            ksof.file_cache.dir_save(true /* immediately */);
            transaction.oncomplete = save_deferred.resolve.bind(null, name);
            return save_deferred.promise
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
        const open_deferred = new Deferred<IDBDatabase | null>();

        file_cache_open_promise = open_deferred.promise;
        const request = indexedDB.open('ksof.file_cache')
        request.onupgradeneeded = upgrade_db;
        request.onsuccess = get_dir;
        request.onerror = error;
        return open_deferred.promise;

        function error() {
            console.log('indexedDB could not open!');
            ksof.file_cache.dir = {};
            if (ignore_missing_indexeddb) {
                open_deferred.resolve(null);
            } else {
                open_deferred.reject();
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
            transaction.oncomplete = open_deferred.resolve.bind(null, db);
            open_deferred.promise.then(setTimeout.bind(null, file_cache_cleanup, 10000));
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

    //------------------------------
    // The current time, offset by the specified days
    //------------------------------
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

    //########################################################################
    //------------------------------
    // Body Changes Observation
    //------------------------------

    function on_body_mutated() {
        for(const element_query of ksof.dom_observers) {
            ksof.check_dom_observer(element_query)
        }
    }

    const body_observer = new MutationObserver(on_body_mutated)

    // Because KameSame loads its DOM data after the doc is already loaded, we need to make an additional check
    // to see if the DOM elements have been added to the body already before we can mark the doc as truly ready
    function start_dom_observing() {
        body_observer.observe(document.body, {childList: true, subtree: true})

        const current_page = ksof.pageInfo.on
        
        let element_query: string | undefined = undefined // if search query loaded -> assume everything else is also loaded
        if (current_page) {
            const queries = new Map([
                ['itemPage',       '#app.kamesame #item .facts .fact'],
                ['review',         '#app.kamesame #study .meaning'],
                ['reviewSummary',  '#app.kamesame #reviews #reviewsSummary .level-bars'],
                ['lessonsSummary', '#app.kamesame #summary .item-list li a.item'],
                ['lessons',        '#app.kamesame #lessons #lessonsFromLists.section'],
                ['search',         '#app.kamesame #search form .search-bar #searchQuery'],
                ['searchResult',   '#app.kamesame #search .fancy-item-list .actions'],
                ['home',           '#app.kamesame #home .section .stats'],
                ['account',        '#app.kamesame #account .fun-stuff'],
            ])
            
            element_query = queries.get(current_page)
        }

        if (element_query && current_page) {
            const observer = {name: `page.${current_page}`, query: element_query}
            ksof.add_dom_observer(observer)
            ksof.wait_state(dom_observer_state(observer.name), 'exists', () => { ksof.set_state('ksof.document', 'ready') })
        }
        else {
            setTimeout(() => { ksof.set_state('ksof.document', 'ready') }, 2000) // unknown page -> assume everything loaded after 2 seconds
        }

        // Add default Observers
        ksof.add_dom_observer({name: 'study_outcome', query: '#app.kamesame #study .outcome p a.item'})

        // TODO
        // HACK THAT SHOULD BE REMOVED ONCE ISSUE FIXED:
        // On some of the KameSame pages (like during reviews) body_observer never automatically
        // processes the mutations it records. I have no idea why. On the dicionary entry pages
        // this isn't a problem. So we also manually process these events instead once in a while
        const check_observer = () => {
            const mutations = body_observer.takeRecords()
            if (mutations.length > 0) {
                on_body_mutated()
            }
            setTimeout(check_observer, 100)
        }
        check_observer()
    }

    //########################################################################
    //------------------------------
    // Bootloader Startup
    //------------------------------
    function startup() {
        // Start doc ready check once doc is loaded
        if (document.readyState === 'complete') {
            start_dom_observing();
        } else {
            window.addEventListener('load', start_dom_observing, false);  // Notify listeners that we are ready.
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
