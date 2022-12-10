
export declare namespace Settings {

    declare namespace UI {
        export type ValidateCallback = (value:unknown, config: UserInput) => boolean | string | {valid: boolean, msg: string}
        export type OnChange = (name: string, value: unknown, config: UserInput) => void

        export interface UserInput {
            type: string
            label?: string       // A string label that appears to the left of (or above) the list element.
            hoverTip?: string   // (optional) A string that will appear as a tool-tip when you hover over the tab label.
            fullWidth?: boolean // (optional) A boolean that, if true, causes the component to occupy a full line.
            validate?: ValidateCallback // (optional) A callback for validating the value of the setting (see Validating Inputs).
            onChange?: OnChange // (optional) A callback that will be called when the setting changes.
            path?: string        // (optional) A string overriding the path where the setting will be saved (see Overriding Paths).
            refreshOnChange?: boolean
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
            hoverTip?: string // (optional) A string that will appear as a tool-tip when you hover over the tab label.
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
            onClick: (name:string, config:Button, onChange: () => void) => void // A callback function that will be called when the button is clicked.
        }

        export interface Html {
            type: 'html'
            label?: string     // (optional) A string label that appears to the left of (or above) the inline html.
            html: string       // An html string to be inserted inline.
            hoverTip?: string  // (optional) A string that will appear as a tool-tip when you hover over the button.
            wrapper?: 'row' | 'left' | 'right'
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
        scriptId: string
        title: string
        autosave?: boolean
        background?: boolean

        preOpen?: (dialog: JQuery) => void
        onSave?: (settings: SettingCollection) => void
        onCancel?: (settings: SettingCollection) => void
        onClose?: (settings: SettingCollection) => void
        onChange?: UI.OnChange
        onRefresh?: (settings: SettingCollection) => void

        content: UI.Collection
    }

    export type Setting = any

    export type SettingCollection = {[key: string]: Setting}

    export interface Dialog {
        cfg: Config
        configList: UI.Collection
        keepSettings?: boolean
        reversions?: UI.Collection
        #openDialog: JQuery<HTMLDivElement>
        background: {
            open: () => void
            close: () => void
        }

        open: () => void
        save: () => Promise<string>
        load: (defaults?: SettingCollection) => Promise<SettingCollection>
        refresh: () => void
        close: (keepSettings: boolean) => void
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
