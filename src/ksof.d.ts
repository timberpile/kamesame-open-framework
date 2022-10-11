
type SrsName = 'lock' | 'init' | 'appr1' | 'appr2' | 'appr3' | 'appr4' | 'guru1' | 'guru2' | 'mast' | 'enli' | 'burn'
type SrsNumber = -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
type SubjectType = 'vocabulary' | 'kanji' | 'radical'
type SubjectTypeString =
    | `${SubjectType}`
    | `${SubjectType},${SubjectType}`
    | `${SubjectType},${SubjectType},${SubjectType}`
type SubjectTypeShort = 'voc' | 'kan' | 'rad'
type SubjectTypeShortString =
    | `${SubjectTypeShort}`
    | `${SubjectTypeShort},${SubjectTypeShort}`
    | `${SubjectTypeShort},${SubjectTypeShort},${SubjectTypeShort}`
type IsoDateString = `${number}-${number}-${number}T${number}:${number}:${number}.${number}Z`


export declare namespace Core {
    export interface FileCache {
        dir: {
            [key: string]: {
                added: IsoDateString
                last_loaded: IsoDateString
            }
        }
        sync_timer: number | undefined
        
        ls: () => void
        clear: () => Promise<void | Event>
        delete: (pattern: string | RegExp) => Promise<void | string[]>
        dir_save: (immediately:boolean) => void
        flush: () => void
        load: (name:string) => Promise<string | { [key: string]: any }> // TODO raw string really right type?
        save: (name:string, content: string | { [key: string]: any }, extra_attribs?:object) => Promise<string>
        file_nocache: (list:string | string[] | undefined) => void
    }

    export interface Version {
        value: string
        compare_to: (needed_version:string) => 'older' | 'same' | 'newer'
    }

    export type FailedInclude = {
        name?:string
        url?:string
    }

    export type StateCallback = (new_value:StateValue, prev_value:StateValue) => void

    export type StateListener = {
        callback?: StateCallback
        persistent: boolean
        value: StateValue
    }

    export type UnknownCallback = (...args: unknown[]) => void

    export interface ReviewInfo {
        answer_correct: 'exactly_correct' | 'alternative_match_completion' | 'alternative_match' | 'incorrect' | ''
        review_type: 'production' | 'recognition' | ''
    }

    export interface ItemInfo {
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

    export type StateValue = any

    export interface Module {
        version: Version
        file_cache: FileCache
        support_files: { [key: string]: string }
        state_listeners: {[key:string]: StateListener[]}
        state_values: {[key:string]: StateValue}
        event_listeners: {[key:string]: UnknownCallback[]}
        include_promises: {[key:string]: Promise<string>}
        dom_observers: Set<string>
        itemInfo: ItemInfo
        reviewInfo: ReviewInfo
    
        // Settings?: Settings
        // settings?: {[key:string]: SettingCollection}
    
        load_file: (url: string, use_cache?: boolean) => Promise<any>
        get_state: (state_var:string) => StateValue
        set_state: (state_var:string, value:StateValue) => void
        wait_state: (
            state_var: string,
            value: StateValue,
            callback?: StateCallback,
            persistent: boolean
        ) => Promise<string>
        trigger: (event: string, ...args_: unknown[]) => void
        on: (event:string, callback: UnknownCallback) => void
        load_script: (url:string, use_cache?: boolean) => Promise<string>
        load_css: (url:string, use_cache?:boolean) => Promise<string>
        include: (module_list:string) => Promise<{ loaded: string[]; failed: FailedInclude[] }>
        ready: (module_list:string) => Promise<'ready' | 'ready'[]>
        add_dom_observer: (element_query:string) => void
    }
}

export declare namespace Settings {

    declare namespace UI {
        export type ValidateCallback = (value:unknown, config: UserInput) => boolean | string | {valid: boolean, msg: string}
        export type OnChange = (name: string, value: unknown, config: UserInput) => void

        export interface UserInput {
            type: string
            label?: string       // A string label that appears to the left of (or above) the list element.
            hover_tip?: string   // (optional) A string that will appear as a tool-tip when you hover over the tab label.
            full_width?: boolean // (optional) A boolean that, if true, causes the component to occupy a full line.
            validate?: ValidateCallback // (optional) A callback for validating the value of the setting (see Validating Inputs).
            on_change?: OnChange // (optional) A callback that will be called when the setting changes.
            path?: string        // (optional) A string overriding the path where the setting will be saved (see Overriding Paths).
            refresh_on_change?: boolean
        }
    
        export type Collection = {[key:string]: Component}
    
        export interface Tabset {
            type: 'tabset'
            content: {[key:string]: Page}
                // A collection of "page" objects.  For example:
                // page1: {...},
                // page2: {...}
                // ...
        }
    
        export interface Page {
            type: 'page'
            label: string      // A string label that will appear in the tab.
            hover_tip?: string // (optional) A string that will appear as a tool-tip when you hover over the tab label.
            content: Collection
                // A collection of settings components that will appear in the open tab.  For example:
                // dropdown1: {...},
                // text1: {...},
                // text2: {...},
                // ...
        }
    
        export interface Section {
            type: 'section'
            label?: string // A string that will appear in the section.
        }
    
        export interface Divider {
            type: 'divider'
        }
    
