
namespace DialogUi {
    export interface Base {
        type: string
    }

    export type InputValidatorCallback = (value:unknown, config: Base) => boolean | string | {valid: boolean, msg: string}

    export interface UserInput extends Base {
        validate?: InputValidatorCallback // (optional) A callback for validating the value of the setting (see Validating Inputs).
        on_change?: (name: string, value: unknown, config: Base) => void // (optional) A callback that will be called when the setting changes.
        refresh_on_change?: boolean
    }

    export type Collection = {[key:string]: Base}

    export interface Tabset extends Base {
        type: 'tabset'
        content: {[key:string]: Page}
            // A collection of "page" objects.  For example:
            // page1: {...},
            // page2: {...}
            // ...
    }

    export interface Page extends Base {
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

    export interface Section extends Base {
        type: 'section'
        label: string // A string that will appear in the section.
    }

    export interface Divider extends Base {
        type: 'divider'
    }

    export interface Group extends Base {
        type: 'group'
        label: string // A string label that will appear at the top-left of the group.
        content: Collection
            // A collection of settings components that will appear inside the group border.  For example:
            // dropdown1: {...},
            // text1: {...},
            // text2: {...},
            // ...
    }

    export interface List extends UserInput {
        type: 'list'
        label: string        // A string label that appears to the left of (or above) the list element.
        multi?: boolean      // (optional) A boolean that, if true, allows selection of multiple list items.
        size?: number        // (optional) An integer size indicating the height of the list in lines (default = 4).
        hover_tip?: string   // (optional) A string that will appear as a tool-tip when you hover over the list.
        default?: string     // (optional) A string containing the key of the list item that will be selected by default.
        full_width?: boolean // (optional) A boolean that, if true, causes the component to occupy a full line.
        path?: string        // (optional) A string overriding the path where the setting will be saved (see Overriding Paths).
        content: {[key:string]: string}
            // A set of key/text pairs representing the available selections.  For example:
            // key1: 'Value 1',
            // key2: 'Value 2',
            // [...]
    }

    export interface Dropdown extends UserInput {
        type: 'dropdown'
        label: string        // A string label that appears to the left of (or above) the dropdown element.
        hover_tip?: string   // (optional) A string that will appear as a tool-tip when you hover over the dropdown.
        default?: string     // (optional) A string containing the key of the dropdown item that will be selected by default.
        full_width?: boolean // (optional) A boolean that, if true, causes the component to occupy a full line.
        path?: string        // (optional) A string overriding the path where the setting will be saved (see Overriding Paths).
        content: {[key:string]: string}
            // A set of key/text pairs representing the available selections.  For example:
            // key1: 'Value 1',
            // key2: 'Value 2',
            // [...]
    }

    export interface Checkbox extends UserInput {
        type: 'checkbox'
        label: string        // A string label that appears to the left of (or above) the checkbox element.
        hover_tip?: string   // (optional) A string that will appear as a tool-tip when you hover over the checkbox.
        default?: boolean    // (optional) A boolean indicating whether the box should be ticked by default.
        full_width?: boolean // (optional) A boolean that, if true, causes the component to occupy a full line.
        path?: string        // (optional) A string overriding the path where the setting will be saved (see Overriding Paths).
    }

    export interface Input extends UserInput {
        type: 'input'
        subtype?: string     // (optional) A string containing the HTML type to assign to the <input> tag.  The default is 'text'.
        label: string        // A string label that appears to the left of (or above) the input element.
        hover_tip?: string   // (optional) A string that will appear as a tool-tip when you hover over the input.
        placeholder?: string // (optional) A string that will appear as a placeholder when the input is empty, e.g. "Full Name".
        default?: string     // (optional) A string containing the default value to appear in the input.
        full_width?: boolean // (optional) A boolean that, if true, causes the component to occupy a full line.
        path?: string        // (optional) A string overriding the path where the setting will be saved (see Overriding Paths).
    }
    
