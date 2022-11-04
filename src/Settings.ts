// ==UserScript==
// @name        KameSame Open Framework - Settings module
// @namespace   timberpile
// @description Settings module for KameSame Open Framework
// @version     0.2
// @copyright   2022+, Robin Findley, Timberpile
// @license     MIT http://opensource.org/licenses/MIT
// ==/UserScript==

import { Core, Settings } from './ksof'

((async function(global: Window) {

    const ksof = global.ksof as Core.Module & Settings.Module

    const background_funcs = () => { return {
        open: () => {
            const anchor = install_anchor()
            let bkgd = anchor.find('> #ksofs_bkgd')
            if (bkgd.length === 0) {
                bkgd = $('<div id="ksofs_bkgd" refcnt="0"></div>')
                anchor.prepend(bkgd)
            }
            const refcnt = Number(bkgd.attr('refcnt'))
            bkgd.attr('refcnt', refcnt + 1)
        },
        close: () => {
            const bkgd = $('#ksof_ds > #ksofs_bkgd')
            if (bkgd.length === 0) return
            const refcnt = Number(bkgd.attr('refcnt'))
            if (refcnt <= 0) return
            bkgd.attr('refcnt', refcnt - 1)
        }
    }}

    //########################################################################
    //------------------------------
    // Constructor
    //------------------------------
    class KSOFSettings implements Settings.Dialog {
        cfg: Settings.Config
        config_list: Settings.UI.Collection
        keep_settings?: boolean
        reversions?: Settings.UI.Collection
        #open_dialog: JQuery<HTMLDivElement>
        background: {
            open: () => void
            close: () => void
        }

        constructor(config: Settings.Config) {
            this.cfg = config
            this.config_list = {}
            this.#open_dialog = $()
            this.background = background_funcs()
        }

        //------------------------------
        // Open the settings dialog.
        //------------------------------
        static save(context: Settings.Dialog | string) {
            const script_id = ((typeof context === 'string') ? context : context.cfg.script_id)
            const settings = ksof.settings[script_id]
            if (!settings) return Promise.resolve('')
            return ksof.file_cache.save(`ksof.settings.${script_id}`, settings)
        }

        save(): Promise<string> {
            return KSOFSettings.save(this)
        }

        //------------------------------
        // Open the settings dialog.
        //------------------------------
        static async load(context: Settings.Dialog | string, defaults?:Settings.SettingCollection) {
            const script_id = ((typeof context === 'string') ? context : context.cfg.script_id)

            try {
                const settings = await ksof.file_cache.load(`ksof.settings.${script_id}`) as Settings.SettingCollection
                return finish(settings)
            } catch (error) {
                return finish.call(null, {})
            }

            function finish(settings:Settings.SettingCollection) {
                if (defaults)
                    ksof.settings[script_id] = deep_merge(defaults, settings)
                else
                    ksof.settings[script_id] = settings
                return ksof.settings[script_id]
            }
        }

        load(defaults?:Settings.SettingCollection): Promise<Settings.SettingCollection> {
            return KSOFSettings.load(this, defaults)
        }

        //------------------------------
        // Save button handler.
        //------------------------------
        save_btn() {
            const script_id = this.cfg.script_id
            const settings = ksof.settings[script_id]
            if (settings) {
                const active_tabs = this.#open_dialog.find('.ui-tabs-active').toArray().map((tab) => {return `#${tab.attributes.getNamedItem('id')?.value || ''}`})
                if (active_tabs.length > 0) settings.ksofs_active_tabs = active_tabs
            }
            if (this.cfg.autosave === undefined || this.cfg.autosave === true) {
                this.save()
            }
            if (this.cfg.on_save) {
                this.cfg.on_save(ksof.settings[this.cfg.script_id])
            }
            ksof.trigger('ksof.settings.save')
            this.keep_settings = true
            this.#open_dialog.dialog('close')
        }

        //------------------------------
        // Cancel button handler.
        //------------------------------
        cancel() {
            this.#open_dialog.dialog('close')
            if (typeof this.cfg.on_cancel === 'function') this.cfg.on_cancel(ksof.settings[this.cfg.script_id])
        }

        //------------------------------
        // Open the settings dialog.
        //------------------------------
        open() {
            if (!ready) return
            if (this.#open_dialog.length > 0) return
            install_anchor()
            if (this.cfg.background !== false) this.background.open()
            this.#open_dialog = $(`<div id="ksofs_${this.cfg.script_id}" class="ksof_settings" style="display:none"></div>`)
            this.#open_dialog.html(config_to_html(this))

            const resize = (event:unknown, ui:any) => {
                const is_narrow = this.#open_dialog.hasClass('narrow')
                ui
                if (is_narrow && ui.size.width >= 510) {
                    this.#open_dialog.removeClass('narrow')
                }
                else if (!is_narrow && ui.size.width < 490) {
                    this.#open_dialog.addClass('narrow')
                }
            }

            const tab_activated = () => {
                const wrapper = $(this.#open_dialog.dialog('widget'))
                if ((wrapper.outerHeight() || 0) + wrapper.position().top > document.body.clientHeight) {
                    this.#open_dialog.dialog('option', 'maxHeight', document.body.clientHeight)
                }
            }

            let width = 500
            if (window.innerWidth < 510) {
                width = 280
                this.#open_dialog.addClass('narrow')
            }
            this.#open_dialog.dialog({
                title: this.cfg.title,
                buttons: [
                    {text:'Save',click:this.save_btn.bind(this)},
                    {text:'Cancel',click:this.cancel.bind(this)}
                ],
                width,
                maxHeight: document.body.clientHeight,
                modal: false,
                autoOpen: false,
                appendTo: '#ksof_ds',
                resize: resize.bind(this),
                close: () => { this.close(false) }
            })
            $(this.#open_dialog.dialog('widget')).css('position','fixed')
            this.#open_dialog.parent().addClass('ksof_settings_dialog')

            $('.ksof_stabs').tabs({activate:tab_activated.bind(null)})
            const settings = ksof.settings[this.cfg.script_id]
            if (settings && settings.ksofs_active_tabs instanceof Array) {
                const active_tabs = settings.ksofs_active_tabs
                for (let tab_idx = 0; tab_idx < active_tabs.length; tab_idx++) {
                    const tab = $(active_tabs[tab_idx])
                    tab.closest('.ui-tabs').tabs({active:tab.index()})
                }
            }

            const toggle_multi = (e:JQuery.MouseDownEvent) => {
                if (e.button != 0) return true
                const multi = $(e.currentTarget)
                const scroll = e.currentTarget.scrollTop
                e.target.selected = !e.target.selected
                setTimeout(function(){
                    e.currentTarget.scrollTop = scroll
                    multi.focus() // TODO what should this do? it's deprecated
                },0)
                return this.#setting_changed(e)
            }

            const setting_button_clicked = (e:JQuery.TriggeredEvent) => {
                const name = e.target.attributes.name.value
                const _item = this.config_list[name]
                if (_item.type == 'button') {
                    const item = _item as Settings.UI.Button
                    item.on_click.call(e, name, item, this.#setting_changed.bind(this, e))
                }
            }

            this.#open_dialog.dialog('open')
            this.#open_dialog.find('.setting[multiple]').on('mousedown', toggle_multi.bind(this))
            this.#open_dialog.find('.setting').on('change', this.#setting_changed.bind(this))
            this.#open_dialog.find('form').on('submit', function(){return false})
            this.#open_dialog.find('button.setting').on('click', setting_button_clicked.bind(this))

            if (typeof this.cfg.pre_open === 'function') this.cfg.pre_open(this.#open_dialog)
            this.reversions = deep_merge({}, ksof.settings[this.cfg.script_id])
            this.refresh()
        }

        //------------------------------
        // Handler for live settings changes.  Handles built-in validation and user callbacks.
        //------------------------------
        #setting_changed(event:JQuery.TriggeredEvent) {
            const elem = $(event.currentTarget)
            const name = elem.attr('name')
            if (!name) return false
            const _item = this.config_list[name]

            // Extract the value
            let value: any

            if (_item.type == 'dropdown') {
                value = elem.find(':checked').attr('name')
            }
            else if (_item.type == 'list') {
                const item = _item as Settings.UI.List

                if (item.multi === true) {
                    value = {}
                    elem.find('option').each(function(i,e){
                        const opt_name = e.getAttribute('name') || `#${e.index}`
                        value[opt_name] = e.selected
                    })
                } else {
                    value = elem.find(':checked').attr('name')
                }
            }
            else if (_item.type == 'input') {
                const item = _item as Settings.UI.Input

                if (item.subtype==='number') {
                    value = Number(elem.val())
                }
            }
            else if (_item.type == 'checkbox') {
                value = elem.is(':checked')
            }
            else if (_item.type == 'number') {
                value = Number(elem.val())
            }
            else {
                value = elem.val()
            }

            // Validation
            let valid = {valid:true, msg:''}
            {
                const item = _item as Settings.UI.UserInput
                if (item.validate) {
                    const _valid = item.validate.call(event.target, value, item)
                    if (typeof _valid === 'boolean')
                        valid = {valid:_valid, msg:''}
                    else if (typeof _valid === 'string')
                        valid = {valid:false, msg:_valid}
                }
            }

            if (_item.type == 'number') {
                const item = _item as Settings.UI.NumberInput

                if (item.min && Number(value) < item.min) {
                    valid.valid = false
                    if (valid.msg.length === 0) {
                        if (typeof item.max === 'number')
                            valid.msg = `Must be between ${item.min} and ${item.max}`
                        else
                            valid.msg = `Must be ${item.min} or higher`
                    }
                } else if (item.max && Number(value) > item.max) {
                    valid.valid = false
                    if (valid.msg.length === 0) {
                        if (typeof item.min === 'number')
                            valid.msg = `Must be between ${item.min} and ${item.max}`
                        else
                            valid.msg = `Must be ${item.max} or lower`
                    }
                }
            }
            else if (_item.type == 'text') {
                const item = _item as Settings.UI.TextInput

                if (item.match !== undefined && value.match(item.match) === null) {
                    valid.valid = false
                    if (valid.msg.length === 0)
                        // valid.msg = item.error_msg || 'Invalid value' // TODO no item has a error_msg?
                        valid.msg = 'Invalid value'
                }
            }


            // Style for valid/invalid
            const parent = elem.closest('.right')
            parent.find('.note').remove()
            if (typeof valid.msg === 'string' && valid.msg.length > 0)
                parent.append(`<div class="note${valid.valid?'':' error'}">${valid.msg}</div>`)
            if (!valid.valid) {
                elem.addClass('invalid')
            } else {
                elem.removeClass('invalid')
            }

            const script_id = this.cfg.script_id
            const settings = ksof.settings[script_id]
            if (valid.valid) {
                const item = _item as Settings.UI.UserInput

                // if (item.no_save !== true) set_value(this, settings, name, value) // TODO what is no_save supposed to do?
                set_value(this, settings, name, value)

                if (item.on_change) item.on_change.call(event.target, name, value, item)
                if (this.cfg.on_change) this.cfg.on_change.call(event.target, name, value, item)
                if (item.refresh_on_change === true) this.refresh()
            }

            return false
        }

        //------------------------------
        // Close and destroy the dialog.
        //------------------------------
        close(keep_settings:boolean) {
            if (!this.keep_settings && keep_settings !== true) {
                // Revert settings
                ksof.settings[this.cfg.script_id] = deep_merge({}, this.reversions || {})
                delete this.reversions
            }
            delete this.keep_settings
            this.#open_dialog.dialog('destroy')
            this.#open_dialog = $()
            if (this.cfg.background !== false) this.background.close()
            if (typeof this.cfg.on_close === 'function') this.cfg.on_close(ksof.settings[this.cfg.script_id])
        }

        //------------------------------
        // Update the dialog to reflect changed settings.
        //------------------------------
        refresh() {
            const script_id = this.cfg.script_id
            const settings = ksof.settings[script_id]
            for (const name in this.config_list) {
                const elem = this.#open_dialog.find(`#${script_id}_${name}`)
                const _config = this.config_list[name]
                const value = get_value(this, settings, name)

                if (_config.type == 'dropdown') {
                    elem.find(`option[name="${value}"]`).prop('selected', true)
                }
                else if (_config.type == 'list') {
                    const config = _config as Settings.UI.List
                    if (config.multi === true) {
                        elem.find('option').each(function(i,e){
                            const opt_name = e.getAttribute('name') || `#${e.index}`
                            e.selected = value[opt_name]
                        })
                    } else {
                        elem.find(`option[name="${value}"]`).prop('selected', true)
                    }
                }
                else if (_config.type == 'checkbox') {
                    elem.prop('checked', value)
                }
                else {
                    elem.val(value)
                }
            }
            if (typeof this.cfg.on_refresh === 'function') this.cfg.on_refresh(ksof.settings[this.cfg.script_id])
        }
    }

    function createSettings(): Settings.Settings {
        const settings_obj = (config: Settings.Config) => {
            return new KSOFSettings(config)
        }
        settings_obj.save = (context: Settings.Dialog | string) => { return KSOFSettings.save(context)}
        settings_obj.load = (context: Settings.Dialog | string, defaults?:Settings.UI.Collection) => { return KSOFSettings.load(context, defaults)}
        settings_obj.background = background_funcs()
        return settings_obj
    }

    ksof.Settings = createSettings()

    ksof.settings = {}

    //########################################################################

    let ready = false

    //========================================================================
    function deep_merge(...objects: {[key:string]: any}[]) {
        const merged = {}
        function recursive_merge(dest: {[key:string]: any}, src: {[key:string]: any}) {
            for (const prop in src) {
                if (typeof src[prop] === 'object' && src[prop] !== null ) {
                    const srcProp = src[prop]
                    if (Array.isArray(srcProp)) {
                        dest[prop] = srcProp.slice()
                    } else {
                        dest[prop] = dest[prop] || {}
                        recursive_merge(dest[prop], srcProp)
                    }
                } else {
                    dest[prop] = src[prop]
                }
            }
            return dest
        }
        for (const obj in objects) {
            recursive_merge(merged, objects[obj])
        }
        return merged
    }

    type ChildPassback = {tabs?: string[], pages?: string[], is_page?: boolean}

    //------------------------------
    // Convert a config object to html dialog.
    //------------------------------
    /* eslint-disable no-case-declarations */
    function config_to_html(context:KSOFSettings) {
        context.config_list = {}
        if (!ksof.settings) {
            return ''
        }
        let base = ksof.settings[context.cfg.script_id]
        if (base === undefined) ksof.settings[context.cfg.script_id] = base = {}

        let html = ''
        const child_passback:ChildPassback = {}
        const id = `${context.cfg.script_id}_dialog`
        for (const name in context.cfg.content) {
            html += parse_item(name, context.cfg.content[name], child_passback)
        }
        if (child_passback.tabs && child_passback.pages)
            html = assemble_pages(id, child_passback.tabs, child_passback.pages) + html
        return `<form>${html}</form>`

        //============
        function parse_item(name:string, _item: Settings.UI.Component, passback:ChildPassback) {
            if (typeof _item.type !== 'string') return ''
            const id = `${context.cfg.script_id}_${name}`
            let cname, html = '', child_passback:ChildPassback, non_page = ''

            const _type = _item.type

            if (_type == 'tabset') {
                const item = _item as Settings.UI.Tabset
                child_passback = {}
                for (cname in item.content) {
                    non_page += parse_item(cname, item.content[cname], child_passback)
                }
                if (child_passback.tabs && child_passback.pages) {
                    html = assemble_pages(id, child_passback.tabs, child_passback.pages)
                }
            }
            else if (_type == 'page') {
                const item = _item as Settings.UI.Page
                if (typeof item.content !== 'object') item.content = {}
                if (!passback.tabs) {
                    passback.tabs = []
                }
                if (!passback.pages) {
                    passback.pages = []
                }
                passback.tabs.push(`<li id="${id}_tab"${to_title(item.hover_tip)}><a href="#${id}">${item.label}</a></li>`)
                child_passback = {}
                for (cname in item.content) 
                    non_page += parse_item(cname, item.content[cname], child_passback)
                if (child_passback.tabs && child_passback.pages)
                    html = assemble_pages(id, child_passback.tabs, child_passback.pages)
                passback.pages.push(`<div id="${id}">${html}${non_page}</div>`)
                passback.is_page = true
                html = ''
            }
            else if (_type == 'group') {
                const item = _item as Settings.UI.Group
                if (typeof item.content !== 'object') item.content = {}
                child_passback = {}
                for (cname in item.content) 
                    non_page += parse_item(cname, item.content[cname], child_passback)
                if (child_passback.tabs && child_passback.pages)
                    html = assemble_pages(id, child_passback.tabs, child_passback.pages)
                html = `<fieldset id="${id}" class="ksof_group"><legend>${item.label}</legend>${html}${non_page}</fieldset>`
            }
            else if (_type == 'dropdown') {
                const item = _item as Settings.UI.Dropdown
                context.config_list[name] = item
                let value = get_value(context, base, name)
                if (value === undefined) {
                    if (item.default !== undefined) {
                        value = item.default
                    } else {
                        value = Object.keys(item.content)[0]
                    }
                    set_value(context, base, name, value)
                }

                html = `<select id="${id}" name="${name}" class="setting"${to_title(item.hover_tip)}>`
                for (cname in item.content)
                    html += `<option name="${cname}">${escape_text(item.content[cname])}</option>`
                html += '</select>'
                html = make_label(item) + wrap_right(html)
                html = wrap_row(html, item.full_width, item.hover_tip)
            }
            else if (_type == 'list') {
                const item = _item as Settings.UI.List

                context.config_list[name] = item
                let value = get_value(context, base, name)
                if (value === undefined) {
                    if (item.default !== undefined) {
                        value = item.default
                    } else {
                        if (item.multi === true) {
                            value = {}
                            Object.keys(item.content).forEach(function(key){
                                value[key] = false
                            })
                        } else {
                            value = Object.keys(item.content)[0]
                        }
                    }
                    set_value(context, base, name, value)
                }

                let attribs = ` size="${item.size || Object.keys(item.content).length || 4}"`
                if (item.multi === true) attribs += ' multiple'

                html = `<select id="${id}" name="${name}" class="setting list"${attribs}${to_title(item.hover_tip)}>`
                for (cname in item.content)
                    html += `<option name="${cname}">${escape_text(item.content[cname])}</option>`
                html += '</select>'
                html = make_label(item) + wrap_right(html)
                html = wrap_row(html, item.full_width, item.hover_tip)
            }
            else if (_type == 'checkbox') {
                const item = _item as Settings.UI.Checkbox
                context.config_list[name] = item
                html = make_label(item)
                let value = get_value(context, base, name)
                if (value === undefined) {
                    value = (item.default || false)
                    set_value(context, base, name, value)
                }
                html += wrap_right(`<input id="${id}" class="setting" type="checkbox" name="${name}">`)
                html = wrap_row(html, item.full_width, item.hover_tip)
            }
            else if (_type == 'input') {
                const item = _item as Settings.UI.Input
                const itype = item.subtype || 'text'
                context.config_list[name] = item
                html += make_label(item)
                let value = get_value(context, base, name)
                if (value === undefined) {
                    const is_number = (item.subtype==='number')
                    value = (item.default || (is_number ? 0 : ''))
                    set_value(context, base, name, value)
                }
                html += wrap_right(`<input id="${id}" class="setting" type="${itype}" name="${name}"${(item.placeholder?` placeholder="${escape_attr(item.placeholder)}"`:'')}>`)
                html = wrap_row(html, item.full_width, item.hover_tip)
            }
            else if (_type == 'number') {
                const item = _item as Settings.UI.NumberInput
                const itype = item.type
                context.config_list[name] = item
                html += make_label(item)
                let value = get_value(context, base, name)
                if (value === undefined) {
                    const is_number = (item.type==='number')
                    value = (item.default || (is_number ? 0 : ''))
                    set_value(context, base, name, value)
                }
                html += wrap_right(`<input id="${id}" class="setting" type="${itype}" name="${name}"${(item.placeholder?` placeholder="${escape_attr(item.placeholder)}"`:'')}>`)
                html = wrap_row(html, item.full_width, item.hover_tip)
            }
            else if (_type == 'text') {
                const item = _item as Settings.UI.TextInput
                const itype = item.type
                context.config_list[name] = item
                html += make_label(item)
                let value = get_value(context, base, name)
                if (value === undefined) {
                    value = (item.default || '')
                    set_value(context, base, name, value)
                }
                html += wrap_right(`<input id="${id}" class="setting" type="${itype}" name="${name}"${(item.placeholder?` placeholder="${escape_attr(item.placeholder)}"`:'')}>`)
                html = wrap_row(html, item.full_width, item.hover_tip)
            }
            else if (_type == 'color') {
                const item = _item as Settings.UI.ColorSelector
                context.config_list[name] = item
                html += make_label(item)
                let value = get_value(context, base, name)
                if (value === undefined) {
                    value = (item.default || '#000000')
                    set_value(context, base, name, value)
                }
                html += wrap_right(`<input id="${id}" class="setting" type="color" name="${name}">`)
                html = wrap_row(html, item.full_width, item.hover_tip)
            }
            else if (_type == 'button') {
                const item = _item as Settings.UI.Button
                context.config_list[name] = item
                html += make_label(item)
                const text = escape_text(item.text || 'Click')
                html += wrap_right(`<button type="button" class="setting" name="${name}">${text}</button>`)
                html = wrap_row(html, item.full_width, item.hover_tip)
            }
            else if (_type == 'divider') {
                html += '<hr>'
            }
            else if (_type == 'section') {
                const item = _item as Settings.UI.Section
                html += `<section>${item.label || ''}</section>`
            }
            else if (_type == 'html') {
                const item = _item as Settings.UI.Html
                html += make_label(item)
                html += item.html
                switch (item.wrapper) {
                case 'row': html = wrap_row(html, undefined, item.hover_tip); break
                case 'left': html = wrap_left(html); break
                case 'right': html = wrap_right(html); break
                }
            }

            return html

            function make_label(item: {label?:string}) {
                if (typeof item.label !== 'string') return ''
                return wrap_left(`<label for="${id}">${item.label}</label>`)
            }
        }
        /* eslint-enable no-case-declarations */

        //============
        function assemble_pages(id:string, tabs:string[], pages:string[]) {return `<div id="${id}" class="ksof_stabs"><ul>${tabs.join('')}</ul>${pages.join('')}</div>`}
        function wrap_row(html:string,full?:boolean,hover_tip?:string) {return `<div class="row${full?' full':''}"${to_title(hover_tip)}>${html}</div>`}
        function wrap_left(html:string) {return `<div class="left">${html}</div>`}
        function wrap_right(html:string) {return `<div class="right">${html}</div>`}
        function escape_text(text:string) {
            return text.replace(/[<>]/g, (ch) => {
                if (ch == '<') return '&lt'
                if (ch == '>') return '&gt'
                return ''
            })
        }
        function escape_attr(text:string) {return text.replace(/"/g, '&quot')}
        function to_title(tip?:string) {if (!tip) return ''; return ` title="${tip.replace(/"/g,'&quot')}"`}
    }

    function get_value(context:KSOFSettings, base: Settings.SettingCollection, name: string){
        const item = context.config_list[name] as {path?:string}
        const evaluate = (item.path !== undefined)
        const path = (item.path || name)
        try {
            if (!evaluate) return base[path]
            return eval(path.replace(/@/g,'base.'))
        } catch(e) {return}
    }

    function set_value(context:KSOFSettings, base: Settings.SettingCollection, name:string, value: Settings.Setting) {
        const item = context.config_list[name] as {path?:string}
        const evaluate = (item.path !== undefined)
        const path = (item.path || name)
        try {
            if (!evaluate) return base[path] = value
            let depth=0
            let new_path=''
            let param = ''
            let c:string
            for (let idx = 0; idx < path.length; idx++) {
                c = path[idx]
                if (c === '[') {
                    if (depth++ === 0) {
                        new_path += '['
                        param = ''
                    } else {
                        param += '['
                    }
                } else if (c === ']') {
                    if (--depth === 0) {
                        new_path += `${JSON.stringify(eval(param))}]`
                    } else {
                        param += ']'
                    }
                } else {
                    if (c === '@') c = 'base.'
                    if (depth === 0)
                        new_path += c
                    else
                        param += c
                }
            }
            eval(`${new_path}=value`)
        } catch(e) {return}
    }

    function install_anchor() {
        let anchor = $('#ksof_ds')
        if (anchor.length === 0) {
            anchor = $('<div id="ksof_ds"></div></div>')
            $('body').prepend(anchor)
            $('#ksof_ds').on('keydown keyup keypress', '.ksof_settings_dialog', function(e) {
                // Stop keys from bubbling beyond the background overlay.
                e.stopPropagation()
            })
        }
        return anchor
    }

    //------------------------------
    // Load jquery UI and the appropriate CSS based on location.
    //------------------------------
    const css_url = ksof.support_files['jqui_ksmain.css']

    ksof.include('Jquery')
    await ksof.ready('document, Jquery')
    await Promise.all([
        ksof.load_script(ksof.support_files['jquery_ui.js'], true /* cache */),
        ksof.load_css(css_url, true /* cache */)
    ])

    ready = true

    // Workaround...  https://community.wanikani.com/t/19984/55
    try {
        const temp = $.fn as unknown as {autocomplete:unknown}
        delete temp.autocomplete
    } catch(e) {
        // do nothing
    }

    // Notify listeners that we are ready.
    // Delay guarantees include() callbacks are called before ready() callbacks.
    setTimeout(function(){ksof.set_state('ksof.Settings', 'ready')},0)

})(window))
