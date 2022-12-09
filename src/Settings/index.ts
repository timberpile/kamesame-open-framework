// ==UserScript==
// @name        KameSame Open Framework - Settings module
// @namespace   timberpile
// @description Settings module for KameSame Open Framework
// @version     0.3
// @copyright   2022+, Robin Findley, Timberpile
// @license     MIT http://opensource.org/licenses/MIT
// ==/UserScript==

import { Core } from '../Core/types'
import { Settings } from './types'

((async (global: Window) => {
    const ksof = global.ksof as Core.Module & Settings.Module

    const backgroundFuncs = () => { return {
        open: () => {
            const anchor = installAnchor()
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
        },
    } }

    //########################################################################
    //------------------------------
    // Constructor
    //------------------------------
    class KSOFSettings implements Settings.Dialog {
        cfg: Settings.Config
        configList: Settings.UI.Collection
        keepSettings?: boolean
        reversions?: Settings.UI.Collection
        #openDialog: JQuery<HTMLDivElement>
        background: {
            open: () => void
            close: () => void
        }

        constructor(config: Settings.Config) {
            this.cfg = config
            this.configList = {}
            this.#openDialog = $()
            this.background = backgroundFuncs()
        }

        //------------------------------
        // Open the settings dialog.
        //------------------------------
        static save(context: Settings.Dialog | string) {
            const scriptId = ((typeof context === 'string') ? context : context.cfg.scriptId)
            const settings = ksof.settings[scriptId]
            if (!settings) return Promise.resolve('')
            return ksof.fileCache.save(`ksof.settings.${scriptId}`, settings)
        }

        save(): Promise<string> {
            return KSOFSettings.save(this)
        }

        //------------------------------
        // Open the settings dialog.
        //------------------------------
        static async load(context: Settings.Dialog | string, defaults?:Settings.SettingCollection) {
            const scriptId = ((typeof context === 'string') ? context : context.cfg.scriptId)

            const finish = (settings:Settings.SettingCollection) => {
                if (defaults)
                    ksof.settings[scriptId] = deepMerge(defaults, settings)
                else
                    ksof.settings[scriptId] = settings
                return ksof.settings[scriptId]
            }

            try {
                const settings = await ksof.fileCache.load(`ksof.settings.${scriptId}`) as Settings.SettingCollection
                return finish(settings)
            } catch (error) {
                return finish.call(null, {})
            }
        }

        load(defaults?:Settings.SettingCollection): Promise<Settings.SettingCollection> {
            return KSOFSettings.load(this, defaults)
        }

        //------------------------------
        // Save button handler.
        //------------------------------
        saveBtn() {
            const scriptId = this.cfg.scriptId
            const settings = ksof.settings[scriptId]
            if (settings) {
                const activeTabs = this.#openDialog.find('.ui-tabs-active').toArray()
                    .map((tab) => { return `#${tab.attributes.getNamedItem('id')?.value || ''}` })
                if (activeTabs.length > 0) settings.ksofActiveTabs = activeTabs
            }
            if (this.cfg.autosave === undefined || this.cfg.autosave === true) {
                this.save()
            }
            if (this.cfg.onSave) {
                this.cfg.onSave(ksof.settings[this.cfg.scriptId])
            }
            ksof.trigger('ksof.settings.save')
            this.keepSettings = true
            this.#openDialog.dialog('close')
        }

        //------------------------------
        // Cancel button handler.
        //------------------------------
        cancel() {
            this.#openDialog.dialog('close')
            if (typeof this.cfg.onCancel === 'function') this.cfg.onCancel(ksof.settings[this.cfg.scriptId])
        }

        //------------------------------
        // Open the settings dialog.
        //------------------------------
        open() {
            if (!ready) return
            if (this.#openDialog.length > 0) return
            installAnchor()
            if (this.cfg.background !== false) this.background.open()
            this.#openDialog = $(`<div id="ksofs_${this.cfg.scriptId}" class="ksof_settings" style="display:none"></div>`)
            this.#openDialog.html(configToHTML(this))

            const resize = (event:unknown, ui:any) => {
                const isNarrow = this.#openDialog.hasClass('narrow')
                ui
                if (isNarrow && ui.size.width >= 510) {
                    this.#openDialog.removeClass('narrow')
                }
                else if (!isNarrow && ui.size.width < 490) {
                    this.#openDialog.addClass('narrow')
                }
            }

            const tabActivated = () => {
                const wrapper = $(this.#openDialog.dialog('widget'))
                if ((wrapper.outerHeight() || 0) + wrapper.position().top > document.body.clientHeight) {
                    this.#openDialog.dialog('option', 'maxHeight', document.body.clientHeight)
                }
            }

            let width = 500
            if (window.innerWidth < 510) {
                width = 280
                this.#openDialog.addClass('narrow')
            }
            this.#openDialog.dialog({
                title: this.cfg.title,
                buttons: [
                    {
                        text: 'Save',
                        click: this.saveBtn.bind(this),
                    },
                    {
                        text: 'Cancel',
                        click: this.cancel.bind(this),
                    },
                ],
                width,
                maxHeight: document.body.clientHeight,
                modal: false,
                autoOpen: false,
                appendTo: '#ksof_ds',
                resize: resize.bind(this),
                close: () => {
                    this.close(false)
                },
            })
            $(this.#openDialog.dialog('widget')).css('position', 'fixed')
            this.#openDialog.parent().addClass('ksof_settings_dialog')

            $('.ksof_stabs').tabs({ activate: tabActivated.bind(null) })
            const settings = ksof.settings[this.cfg.scriptId]
            if (settings && settings.ksofActiveTabs instanceof Array) {
                const activeTabs = settings.ksofActiveTabs
                for (let tabIndex = 0; tabIndex < activeTabs.length; tabIndex++) {
                    const tab = $(activeTabs[tabIndex])
                    tab.closest('.ui-tabs').tabs({ active: tab.index() })
                }
            }

            const toggleMulti = (e:JQuery.MouseDownEvent) => {
                if (e.button != 0) return true
                const multi = $(e.currentTarget)
                const scroll = e.currentTarget.scrollTop
                e.target.selected = !e.target.selected
                setTimeout(() => {
                    e.currentTarget.scrollTop = scroll
                    multi.focus() // TODO what should this do? it's deprecated
                }, 0)
                return this.#settingChanged(e)
            }

            const settingButtonClicked = (e:JQuery.TriggeredEvent) => {
                const name = e.target.attributes.name.value
                const _item = this.configList[name]
                if (_item.type == 'button') {
                    const item = _item as Settings.UI.Button
                    item.onClick.call(e, name, item, this.#settingChanged.bind(this, e))
                }
            }

            this.#openDialog.dialog('open')
            this.#openDialog.find('.setting[multiple]').on('mousedown', toggleMulti.bind(this))
            this.#openDialog.find('.setting').on('change', this.#settingChanged.bind(this))
            this.#openDialog.find('form').on('submit', () => { return false })
            this.#openDialog.find('button.setting').on('click', settingButtonClicked.bind(this))

            if (typeof this.cfg.preOpen === 'function') this.cfg.preOpen(this.#openDialog)
            this.reversions = deepMerge({}, ksof.settings[this.cfg.scriptId])
            this.refresh()
        }

        //------------------------------
        // Handler for live settings changes.  Handles built-in validation and user callbacks.
        //------------------------------
        #settingChanged(event:JQuery.TriggeredEvent) {
            const elem = $(event.currentTarget)
            const name = elem.attr('name')
            if (!name) return false
            const _item = this.configList[name]

            // Extract the value
            let value: any

            if (_item.type == 'dropdown') {
                value = elem.find(':checked').attr('name')
            }
            else if (_item.type == 'list') {
                const item = _item as Settings.UI.List

                if (item.multi === true) {
                    value = {}
                    elem.find('option').each((i, e) => {
                        const optionName = e.getAttribute('name') || `#${e.index}`
                        value[optionName] = e.selected
                    })
                } else {
                    value = elem.find(':checked').attr('name')
                }
            }
            else if (_item.type == 'input') {
                const item = _item as Settings.UI.Input

                if (item.subtype === 'number') {
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
            let valid = { valid: true, msg: '' }
            {
                const item = _item as Settings.UI.UserInput
                if (item.validate) {
                    const _valid = item.validate.call(event.target, value, item)
                    if (typeof _valid === 'boolean')
                        valid = { valid: _valid, msg: '' }
                    else if (typeof _valid === 'string')
                        valid = { valid: false, msg: _valid }
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
                parent.append(`<div class="note${valid.valid ? '' : ' error'}">${valid.msg}</div>`)
            if (!valid.valid) {
                elem.addClass('invalid')
            } else {
                elem.removeClass('invalid')
            }

            const scriptId = this.cfg.scriptId
            const settings = ksof.settings[scriptId]
            if (valid.valid) {
                const item = _item as Settings.UI.UserInput

                // if (item.no_save !== true) set_value(this, settings, name, value) // TODO what is no_save supposed to do?
                setValue(this, settings, name, value)

                if (item.onChange) item.onChange.call(event.target, name, value, item)
                if (this.cfg.onChange) this.cfg.onChange.call(event.target, name, value, item)
                if (item.refreshOnChange === true) this.refresh()
            }

            return false
        }

        //------------------------------
        // Close and destroy the dialog.
        //------------------------------
        close(keepSettings:boolean) {
            if (!this.keepSettings && keepSettings !== true) {
                // Revert settings
                ksof.settings[this.cfg.scriptId] = deepMerge({}, this.reversions || {})
                delete this.reversions
            }
            delete this.keepSettings
            this.#openDialog.dialog('destroy')
            this.#openDialog = $()
            if (this.cfg.background !== false) this.background.close()
            if (typeof this.cfg.onClose === 'function') this.cfg.onClose(ksof.settings[this.cfg.scriptId])
        }

        //------------------------------
        // Update the dialog to reflect changed settings.
        //------------------------------
        refresh() {
            const scriptId = this.cfg.scriptId
            const settings = ksof.settings[scriptId]
            for (const name in this.configList) {
                const elem = this.#openDialog.find(`#${scriptId}_${name}`)
                const _config = this.configList[name]
                const value = getValue(this, settings, name)

                if (_config.type == 'dropdown') {
                    elem.find(`option[name="${value}"]`).prop('selected', true)
                }
                else if (_config.type == 'list') {
                    const config = _config as Settings.UI.List
                    if (config.multi === true) {
                        elem.find('option').each((i, e) => {
                            const optionName = e.getAttribute('name') || `#${e.index}`
                            e.selected = value[optionName]
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
            if (typeof this.cfg.onRefresh === 'function') this.cfg.onRefresh(ksof.settings[this.cfg.scriptId])
        }
    }

    const createSettings = (): Settings.Settings => {
        const settingsObj = (config: Settings.Config) => {
            return new KSOFSettings(config)
        }
        settingsObj.save = (context: Settings.Dialog | string) => { return KSOFSettings.save(context) }
        settingsObj.load = (context: Settings.Dialog | string, defaults?:Settings.UI.Collection) => { return KSOFSettings.load(context, defaults) }
        settingsObj.background = backgroundFuncs()
        return settingsObj
    }

    ksof.Settings = createSettings()

    ksof.settings = {}

    //########################################################################

    let ready = false

    //========================================================================
    const deepMerge = (...objects: {[key:string]: any}[]) => {
        const merged = {}
        const recursiveMerge = (dest: {[key:string]: any}, src: {[key:string]: any}) => {
            for (const prop in src) {
                if (typeof src[prop] === 'object' && src[prop] !== null) {
                    const srcProp = src[prop]
                    if (Array.isArray(srcProp)) {
                        dest[prop] = srcProp.slice()
                    } else {
                        dest[prop] = dest[prop] || {}
                        recursiveMerge(dest[prop], srcProp)
                    }
                } else {
                    dest[prop] = src[prop]
                }
            }
            return dest
        }
        for (const obj in objects) {
            recursiveMerge(merged, objects[obj])
        }
        return merged
    }

    type ChildPassback = {tabs?: string[], pages?: string[], isPage?: boolean}

    //------------------------------
    // Convert a config object to html dialog.
    //------------------------------
    /* eslint-disable no-case-declarations */
    const configToHTML = (context:KSOFSettings) => {
        context.configList = {}
        if (!ksof.settings) {
            return ''
        }

        const assemblePages = (id:string, tabs:string[], pages:string[]) => { return `<div id="${id}" class="ksof_stabs"><ul>${tabs.join('')}</ul>${pages.join('')}</div>` }
        const wrapRow = (html:string, full?:boolean, hoverTip?:string) => { return `<div class="row${full ? ' full' : ''}"${toTitle(hoverTip)}>${html}</div>` }
        const wrapLeft = (html:string) => { return `<div class="left">${html}</div>` }
        const wrapRight = (html:string) => { return `<div class="right">${html}</div>` }
        const escapeText = (text:string) => {
            return text.replace(/[<>]/g, (ch) => {
                if (ch == '<') return '&lt'
                if (ch == '>') return '&gt'
                return ''
            })
        }
        const escapeAttr = (text:string) => { return text.replace(/"/g, '&quot') }
        const toTitle = (tip?:string) => { if (!tip) return ''; return ` title="${tip.replace(/"/g, '&quot')}"` }

        const parseItem = (name:string, _item: Settings.UI.Component, passback:ChildPassback) => {
            if (typeof _item.type !== 'string') return ''
            const id = `${context.cfg.scriptId}_${name}`
            let cname, html = '', childPassback:ChildPassback, nonPage = ''

            const makeLabel = (item: {label?:string}) => {
                if (typeof item.label !== 'string') return ''
                return wrapLeft(`<label for="${id}">${item.label}</label>`)
            }

            const _type = _item.type

            if (_type == 'tabset') {
                const item = _item as Settings.UI.Tabset
                childPassback = {}
                for (cname in item.content) {
                    nonPage += parseItem(cname, item.content[cname], childPassback)
                }
                if (childPassback.tabs && childPassback.pages) {
                    html = assemblePages(id, childPassback.tabs, childPassback.pages)
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
                passback.tabs.push(`<li id="${id}_tab"${toTitle(item.hoverTip)}><a href="#${id}">${item.label}</a></li>`)
                childPassback = {}
                for (cname in item.content)
                    nonPage += parseItem(cname, item.content[cname], childPassback)
                if (childPassback.tabs && childPassback.pages)
                    html = assemblePages(id, childPassback.tabs, childPassback.pages)
                passback.pages.push(`<div id="${id}">${html}${nonPage}</div>`)
                passback.isPage = true
                html = ''
            }
            else if (_type == 'group') {
                const item = _item as Settings.UI.Group
                if (typeof item.content !== 'object') item.content = {}
                childPassback = {}
                for (cname in item.content)
                    nonPage += parseItem(cname, item.content[cname], childPassback)
                if (childPassback.tabs && childPassback.pages)
                    html = assemblePages(id, childPassback.tabs, childPassback.pages)
                html = `<fieldset id="${id}" class="ksof_group"><legend>${item.label}</legend>${html}${nonPage}</fieldset>`
            }
            else if (_type == 'dropdown') {
                const item = _item as Settings.UI.Dropdown
                context.configList[name] = item
                let value = getValue(context, base, name)
                if (value === undefined) {
                    if (item.default !== undefined) {
                        value = item.default
                    } else {
                        value = Object.keys(item.content)[0]
                    }
                    setValue(context, base, name, value)
                }

                html = `<select id="${id}" name="${name}" class="setting"${toTitle(item.hoverTip)}>`
                for (cname in item.content)
                    html += `<option name="${cname}">${escapeText(item.content[cname])}</option>`
                html += '</select>'
                html = makeLabel(item) + wrapRight(html)
                html = wrapRow(html, item.fullWidth, item.hoverTip)
            }
            else if (_type == 'list') {
                const item = _item as Settings.UI.List

                context.configList[name] = item
                let value = getValue(context, base, name)
                if (value === undefined) {
                    if (item.default !== undefined) {
                        value = item.default
                    } else {
                        if (item.multi === true) {
                            value = {}
                            Object.keys(item.content).forEach((key) => {
                                value[key] = false
                            })
                        } else {
                            value = Object.keys(item.content)[0]
                        }
                    }
                    setValue(context, base, name, value)
                }

                let attribs = ` size="${item.size || Object.keys(item.content).length || 4}"`
                if (item.multi === true) attribs += ' multiple'

                html = `<select id="${id}" name="${name}" class="setting list"${attribs}${toTitle(item.hoverTip)}>`
                for (cname in item.content)
                    html += `<option name="${cname}">${escapeText(item.content[cname])}</option>`
                html += '</select>'
                html = makeLabel(item) + wrapRight(html)
                html = wrapRow(html, item.fullWidth, item.hoverTip)
            }
            else if (_type == 'checkbox') {
                const item = _item as Settings.UI.Checkbox
                context.configList[name] = item
                html = makeLabel(item)
                let value = getValue(context, base, name)
                if (value === undefined) {
                    value = (item.default || false)
                    setValue(context, base, name, value)
                }
                html += wrapRight(`<input id="${id}" class="setting" type="checkbox" name="${name}">`)
                html = wrapRow(html, item.fullWidth, item.hoverTip)
            }
            else if (_type == 'input') {
                const item = _item as Settings.UI.Input
                const itype = item.subtype || 'text'
                context.configList[name] = item
                html += makeLabel(item)
                let value = getValue(context, base, name)
                if (value === undefined) {
                    const isNumber = (item.subtype === 'number')
                    value = (item.default || (isNumber ? 0 : ''))
                    setValue(context, base, name, value)
                }
                html += wrapRight(`<input id="${id}" class="setting" type="${itype}" name="${name}"${(item.placeholder ? ` placeholder="${escapeAttr(item.placeholder)}"` : '')}>`)
                html = wrapRow(html, item.fullWidth, item.hoverTip)
            }
            else if (_type == 'number') {
                const item = _item as Settings.UI.NumberInput
                const itype = item.type
                context.configList[name] = item
                html += makeLabel(item)
                let value = getValue(context, base, name)
                if (value === undefined) {
                    const isNumber = (item.type === 'number')
                    value = (item.default || (isNumber ? 0 : ''))
                    setValue(context, base, name, value)
                }
                html += wrapRight(`<input id="${id}" class="setting" type="${itype}" name="${name}"${(item.placeholder ? ` placeholder="${escapeAttr(item.placeholder)}"` : '')}>`)
                html = wrapRow(html, item.fullWidth, item.hoverTip)
            }
            else if (_type == 'text') {
                const item = _item as Settings.UI.TextInput
                const itype = item.type
                context.configList[name] = item
                html += makeLabel(item)
                let value = getValue(context, base, name)
                if (value === undefined) {
                    value = (item.default || '')
                    setValue(context, base, name, value)
                }
                html += wrapRight(`<input id="${id}" class="setting" type="${itype}" name="${name}"${(item.placeholder ? ` placeholder="${escapeAttr(item.placeholder)}"` : '')}>`)
                html = wrapRow(html, item.fullWidth, item.hoverTip)
            }
            else if (_type == 'color') {
                const item = _item as Settings.UI.ColorSelector
                context.configList[name] = item
                html += makeLabel(item)
                let value = getValue(context, base, name)
                if (value === undefined) {
                    value = (item.default || '#000000')
                    setValue(context, base, name, value)
                }
                html += wrapRight(`<input id="${id}" class="setting" type="color" name="${name}">`)
                html = wrapRow(html, item.fullWidth, item.hoverTip)
            }
            else if (_type == 'button') {
                const item = _item as Settings.UI.Button
                context.configList[name] = item
                html += makeLabel(item)
                const text = escapeText(item.text || 'Click')
                html += wrapRight(`<button type="button" class="setting" name="${name}">${text}</button>`)
                html = wrapRow(html, item.fullWidth, item.hoverTip)
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
                html += makeLabel(item)
                html += item.html
                switch (item.wrapper) {
                case 'row': html = wrapRow(html, undefined, item.hoverTip); break
                case 'left': html = wrapLeft(html); break
                case 'right': html = wrapRight(html); break
                }
            }

            return html
        }

        let base = ksof.settings[context.cfg.scriptId]
        if (base === undefined) ksof.settings[context.cfg.scriptId] = base = {}

        let html = ''
        const childPassback:ChildPassback = {}
        const id = `${context.cfg.scriptId}_dialog`
        for (const name in context.cfg.content) {
            html += parseItem(name, context.cfg.content[name], childPassback)
        }
        if (childPassback.tabs && childPassback.pages)
            html = assemblePages(id, childPassback.tabs, childPassback.pages) + html
        return `<form>${html}</form>`
    }

    const getValue = (context:KSOFSettings, base: Settings.SettingCollection, name: string) => {
        const item = context.configList[name] as {path?:string}
        const evaluate = (item.path !== undefined)
        const path = (item.path || name)
        try {
            if (!evaluate) return base[path]
            return eval(path.replace(/@/g, 'base.'))
        } catch (e) { return }
    }

    const setValue = (context:KSOFSettings, base: Settings.SettingCollection, name:string, value: Settings.Setting) => {
        const item = context.configList[name] as {path?:string}
        const evaluate = (item.path !== undefined)
        const path = (item.path || name)
        try {
            if (!evaluate) return base[path] = value
            let depth = 0
            let newPath = ''
            let param = ''
            let c:string
            for (let idx = 0; idx < path.length; idx++) {
                c = path[idx]
                if (c === '[') {
                    if (depth++ === 0) {
                        newPath += '['
                        param = ''
                    } else {
                        param += '['
                    }
                } else if (c === ']') {
                    if (--depth === 0) {
                        newPath += `${JSON.stringify(eval(param))}]`
                    } else {
                        param += ']'
                    }
                } else {
                    if (c === '@') c = 'base.'
                    if (depth === 0)
                        newPath += c
                    else
                        param += c
                }
            }
            eval(`${newPath}=value`)
        } catch (e) { return }
    }

    const installAnchor = () => {
        let anchor = $('#ksof_ds')
        if (anchor.length === 0) {
            anchor = $('<div id="ksof_ds"></div></div>')
            $('body').prepend(anchor)
            $('#ksof_ds').on('keydown keyup keypress', '.ksof_settings_dialog', (e) => {
                // Stop keys from bubbling beyond the background overlay.
                e.stopPropagation()
            })
        }
        return anchor
    }

    //------------------------------
    // Load jquery UI and the appropriate CSS based on location.
    //------------------------------
    const cssUrl = ksof.supportFiles['jqui_ksmain.css']

    ksof.include('Jquery')
    await ksof.ready('document, Jquery')
    await Promise.all([
        ksof.loadScript(ksof.supportFiles['jquery_ui.js'], true /* cache */),
        ksof.loadCSS(cssUrl, true /* cache */),
    ])

    ready = true

    // Workaround...  https://community.wanikani.com/t/19984/55
    try {
        const temp = $.fn as unknown as {autocomplete:unknown}
        delete temp.autocomplete
    } catch (e) {
        // do nothing
    }

    // Notify listeners that we are ready.
    // Delay guarantees include() callbacks are called before ready() callbacks.
    setTimeout(() => { ksof.setState('ksof.Settings', 'ready') }, 0)
})(window))
