import { Core } from '../Core/types'
import { configToHTML, getSettingValue, setSettingValue } from './htmlGenerator'
import { Settings } from './types'

const ksof = () => {
    return window.ksof as Core.Module & Settings.Module
}

export const createSettings = (): Settings.Settings => {
    const settingsObj = (config: Settings.Config) => {
        return new KSOFSettings(config)
    }
    settingsObj.save = (context: Settings.Dialog | string) => { return KSOFSettings.save(context) }
    settingsObj.load = (context: Settings.Dialog | string, defaults?:Settings.UI.Collection) => { return KSOFSettings.load(context, defaults) }
    settingsObj.background = backgroundFuncs()
    return settingsObj
}

export class KSOFSettings implements Settings.Dialog {
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
        const settings = ksof().settings[scriptId]
        if (!settings) return Promise.resolve('')
        return ksof().fileCache.save(`ksof.settings.${scriptId}`, settings)
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
                ksof().settings[scriptId] = deepMerge(defaults, settings)
            else
                ksof().settings[scriptId] = settings
            return ksof().settings[scriptId]
        }

        try {
            const settings = await ksof().fileCache.load(`ksof.settings.${scriptId}`) as Settings.SettingCollection
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
        const settings = ksof().settings[scriptId]
        if (settings) {
            const activeTabs = this.#openDialog.find('.ui-tabs-active').toArray()
                .map((tab) => { return `#${tab.attributes.getNamedItem('id')?.value || ''}` })
            if (activeTabs.length > 0) settings.ksofActiveTabs = activeTabs
        }
        if (this.cfg.autosave === undefined || this.cfg.autosave === true) {
            this.save()
        }
        if (this.cfg.onSave) {
            this.cfg.onSave(ksof().settings[this.cfg.scriptId])
        }
        ksof().trigger('ksof.settings.save')
        this.keepSettings = true
        this.#openDialog.dialog('close')
    }

    //------------------------------
    // Cancel button handler.
    //------------------------------
    cancel() {
        this.#openDialog.dialog('close')
        if (typeof this.cfg.onCancel === 'function') this.cfg.onCancel(ksof().settings[this.cfg.scriptId])
    }

    //------------------------------
    // Open the settings dialog.
    //------------------------------
    open() {
        if (ksof().getState('ksof.Settings') != 'ready') return
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
        const settings = ksof().settings[this.cfg.scriptId]
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
        this.reversions = deepMerge({}, ksof().settings[this.cfg.scriptId])
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
        const settings = ksof().settings[scriptId]
        if (valid.valid) {
            const item = _item as Settings.UI.UserInput

            // if (item.no_save !== true) set_value(this, settings, name, value) // TODO what is no_save supposed to do?
            setSettingValue(this, settings, name, value)

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
            ksof().settings[this.cfg.scriptId] = deepMerge({}, this.reversions || {})
            delete this.reversions
        }
        delete this.keepSettings
        this.#openDialog.dialog('destroy')
        this.#openDialog = $()
        if (this.cfg.background !== false) this.background.close()
        if (typeof this.cfg.onClose === 'function') this.cfg.onClose(ksof().settings[this.cfg.scriptId])
    }

    //------------------------------
    // Update the dialog to reflect changed settings.
    //------------------------------
    refresh() {
        const scriptId = this.cfg.scriptId
        const settings = ksof().settings[scriptId]
        for (const name in this.configList) {
            const elem = this.#openDialog.find(`#${scriptId}_${name}`)
            const _config = this.configList[name]
            const value = getSettingValue(this, settings, name)

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
        if (typeof this.cfg.onRefresh === 'function') this.cfg.onRefresh(ksof().settings[this.cfg.scriptId])
    }
}

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