    export interface NumberInput extends UserInput {
        type: 'number'
        label: string        // A string label that appears to the left of (or above) the number element.
        hover_tip?: string   // (optional) A string that will appear as a tool-tip when you hover over the number field.
        placeholder?: string // (optional) A string that will appear as a placeholder when the field is empty, e.g. "Age".
        default?: number     // (optional) A default number to appear in the field if no prior setting is present.
        min?: number         // (optional) The minimum value accepted in the input.  Adds automatic validation.
        max?: number         // (optional) The maximum value accepted in the input.  Adds automatic validation.
        full_width?: boolean // (optional) A boolean that, if true, causes the component to occupy a full line.
        path?: string        // (optional) A string overriding the path where the setting will be saved (see Overriding Paths).
    }
    
    export interface TextInput extends UserInput {
        type: 'text'
        label: string        // A string label that appears to the left of (or above) the text element.
        hover_tip?: string   // (optional) A string that will appear as a tool-tip when you hover over the text field.
        placeholder?: string // (optional) A string that will appear as a placeholder when the field is empty, e.g. "Full Name".
        default?: string     // (optional) A string containing the default value to appear in the input.
        match?: RegExp       // (optional) A regex object for validating the text.  Adds automatic validation.
        full_width?: boolean // (optional) A boolean that, if true, causes the component to occupy a full line.
        path?: string        // (optional) A string overriding the path where the setting will be saved (see Overriding Paths).
    }
    
    export interface ColorSelector extends UserInput {
        type: 'color'
        label: string        // A string label that appears to the left of (or above) the color element.
        hover_tip?: string   // (optional) A string that will appear as a tool-tip when you hover over the color element.
        default?: string     // (optional) A string containing the default color.
        full_width?: boolean // (optional) A boolean that, if true, causes the component to occupy a full line.
        path?: string        // (optional) A string overriding the path where the setting will be saved (see Overriding Paths).
    }

    export interface Button extends UserInput {
        type: 'button'
        label: string        // A string label that appears to the left of (or above) the button.
        text?: string        // (optional) A string label that appears inside the button.  The default is "Click".
        hover_tip?: string   // (optional) A string that will appear as a tool-tip when you hover over the button.
        full_width?: boolean // (optional) A boolean that, if true, causes the component to occupy a full line.
        path?: string        // (optional) A string overriding the path where the setting will be saved (see Overriding Paths).
        on_click: (name:string, config:Button, on_change: () => void) => void // A callback function that will be called when the button is clicked.
    }

    export interface HTML extends Base {
        type: 'html'
        label?: string     // (optional) A string label that appears to the left of (or above) the inline html.
        html: string       // An html string to be inserted inline.
        hover_tip?: string // (optional) A string that will appear as a tool-tip when you hover over the button.
        wrapper?: 'row'|'left'|'right'
    }
}

export type SettingsConfig = {
    script_id: string
    title: string
    autosave?: boolean
    background?: boolean

    pre_open?: (dialog:unknown) => void
    on_save?: (settings: SettingCollection) => void
    on_cancel?: (settings: SettingCollection) => void
    on_close?: (settings: SettingCollection) => void
    on_change?: (name:string, value:unknown, config: DialogUi) => void
    on_refresh?: (settings: SettingCollection) => void

    content: DialogUi.Collection
}

export type Setting = number | string | object

export type SettingCollection = {[key: string]: Setting}

export interface IKSOFSettings {
    cfg: SettingsConfig
    config_list: DialogUi.Collection
    keep_settings?: boolean
    reversions?: DialogUi.Collection
    open_dialog: JQuery<HTMLDivElement>
    background: {
        open: () => void
        close: () => void
    }

    save(): Promise<string>
    load(defaults?: SettingCollection): Promise<SettingCollection>
}

// workaround to get similar functionality as in the original JS implementation,
// where ksof.Settings was set to a function with additional parameters
export type KSOFSettingsObj = {
    (config: SettingsConfig): IKSOFSettings
    save(context: IKSOFSettings | string): Promise<string>
    load(context: IKSOFSettings | string, defaults?: SettingCollection): Promise<SettingCollection>
    background: {
        open: () => void
        close: () => void
    }
}
