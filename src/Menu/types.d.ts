
export declare namespace Menu {

    export interface Config {
        name: string
        submenu?: string
        title: string
        class?: string
        classHTML?: string // TODO what is this?
        onClick: (event: any) => void
    }

    export interface Ui {
        style: HTMLStyleElement
        menu: HTMLDivElement
        scriptsIcon: HTMLLinkElement
        dropdownMenu: HTMLUListElement
        header: HTMLLIElement
        submenus: Map<string, HTMLLIElement>
        configs: Menu.Config[]
    }

    export interface Module {
        Menu: {
            insertScriptLink: (config: Config) => void
            ui: Ui
        }
    }
}
