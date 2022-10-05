
export interface ISetting {
    type: string
}

export type Setting = ISetting | {[key:string]: ISetting}

export interface ISettingTabset extends ISetting {
    type: 'tabset'
    content: {[key:string]: ISettingPage}
        // A collection of "page" objects.  For example:
        // page1: {...},
        // page2: {...}
        // ...
}

export interface ISettingPage extends ISetting {
    type: 'page'
    label: string      // A string label that will appear in the tab.
    hover_tip?: string // (optional) A string that will appear as a tool-tip when you hover over the tab label.
    content: {[key:string]: ISetting}
        // A collection of settings components that will appear in the open tab.  For example:
        // dropdown1: {...},
        // text1: {...},
        // text2: {...},
        // ...
}

export interface ISettingSection extends ISetting {
    type: 'section'
    label: string // A string that will appear in the section.
}

export interface ISettingDivider extends ISetting {
    type: 'divider'
}

export interface ISettingGroup extends ISetting {
    type: 'group'
    label: string // A string label that will appear at the top-left of the group.
    content: {[key:string]: ISetting}
        // A collection of settings components that will appear inside the group border.  For example:
        // dropdown1: {...},
        // text1: {...},
        // text2: {...},
        // ...
}

export type InputValidatorCallback = (value:unknown, config: ISetting) => boolean | string | {valid: boolean, msg: string}

export interface ISettingList extends ISetting {
    type: 'list'
    label: string               // A string label that appears to the left of (or above) the list element.
    multi?: boolean             // (optional) A boolean that, if true, allows selection of multiple list items.
    size?: number               // (optional) An integer size indicating the height of the list in lines (default = 4).
    hover_tip?: string          // (optional) A string that will appear as a tool-tip when you hover over the list.
    default?: string            // (optional) A string containing the key of the list item that will be selected by default.
    full_width?: boolean        // (optional) A boolean that, if true, causes the component to occupy a full line.
    validate?: InputValidatorCallback // (optional) A callback for validating the value of the setting (see Validating Inputs).
    on_change?: () => void // (optional) A callback that will be called when the setting changes.
    path?: string               // (optional) A string overriding the path where the setting will be saved (see Overriding Paths).
    content: {[key:string]: string}
        // A set of key/text pairs representing the available selections.  For example:
        // key1: 'Value 1',
        // key2: 'Value 2',
        // [...]
}

export interface ISettingDropdown extends ISetting {
    type: 'dropdown'
    label: string          // A string label that appears to the left of (or above) the dropdown element.
    hover_tip?: string     // (optional) A string that will appear as a tool-tip when you hover over the dropdown.
    default?: string       // (optional) A string containing the key of the dropdown item that will be selected by default.
    full_width?: boolean   // (optional) A boolean that, if true, causes the component to occupy a full line.
    validate?: InputValidatorCallback // (optional) A callback for validating the value of the setting (see Validating Inputs).
    on_change?: () => void // (optional) A callback that will be called when the setting changes.
    path?: string          // (optional) A string overriding the path where the setting will be saved (see Overriding Paths).
    content: {[key:string]: string}
        // A set of key/text pairs representing the available selections.  For example:
        // key1: 'Value 1',
        // key2: 'Value 2',
        // [...]
}

export interface ISettingCheckbox extends ISetting {
    type: 'checkbox'
    label: string          // A string label that appears to the left of (or above) the checkbox element.
    hover_tip?: string     // (optional) A string that will appear as a tool-tip when you hover over the checkbox.
    default?: boolean      // (optional) A boolean indicating whether the box should be ticked by default.
    full_width?: boolean   // (optional) A boolean that, if true, causes the component to occupy a full line.
    validate?: InputValidatorCallback // (optional) A callback for validating the value of the setting (see Validating Inputs).
    on_change?: () => void // (optional) A callback that will be called when the setting changes.
    path?: string          // (optional) A string overriding the path where the setting will be saved (see Overriding Paths).
}

export interface ISettingInput extends ISetting {
    type: 'input'
    subtype?: string       // (optional) A string containing the HTML type to assign to the <input> tag.  The default is 'text'.
    label: string         // A string label that appears to the left of (or above) the input element.
    hover_tip?: string     // (optional) A string that will appear as a tool-tip when you hover over the input.
    placeholder?: string   // (optional) A string that will appear as a placeholder when the input is empty, e.g. "Full Name".
    default?: string       // (optional) A string containing the default value to appear in the input.
    full_width?: boolean    // (optional) A boolean that, if true, causes the component to occupy a full line.
    validate?: InputValidatorCallback // (optional) A callback for validating the value of the setting (see Validating Inputs).
    on_change?: () => void // (optional) A callback that will be called when the setting changes.
    path?: string          // (optional) A string overriding the path where the setting will be saved (see Overriding Paths).
}