        export interface Group {
            type: 'group'
            label?: string // A string label that will appear at the top-left of the group.
            content: Collection
                // A collection of settings components that will appear inside the group border.  For example:
                // dropdown1: {...},
                // text1: {...},
                // text2: {...},
                // ...
        }
    
        type ListMultiCheck = ({
            multi?: false    // (optional) A boolean that, if true, allows selection of multiple list items.
            default?: string // (optional) A string containing the key of the list item that will be selected by default.
        } | {
            multi?: true
            default: { [key: string]: boolean } // (optional) A string array containing the keys of the list items that will be selected by default.
        })
    
        export type List = {
            type: 'list'
            size?: number        // (optional) An integer size indicating the height of the list in lines (default = 4).
            content: {[key:string]: string}
                // A set of key/text pairs representing the available selections.  For example:
                // key1: 'Value 1',
                // key2: 'Value 2',
                // [...]
        } & ListMultiCheck & UserInput
    
        export interface Dropdown extends UserInput {
            type: 'dropdown'
            default?: string // (optional) A string containing the key of the dropdown item that will be selected by default.
            content: {[key:string]: string}
                // A set of key/text pairs representing the available selections.  For example:
                // key1: 'Value 1',
                // key2: 'Value 2',
                // [...]
        }
    
        export interface Checkbox extends UserInput {
            type: 'checkbox'
            default?: boolean    // (optional) A boolean indicating whether the box should be ticked by default.
        }
    
        export interface Input extends UserInput {
            type: 'input'
            subtype?: string     // (optional) A string containing the HTML type to assign to the <input> tag.  The default is 'text'.
            placeholder?: string // (optional) A string that will appear as a placeholder when the input is empty, e.g. "Full Name".
            default?: string     // (optional) A string containing the default value to appear in the input.
        }
        
        export interface NumberInput extends UserInput {
            type: 'number'
            placeholder?: string // (optional) A string that will appear as a placeholder when the field is empty, e.g. "Age".
            default?: number     // (optional) A default number to appear in the field if no prior setting is present.
            min?: number         // (optional) The minimum value accepted in the input.  Adds automatic validation.
            max?: number         // (optional) The maximum value accepted in the input.  Adds automatic validation.
        }
        
        export interface TextInput extends UserInput {
            type: 'text'
            placeholder?: string // (optional) A string that will appear as a placeholder when the field is empty, e.g. "Full Name".
            default?: string     // (optional) A string containing the default value to appear in the input.
            match?: RegExp       // (optional) A regex object for validating the text.  Adds automatic validation.
        }
        
        export interface ColorSelector extends UserInput {
            type: 'color'
            default?: string     // (optional) A string containing the default color.
        }
    
        export interface Button extends UserInput {
            type: 'button'
            text?: string        // (optional) A string label that appears inside the button.  The default is "Click".
            on_click: (name:string, config:Button, on_change: () => void) => void // A callback function that will be called when the button is clicked.
        }
    
        export interface Html {
            type: 'html'
            label?: string     // (optional) A string label that appears to the left of (or above) the inline html.
            html: string       // An html string to be inserted inline.
            hover_tip?: string // (optional) A string that will appear as a tool-tip when you hover over the button.
            wrapper?: 'row'|'left'|'right'
        }
    
        export type Component =
        | Tabset
        | Page
        | Section
        | Divider
        | Group
        | List
        | Dropdown
        | Checkbox
        | Input
        | NumberInput
        | TextInput
        | ColorSelector
        | Button
        | Html
    }
    
    export type Config = {
        script_id: string
        title: string
        autosave?: boolean
        background?: boolean
    
        pre_open?: (dialog: JQuery) => void
        on_save?: (settings: SettingCollection) => void
        on_cancel?: (settings: SettingCollection) => void
        on_close?: (settings: SettingCollection) => void
        on_change?: UI.OnChange
        on_refresh?: (settings: SettingCollection) => void
    
        content: UI.Collection
    }
    
    export type Setting = any
    
    export type SettingCollection = {[key: string]: Setting}
    
    export interface Dialog {
        cfg: Config
        config_list: UI.Collection
        keep_settings?: boolean
        reversions?: UI.Collection
        #open_dialog: JQuery<HTMLDivElement>
        background: {
            open: () => void
            close: () => void
        }
    
        open: () => void
        save: () => Promise<string>
        load: (defaults?: SettingCollection) => Promise<SettingCollection>
        refresh: () => void
        close: (keep_settings: boolean) => void
        cancel: () => void
    }
    
    // workaround to get similar functionality as in the original JS implementation,
    // where ksof.Settings was set to a function with additional parameters
    export type Settings = {
        (config: Config): Dialog
        save: (context: Dialog | string) => Promise<string>
        load: (context: Dialog | string, defaults?: SettingCollection) => Promise<SettingCollection>
        background: {
            open: () => void
            close: () => void
        }
    }
    
    export interface Module {
        Settings: Settings
        settings: { [key: string]: SettingCollection }
    }
}

export declare namespace Menu {

    export interface Config {
        name: string
        submenu?: string
        title: string
        class?: string
        class_html?: string // TODO what is this?
        on_click: (event: any) => void
    }

    export interface Menu {
        top_menu?: HTMLDivElement
        scripts_menu?: HTMLElement
    }

    export interface Module {
        Menu: {
            insert_script_link: (config: Config) => void
            ui: Menu
        }
    }
}

export declare namespace JQuery {
    export interface Module {
        Jquery: {version: string}
    }
}
