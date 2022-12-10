import { Core } from '../Core/types'
import { Menu } from './types'

const ksof = () => {
    return window.ksof as Core.Module & Menu.Module
}

export class MenuUi implements Menu.Ui {
    menu: HTMLDivElement
    style: HTMLStyleElement
    submenus: Map<string, HTMLLIElement>
    configs: Menu.Config[]

    constructor() {
        this.style = undefined as unknown as HTMLStyleElement
        this.menu = undefined as unknown as HTMLDivElement
        this.submenus = new Map()
        this.configs = []

        const reinstallMenu = () => {
            if (this.style) {
                this.style.remove()
            }
            this.style = this.#installStyle()

            if (this.menu) {
                this.menu.remove()
            }
            try {
                this.menu = this.#installMenu()
                this.menu.setAttribute('display', 'none')
            } catch (error) {
                throw new Error(`Can't install ksof menu: ${error}`)
            }
        }

        const observer = { name: 'menu', query: '#scripts-menu' }
        ksof().domObserver.add(observer)
        ksof().waitState(ksof().domObserver.stateName(observer), 'absent', () => {
            reinstallMenu()
            const oldConfigs = this.configs
            this.configs = []
            for (const config of oldConfigs) {
                this.insertScriptLink(config)
            }
        }, true)
    }

    get header () {
        return this.dropdownMenu?.querySelector(':scope > li.scripts-header') as HTMLLIElement
    }

    get scriptsIcon() {
        if (ksof().pageInfo.on == 'review') {
            return this.menu.querySelector(':scope > a.scripts-icon') as HTMLLinkElement
        }
        else {
            // TODO use fitting selector for top menu bar
            return this.menu.querySelector(':scope > a.scripts-icon') as HTMLLinkElement
        }
    }

    get dropdownMenu() {
        return this.menu.querySelector('ul.dropdown-menu') as HTMLUListElement
    }

