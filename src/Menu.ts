// ==UserScript==
// @name        KameSame Open Framework - Menu module
// @namespace   timberpile
// @description Menu module for KameSame Open Framework
// @version     0.1.2
// @copyright   2022+, Robin Findley, Timberpile
// @license     MIT; http://opensource.org/licenses/MIT
// ==/UserScript==

import { Core, Menu } from './ksof';

(async (global: Window) => {

    const ksof = global.ksof as Core.Module & Menu.Module

    await ksof.ready('document')

    class MenuUi implements Menu.Ui {
        menu: HTMLDivElement
        style: HTMLStyleElement
        submenus: Map<string, HTMLLIElement>
        configs: Menu.Config[]

        constructor() {
            this.style = undefined as unknown as HTMLStyleElement
            this.menu = undefined as unknown as HTMLDivElement
            this.submenus = new Map()
            this.configs = []

            const reinstall_menu = () => {
                if (this.style) {
                    this.style.remove()
                }
                this.style = this.#install_style()
    
                if (this.menu) {
                    this.menu.remove()
                }
                try {
                    this.menu = this.#install_menu()
                } catch (error) {
                    throw new Error(`Can't install ksof menu: ${error}`)
                }
            }

            ksof.add_dom_observer({name: 'menu', query: '#scripts-menu'})
            ksof.wait_state(ksof.dom_observer_state('menu'), 'absent', () => {
                reinstall_menu()
                const old_configs = this.configs
                this.configs = []
                for (const config of old_configs) {
                    insert_script_link(config)
                }
            }, true)
        }

        get header () {
            return this.dropdown_menu?.querySelector(':scope > li.scripts-header') as HTMLLIElement
        }

        get scripts_icon() {
            if (ksof.pageInfo.on == 'review') {
                return this.menu.querySelector(':scope > a.scripts-icon') as HTMLLinkElement
            }
            else {
                // TODO use fitting selector for top menu bar
                return this.menu.querySelector(':scope > a.scripts-icon') as HTMLLinkElement
            }
        }

        get dropdown_menu() {
            return this.menu.querySelector('ul.dropdown-menu') as HTMLUListElement
        }

        #install_style() {
            const style = document.head.querySelector('style[name="scripts_submenu"]')
            if (style) {
                return style as HTMLStyleElement
            }
            document.head.insertAdjacentHTML('beforeend',
                `<style name="scripts_submenu">
                    #scripts-menu {text-shadow:none;}
                    #scripts-menu.scripts-menu-icon {display:inline-block;}
                    #scripts-menu .scripts-icon {display:inline-block; cursor: pointer; font-size: 1.2em; margin-right: auto; opacity: .65; position: relative; top: 3px;}
                    #scripts-menu:not(.open) > .dropdown-menu {display:none;}
                    #scripts-menu .scripts-submenu:not(.open) > .dropdown-menu {display:none;}
                    #scripts-menu ul.dropdown-menu {position:absolute; background-color:#eee; margin:0; padding:5px 0; list-style-type:none; border:1px solid #333; display:block;}
                    #scripts-menu ul.dropdown-menu > li {text-align:left; color:#333; white-space:nowrap; line-height:20px; padding:3px 0; display:list-item;}
                    #scripts-menu ul.dropdown-menu > li.scripts-header {text-transform:uppercase; font-size:.8rem; font-weight:bold; padding:3px 12px; display:list-item;}
                    #scripts-menu ul.dropdown-menu > li:hover:not(.scripts-header) {background-color:rgba(0,0,0,0.15)}
                    #scripts-menu ul.dropdown-menu a {padding:3px 20px; color:#333; opacity:1;}
                    #scripts-menu .scripts-submenu {position:relative; font-size: 1rem;}
                    #scripts-menu .scripts-submenu > a:after {content:">"; font-family:"FontAwesome"; position:absolute; top:0; right:0; padding:3px 4px 3px 0;}
                    #scripts-menu .scripts-submenu .dropdown-menu {left:100%; top:-6px;}
                    #app.kamesame nav li #scripts-menu {
                        display: flex;
                        flex-direction: column;
                        height: 100%;
                        width: 100%;
                        color: var(--gray);
                    }
                </style>`
            )
            return document.head.querySelector('style[name="scripts_submenu"]') as HTMLStyleElement
        }

        //------------------------------
        // Install 'Scripts' header in menu, if not present.
        //------------------------------
        #install_menu() {
            // Throws Error

            let menu = document.querySelector('#scripts-menu') as HTMLDivElement | null
            if (menu) {
                return menu
            }

            const page = ksof.pageInfo.on
            
            // Abort if on unsupported page
            // if (!page) throw new Error('Unsupported page')
            
            
            // Install html.
            if(page == 'review') {
                const exit_button = document.querySelector('.header a.exit')
                if (!exit_button) throw new Error('Exit button not found')
                
                exit_button.insertAdjacentHTML('afterend', `
                <div id="scripts-menu" class="scripts-menu-icon">
                    <a class="scripts-icon state" href="#"><i title="Script Menu">⚙️</i></a>
                    <ul class="dropdown-menu">
                        <li class="scripts-header">Script Menu</li>
                    </ul>
                </div>`)
            }
            else {
                const search_icon = find_search_icon()
                if (!search_icon) throw new Error('Search icon not found')

                search_icon.parentElement?.insertAdjacentHTML('afterend', `
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

            this.scripts_icon.addEventListener('click', (e) => {
                this.menu.classList.toggle('open');
                if (this.menu.classList.contains('open')) document.body.addEventListener('click', body_click);
                e.stopPropagation();
            })

            // Click to open/close sub-menu.
            this.menu.addEventListener('click', submenu_click)

            function submenu_click(e: Event){
                const target = e.target as HTMLElement
                if (!target.matches('.scripts-submenu>a')) return false
                const link = target.parentElement
                if (!link) return false
                if (!link.parentElement) return false
                for (const submenu of link.parentElement.querySelectorAll('.scripts-submenu.open')) {
                    if (submenu !== link) submenu.classList.remove('open');
                }
                if (ksof.pageInfo.on === null) {
                    const menu = document.querySelector('#sitemap__account,[id="#sitemap__account"]') as HTMLElement
                    const submenu = link.querySelector('.dropdown-menu') as HTMLElement
                    if (menu && submenu) {
                        submenu.style.fontSize = '12px';
                        submenu.style.maxHeight = '';
                        let top = Math.max(0, link.offsetTop);
                        link.classList.toggle('open');
                        if (link.classList.contains('open')) {
                            submenu.style.top = top+'px';
                            if (menu.offsetHeight - top < submenu.offsetHeight)
                            {
                                top = Math.max(0, menu.offsetHeight - submenu.offsetHeight);
                                submenu.style.top = top+'px';
                                submenu.style.maxHeight = String(menu.offsetHeight - top)
                            }
                        }
                    }
                } else {
                    link.classList.toggle('open');
                }
                // If we opened the menu, listen for off-menu clicks.
                if (link.classList.contains('open')) {
                    document.body.addEventListener('click', body_click);
                } else {
                    document.body.removeEventListener('click', body_click);
                }
                e.stopPropagation();
            }

            return menu
        }

        get_submenu(name: string) {
            const safe_name = escape_attr(name);
            return this.submenus.get(safe_name)
        }

        //------------------------------
        // Install Submenu, if not present.
        //------------------------------
        install_scripts_submenu(name: string) {
            // Abort if already installed.
            const sub = this.get_submenu(name)
            if (sub) {
                return sub
            }

            const safe_name = escape_attr(name);
            const safe_text = escape_text(name);

            const link_element = document.createElement('a')
            link_element.href = '#'
            link_element.innerText = safe_text
            const dropdown_menu = document.createElement('ul')
            dropdown_menu.className = 'dropdown-menu'
            const submenu = document.createElement('li')
            submenu.setAttribute('name', safe_name)
            submenu.appendChild(link_element)
            submenu.appendChild(dropdown_menu)
            this.dropdown_menu.appendChild(submenu)

            this.submenus.set(safe_name, submenu)

            const menu_contents = this.dropdown_menu.querySelectorAll(':scope > .scripts-submenu, :scope > .script-link');
            if (!menu_contents) return undefined
            for (const node of Array.from(menu_contents).sort(sort_name)) {
                // TODO why append again without removing first?
                node.parentNode?.append(node)
            }
            return submenu
        }
    }
    
    ksof.Menu = {
        insert_script_link: insert_script_link,
        ui: new MenuUi()
    }
    
    const ui = ksof.Menu.ui as MenuUi
    
    ui.menu.setAttribute('display', 'none')

    function escape_attr(attr: string) {return attr.replace(/"/g,'\'');}
    function escape_text(text: string) {return text.replace(/[<&>]/g, (ch) => {
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
    })}

    function find_search_icon() {
        const text_div = Array.from(document.querySelectorAll('#nav_container .real ul li a div.icon div'))
            .find(el => el.textContent === '🔍')
        if (!text_div) {
            return undefined
        }
        return text_div.parentElement?.parentElement as HTMLLinkElement
    }

    //------------------------------
    // Handler that closes menus when clicking outside of menu.
    //------------------------------
    function body_click() {
        ui.menu.classList.remove('open');
        for (const submenu of document.querySelectorAll('.scripts-submenu.open')) {
            submenu.classList.remove('open');
        }
        document.body.removeEventListener('click', body_click);
    }

    //------------------------------
    // Sort menu items
    //------------------------------
    function sort_name(a:Element,b:Element) {
        const a1 = a.querySelector('a')
        if (!a1) return -1
        const b1 = b.querySelector('a')
        if (!b1) return -1

        return a1.innerText.localeCompare(b1.innerText);
    }

    //------------------------------
    // Inserts script link into Kamesame menu.
    //------------------------------
    function insert_script_link(config: Menu.Config) {
        // Abort if the script already exists
        const link_id = config.name+'_script_link';
        const link_text = escape_text(config.title);
        if (document.querySelector('#'+link_id)) return;

        if (ui.configs.indexOf(config) >= 0) return;
        ui.configs.push(config)

        if(ui.menu.hasAttribute('display')) {
            ui.menu.removeAttribute('display')
        }

        let classes;
        const scripts_header = ui.header
        if (!scripts_header) return;
        const link = document.createElement('li');
        link.id = link_id;
        link.setAttribute('name', config.name);
        link.innerHTML = '<a href="#">'+link_text+'</a>';
        if (config.submenu) {
            const submenu = ui.install_scripts_submenu(config.submenu);
            if (!submenu) {
                return
            }

            // Append the script, and sort the menu.
            const menu = submenu.querySelector('.dropdown-menu');
            if (!menu) {
                return
            }

            classes = ['sitemap__page'];
            if (config.class) classes.push(config.class_html || '');
            link.setAttribute('class', classes.join(' '));
            link.innerHTML = '<a href="#">'+link_text+'</a>';
            menu.append(link);
        } else {
            classes = ['sitemap__page', 'script-link'];
            if (config.class) classes.push(config.class_html || '');
            link.setAttribute('class', classes.join(' '));
            if (ksof.pageInfo.on == 'review') {
                scripts_header.after(link);
            } else {
                scripts_header.append(link);
            }
        }

        const menu_contents = scripts_header.parentElement?.querySelectorAll(':scope > .scripts-submenu, :scope > .script-link');
        if (menu_contents) {
            for (const node of Array.from(menu_contents).sort(sort_name)) {
                node.parentNode?.append(node)
            }
        }

        // Add a callback for when the link is clicked.
        document.querySelector('#'+link_id)?.addEventListener('click', function(e){
            document.body.removeEventListener('click', body_click);
            document.querySelector('#scripts-menu')?.classList.remove('open');
            for (const submenu of document.querySelectorAll('.scripts-submenu')) {
                submenu.classList.remove('open')
            }
            const temp = document.querySelector('#sitemap__account,[id="#sitemap__account"]')
            if (temp) {
                const temp2 = temp.parentElement?.querySelector('[data-expandable-navigation-target],[data-navigation-section-toggle]') as HTMLElement
                temp2.click()
                const nav_toggle = document.querySelector('.navigation__toggle') as HTMLButtonElement
                if (nav_toggle.offsetWidth > 0 || nav_toggle.offsetWidth > 0) nav_toggle.click();
            }
            config.on_click(e);
            return false;
        });
    }

    // Delay guarantees include() callbacks are called before ready() callbacks.
    setTimeout(() => { ksof.set_state('ksof.Menu', 'ready') }, 0)

})(window)