export interface ISettingNumber extends ISetting {
    type: 'number'
    label: string          // A string label that appears to the left of (or above) the number element.
    hover_tip?: string     // (optional) A string that will appear as a tool-tip when you hover over the number field.
    placeholder?: string   // (optional) A string that will appear as a placeholder when the field is empty, e.g. "Age".
    default?: number       // (optional) A default number to appear in the field if no prior setting is present.
    min?: number           // (optional) The minimum value accepted in the input.  Adds automatic validation.
    max?: number           // (optional) The maximum value accepted in the input.  Adds automatic validation.
    full_width?: boolean   // (optional) A boolean that, if true, causes the component to occupy a full line.
    validate?: InputValidatorCallback // (optional) A callback for validating the value of the setting (see Validating Inputs).
    on_change?: () => void // (optional) A callback that will be called when the setting changes.
    path?: string          // (optional) A string overriding the path where the setting will be saved (see Overriding Paths).
}


export interface ISettingText extends ISetting {
    type: 'text'
    label: string          // A string label that appears to the left of (or above) the text element.
    hover_tip?: string     // (optional) A string that will appear as a tool-tip when you hover over the text field.
    placeholder?: string   // (optional) A string that will appear as a placeholder when the field is empty, e.g. "Full Name".
    default?: string       // (optional) A string containing the default value to appear in the input.
    match?: RegExp         // (optional) A regex object for validating the text.  Adds automatic validation.
    full_width?: boolean   // (optional) A boolean that, if true, causes the component to occupy a full line.
    validate?: InputValidatorCallback // (optional) A callback for validating the value of the setting (see Validating Inputs).
    on_change?: () => void // (optional) A callback that will be called when the setting changes.
    path?: string          // (optional) A string overriding the path where the setting will be saved (see Overriding Paths).
}

export interface ISettingColor extends ISetting {
    type: 'color'
    label: string         // A string label that appears to the left of (or above) the color element.
    hover_tip?: string     // (optional) A string that will appear as a tool-tip when you hover over the color element.
    default?: string       // (optional) A string containing the default color.
    full_width?: boolean    // (optional) A boolean that, if true, causes the component to occupy a full line.
    validate?: InputValidatorCallback      // (optional) A callback for validating the value of the setting (see Validating Inputs).
    on_change?: () => void     // (optional) A callback that will be called when the setting changes.
    path?: string          // (optional) A string overriding the path where the setting will be saved (see Overriding Paths).
}


export interface ISettingButton extends ISetting {
    type: 'button'
    label: string          // A string label that appears to the left of (or above) the button.
    text?: string          // (optional) A string label that appears inside the button.  The default is "Click".
    hover_tip?: string     // (optional) A string that will appear as a tool-tip when you hover over the button.
    full_width?: boolean   // (optional) A boolean that, if true, causes the component to occupy a full line.
    validate?: InputValidatorCallback // (optional) A callback for validating the value of the setting (see Validating Inputs).
    on_change?: () => void // (optional) A callback that will be called when the setting changes.
    path?: string          // (optional) A string overriding the path where the setting will be saved (see Overriding Paths).
    on_click: (name:string, config:ISettingButton, on_change: () => void) => void   // A callback function that will be called when the button is clicked.
}

export interface ISettingHTML extends ISetting {
    type: 'html'
    label?: string // (optional) A string label that appears to the left of (or above) the inline html.
    html: string   // An html string to be inserted inline.
    hover_tip?: string // (optional) A string that will appear as a tool-tip when you hover over the button.
    wrapper?: 'row'|'left'|'right'
}

export type AnySetting =
    ISettingButton
    | ISettingCheckbox
    | ISettingColor
    | ISettingDivider
    | ISettingDropdown
    | ISettingGroup
    | ISettingHTML
    | ISettingInput
    | ISettingList
    | ISettingNumber
    | ISettingPage
    | ISettingSection
    | ISettingTabset
    | ISettingText

export type Config = {
    script_id: string
    title: string
    autosave?: boolean
    background?: boolean

    pre_open?: (dialog:unknown) => void
    on_save?: (settings: Setting) => void
    on_cancel?: (settings: Setting) => void
    on_close?: (settings: Setting) => void
    on_change?: (name:string, value:unknown, config: ISetting) => void
    on_refresh?: (settings: Setting) => void

    content: {[key:string]: ISetting}
}

export type Context = {
    self: unknown
    cfg: Config
    config_list: {[key:string]: ISetting}
    keep_settings?: boolean
    reversions?: {[key:string]: ISetting}
}

export interface ISettings {
    context?: Context
    dialog:JQuery<HTMLDivElement>
    background: {
        open: () => void
        close: () => void
    }
}

export type SettingsCtor = (config: Config) => ISettings