    #installStyle() {
        const style = document.head.querySelector('style[name="scripts_submenu"]')
        if (style) {
            return style as HTMLStyleElement
        }
        document.head.insertAdjacentHTML('beforeend',
            `<style name="scripts_submenu">
                #scripts-menu {text-shadow:none}
                #scripts-menu.scripts-menu-icon {display:inline-block}
                #scripts-menu .scripts-icon {display:inline-block cursor: pointer font-size: 1.2em margin-right: auto opacity: .65 position: relative top: 3px}
                #scripts-menu:not(.open) > .dropdown-menu {display:none}
                #scripts-menu .scripts-submenu:not(.open) > .dropdown-menu {display:none}
                #scripts-menu ul.dropdown-menu {position:absolute background-color:#eee margin:0 padding:5px 0 list-style-type:none border:1px solid #333 display:block}
                #scripts-menu ul.dropdown-menu > li {text-align:left color:#333 white-space:nowrap line-height:20px padding:3px 0 display:list-item}
                #scripts-menu ul.dropdown-menu > li.scripts-header {text-transform:uppercase font-size:.8rem font-weight:bold padding:3px 12px display:list-item}
                #scripts-menu ul.dropdown-menu > li:hover:not(.scripts-header) {background-color:rgba(0,0,0,0.15)}
                #scripts-menu ul.dropdown-menu a {padding:3px 20px color:#333 opacity:1}
                #scripts-menu .scripts-submenu {position:relative font-size: 1rem}
                #scripts-menu .scripts-submenu > a:after {content:">" font-family:"FontAwesome" position:absolute top:0 right:0 padding:3px 4px 3px 0}
                #scripts-menu .scripts-submenu .dropdown-menu {left:100% top:-6px}
                #app.kamesame nav li #scripts-menu {
                    display: flex
                    flex-direction: column
                    height: 100%
                    width: 100%
                    color: var(--gray)
                }
            </style>`,
        )
        return document.head.querySelector('style[name="scripts_submenu"]') as HTMLStyleElement
    }

    //------------------------------
    // Install 'Scripts' header in menu, if not present.
    //------------------------------
    #installMenu() {
        // Throws Error

        let menu = document.querySelector('#scripts-menu') as HTMLDivElement | null
        if (menu) {
            return menu
        }

        const page = ksof().pageInfo.on

        // Abort if on unsupported page
        // if (!page) throw new Error('Unsupported page')


        // Install html.
        if (page == 'review') {
            const exitButton = document.querySelector('.header a.exit')
            if (!exitButton) throw new Error('Exit button not found')

            exitButton.insertAdjacentHTML('afterend', `
            <div id="scripts-menu" class="scripts-menu-icon">
                <a class="scripts-icon state" href="#"><i title="Script Menu">⚙️</i></a>
                <ul class="dropdown-menu">
                    <li class="scripts-header">Script Menu</li>
                </ul>
            </div>`)
        }
        else {
            const searchIcon = findSearchIcon()
            if (!searchIcon) throw new Error('Search icon not found')

            searchIcon.parentElement?.insertAdjacentHTML('afterend', `
            <li>
                <div id="scripts-menu" class="scripts-menu-icon">
                    <a class="scripts-icon" href="#">
                        <div class="icon">
                            <div>⚙</div>
                        </div>
                        <div class="label">
                            <span>Scripts Menu</span>
                        </div>
                    </a>
                    <ul class="dropdown-menu">
                        <li class="scripts-header label">Scripts Menu</li>
                    </ul>
                </div>
            </li>`)
        }

        menu = document.querySelector('#scripts-menu')
        if (!menu) {
            throw new Error('Menu not found after insertion')
        }
        this.menu = menu

        this.scriptsIcon.addEventListener('click', (e) => {
            this.menu.classList.toggle('open')
            if (this.menu.classList.contains('open')) document.body.addEventListener('click', this.onBodyClick)
            e.stopPropagation()
        })

        const submenuClick = (e: Event) => {
            const target = e.target as HTMLElement
            if (!target.matches('.scripts-submenu>a')) return false
            const link = target.parentElement
            if (!link) return false
            if (!link.parentElement) return false
            for (const submenu of link.parentElement.querySelectorAll('.scripts-submenu.open')) {
                if (submenu !== link) submenu.classList.remove('open')
            }
            if (ksof().pageInfo.on === null) {
                const menu = document.querySelector('#sitemap__account,[id="#sitemap__account"]') as HTMLElement
                const submenu = link.querySelector('.dropdown-menu') as HTMLElement
                if (menu && submenu) {
                    submenu.style.fontSize = '12px'
                    submenu.style.maxHeight = ''
                    let top = Math.max(0, link.offsetTop)
                    link.classList.toggle('open')
                    if (link.classList.contains('open')) {
                        submenu.style.top = `${top}px`
                        if (menu.offsetHeight - top < submenu.offsetHeight)
                        {
                            top = Math.max(0, menu.offsetHeight - submenu.offsetHeight)
                            submenu.style.top = `${top}px`
                            submenu.style.maxHeight = String(menu.offsetHeight - top)
                        }
                    }
                }
            } else {
                link.classList.toggle('open')
            }
            // If we opened the menu, listen for off-menu clicks.
            if (link.classList.contains('open')) {
                document.body.addEventListener('click', this.onBodyClick)
            } else {
                document.body.removeEventListener('click', this.onBodyClick)
            }
            e.stopPropagation()
        }

        // Click to open/close sub-menu.
        this.menu.addEventListener('click', submenuClick)

        return menu
    }

    getSubmenu(name: string) {
        const safeName = escapeAttr(name)
        return this.submenus.get(safeName)
    }

    //------------------------------
    // Install Submenu, if not present.
    //------------------------------
    installScriptsSubmenu(name: string) {
        // Abort if already installed.
        const sub = this.getSubmenu(name)
        if (sub) {
            return sub
        }

        const safeName = escapeAttr(name)
        const safeText = escapeText(name)

        const linkElement = document.createElement('a')
        linkElement.href = '#'
        linkElement.innerText = safeText
        const dropdownMenu = document.createElement('ul')
        dropdownMenu.className = 'dropdown-menu'
        const submenu = document.createElement('li')
        submenu.setAttribute('name', safeName)
        submenu.appendChild(linkElement)
        submenu.appendChild(dropdownMenu)
        this.dropdownMenu.appendChild(submenu)

        this.submenus.set(safeName, submenu)

        const menuContents = this.dropdownMenu.querySelectorAll(':scope > .scripts-submenu, :scope > .script-link')
        if (!menuContents) return undefined
        for (const node of Array.from(menuContents).sort(sortName)) {
            // TODO why append again without removing first?
            node.parentNode?.append(node)
        }
        return submenu
    }

    //------------------------------
    // Inserts script link into Kamesame menu.
    //------------------------------
    // eslint-disable-next-line func-style
    insertScriptLink(config: Menu.Config) {
        // Abort if the script already exists
        const linkId = `${config.name}_script_link`
        const linkText = escapeText(config.title)
        if (document.querySelector(`#${linkId}`)) return

        if (this.configs.indexOf(config) >= 0) return
        this.configs.push(config)

        if (this.menu.hasAttribute('display')) {
            this.menu.removeAttribute('display')
        }

        let classes
        const scriptsHeader = this.header
        if (!scriptsHeader) return
        const link = document.createElement('li')
        link.id = linkId
        link.setAttribute('name', config.name)
        link.innerHTML = `<a href="#">${linkText}</a>`
        if (config.submenu) {
            const submenu = this.installScriptsSubmenu(config.submenu)
            if (!submenu) {
                return
            }

            // Append the script, and sort the menu.
            const menu = submenu.querySelector('.dropdown-menu')
            if (!menu) {
                return
            }

            classes = ['sitemap__page']
            if (config.class) classes.push(config.classHTML || '')
            link.setAttribute('class', classes.join(' '))
            link.innerHTML = `<a href="#">${linkText}</a>`
            menu.append(link)
        } else {
            classes = ['sitemap__page', 'script-link']
            if (config.class) classes.push(config.classHTML || '')
            link.setAttribute('class', classes.join(' '))
            if (ksof().pageInfo.on == 'review') {
                scriptsHeader.after(link)
            } else {
                scriptsHeader.append(link)
            }
        }

        const menuContents = scriptsHeader.parentElement?.querySelectorAll(':scope > .scripts-submenu, :scope > .script-link')
        if (menuContents) {
            for (const node of Array.from(menuContents).sort(sortName)) {
                node.parentNode?.append(node)
            }
        }

        // Add a callback for when the link is clicked.
        // TODO changed this function from function() {} to () => {}. May cause problems.
        document.querySelector(`#${linkId}`)?.addEventListener('click', (e) => {
            document.body.removeEventListener('click', this.onBodyClick)
            document.querySelector('#scripts-menu')?.classList.remove('open')
            for (const submenu of document.querySelectorAll('.scripts-submenu')) {
                submenu.classList.remove('open')
            }
            const temp = document.querySelector('#sitemap__account,[id="#sitemap__account"]')
            if (temp) {
                const temp2 = temp.parentElement?.querySelector('[data-expandable-navigation-target],[data-navigation-section-toggle]') as HTMLElement
                temp2.click()
                const navToggle = document.querySelector('.navigation__toggle') as HTMLButtonElement
                if (navToggle.offsetWidth > 0 || navToggle.offsetWidth > 0) navToggle.click()
            }
            config.onClick(e)
            return false
        })
    }

    //------------------------------
    // Handler that closes menus when clicking outside of menu.
    //------------------------------
    onBodyClick() {
        this.menu.classList.remove('open')
        for (const submenu of document.querySelectorAll('.scripts-submenu.open')) {
            submenu.classList.remove('open')
        }
        document.body.removeEventListener('click', this.onBodyClick)
    }
}

//------------------------------
// Sort menu items
//------------------------------
const sortName = (a:Element, b:Element) => {
    const a1 = a.querySelector('a')
    if (!a1) return -1
    const b1 = b.querySelector('a')
    if (!b1) return -1

    return a1.innerText.localeCompare(b1.innerText)
}

const escapeAttr = (attr: string) => { return attr.replace(/"/g, '\'') }
const escapeText = (text: string) => { return text.replace(/[<&>]/g, (ch) => {
    switch (ch) {
    case '<':
        return '&lt'
    case '>':
        return '&gt'
    case '&':
        return '&amp'
    default:
        return ch
    }
}) }

const findSearchIcon = () => {
    const textDiv = Array.from(document.querySelectorAll('#nav_container .real ul li a div.icon div'))
        .find(el => el.textContent === '🔍')
    if (!textDiv) {
        return undefined
    }
    return textDiv.parentElement?.parentElement as HTMLLinkElement
}
