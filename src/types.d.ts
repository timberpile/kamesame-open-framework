export type CallbackFunction = (value:string, current_value:string) => void

export type StateListener = {
    callback: CallbackFunction | null
    persistent:boolean
    value:string
}

export type unknownCallback = (...args: unknown[]) => void

export type ItemInfoStateI = {
    characters: string
    meanings: string[]
    readings: string[]
    variations: string[]
    parts_of_speech: string[]
    wanikani_level: number | null
    tags: string[]
    on: string
    type: string
}

export type ItemInfoI = {
    currentState: () => ItemInfoStateI
    on: () => string
}

export type KSOFI = {
    file_cache: FileCache
    support_files: { [key: string]: string }
    version: Version
    state_listeners: {[key:string]: StateListener[]}
    state_values: {[key:string]: string}
    event_listeners: {[key:string]: unknownCallback[]}
    include_promises: {[key:string]: Promise<string>}
    element_watchers: Set<string>
    itemInfo: ItemInfoI

    load_file: (url: string, use_cache: boolean) => Promise<any>
    get_state: (state_var:string) => string
    set_state: (state_var:string, value:string) => void
    wait_state: (state_var:string, value:string, callback: CallbackFunction | null, persistent: boolean) => Promise<unknown> | undefined
    trigger_event: (event: string, ...args_: unknown[]) => KSOFI
    wait_event: (event:string, callback: unknownCallback) => KSOFI
    load_and_append: (url:string, tag_name:string, location:string, use_cache:boolean) => Promise<string>
    load_script: (url:string, use_cache: boolean) => Promise<string>
    load_css: (url:string, use_cache:boolean) => Promise<string>
    include: (module_list:string) => Promise<object>
    ready: (module_list:string) => Promise<unknown> | void
    add_element_watch: (element_query:string) => void
}

export declare global {
    interface Window { ksof: KSOFI; }
}

// window.ksof = window.ksof || {};