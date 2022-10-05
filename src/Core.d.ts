import { Setting, SettingsCtor } from './Settings.d'

export type CallbackFunction = (value:string, current_value:string) => void

export type StateListener = {
    callback: CallbackFunction | null
    persistent:boolean
    value:string
}

export type UnknownCallback = (...args: unknown[]) => void

export interface IReviewInfo {
    answer_correct: string | null
    review_type: string | null
}

export interface IItemInfo {
    characters: string | null
    meanings: string[] | null
    readings: string[] | null
    variations: string[] | null
    parts_of_speech: string[] | null
    wanikani_level: number | null
    tags: string[] | null
    on: string | null
    type: string | null
    summary: {[key: string]: string | string[] | number | null}
}

export interface IVersion {
    value: string

    compare_to: (client_version:string) => string
}

export type FileCacheEntry = {
    added: string
    last_loaded: string
}

export interface IFileCache {
    dir: { [key: string]: FileCacheEntry }
    sync_timer: number | undefined

    ls: () => void
    clear: () => Promise<void | Event>
    delete: (pattern: string | RegExp) => Promise<void | string[]>
    dir_save: (immediately:boolean) => void
    flush: () => void
    load: (name:string) => Promise<any>
    save: (name:string, content:object, extra_attribs?:object) => Promise<string>
    file_nocache: (list:string | string[] | undefined) => void
}

export interface IKSOF {
    file_cache: IFileCache
    support_files: { [key: string]: string }
    version: IVersion
    state_listeners: {[key:string]: StateListener[]}
    state_values: {[key:string]: string}
    event_listeners: {[key:string]: UnknownCallback[]}
    include_promises: {[key:string]: Promise<string>}
    dom_observers: Set<string>
    itemInfo: IItemInfo

    Settings?: SettingsCtor
    settings?: {[key:string]: {[key:string]: ISetting}}

    load_file: (url: string, use_cache: boolean) => Promise<any>
    get_state: (state_var:string) => string
    set_state: (state_var:string, value:string) => void
    wait_state: (state_var:string, value:string, callback: CallbackFunction | null, persistent: boolean) => Promise<unknown> | undefined
    trigger_event: (event: string, ...args_: unknown[]) => IKSOF
    wait_event: (event:string, callback: UnknownCallback) => IKSOF
    load_and_append: (url:string, tag_name:string, location:string, use_cache:boolean) => Promise<string>
    load_script: (url:string, use_cache: boolean) => Promise<string>
    load_css: (url:string, use_cache:boolean) => Promise<string>
    include: (module_list:string) => Promise<object>
    ready: (module_list:string) => Promise<unknown> | void
    add_dom_observer: (element_query:string) => void
}

export declare global {
    interface Window { ksof: IKSOF; }
}
