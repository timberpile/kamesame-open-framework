import { Core } from '../Core/types'
import { KSOFSettings } from './ksofSettings'
import { Settings } from './types'

const ksof = () => {
    return window.ksof as Core.Module & Settings.Module
}

type ChildPassback = {tabs?: string[], pages?: string[], isPage?: boolean}

//------------------------------
// Convert a config object to html dialog.
//------------------------------
export const configToHTML = (context:KSOFSettings) => {
    context.configList = {}
    if (!ksof().settings) {
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
            let value = getSettingValue(context, base, name)
            if (value === undefined) {
                if (item.default !== undefined) {
                    value = item.default
                } else {
                    value = Object.keys(item.content)[0]
                }
                setSettingValue(context, base, name, value)
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
            let value = getSettingValue(context, base, name)
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
                setSettingValue(context, base, name, value)
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
            let value = getSettingValue(context, base, name)
            if (value === undefined) {
                value = (item.default || false)
                setSettingValue(context, base, name, value)
            }
            html += wrapRight(`<input id="${id}" class="setting" type="checkbox" name="${name}">`)
            html = wrapRow(html, item.fullWidth, item.hoverTip)
        }
        else if (_type == 'input') {
            const item = _item as Settings.UI.Input
            const itype = item.subtype || 'text'
            context.configList[name] = item
            html += makeLabel(item)
            let value = getSettingValue(context, base, name)
            if (value === undefined) {
                const isNumber = (item.subtype === 'number')
                value = (item.default || (isNumber ? 0 : ''))
                setSettingValue(context, base, name, value)
            }
            html += wrapRight(`<input id="${id}" class="setting" type="${itype}" name="${name}"${(item.placeholder ? ` placeholder="${escapeAttr(item.placeholder)}"` : '')}>`)
            html = wrapRow(html, item.fullWidth, item.hoverTip)
        }
        else if (_type == 'number') {
            const item = _item as Settings.UI.NumberInput
            const itype = item.type
            context.configList[name] = item
            html += makeLabel(item)
            let value = getSettingValue(context, base, name)
            if (value === undefined) {
                const isNumber = (item.type === 'number')
                value = (item.default || (isNumber ? 0 : ''))
                setSettingValue(context, base, name, value)
            }
            html += wrapRight(`<input id="${id}" class="setting" type="${itype}" name="${name}"${(item.placeholder ? ` placeholder="${escapeAttr(item.placeholder)}"` : '')}>`)
            html = wrapRow(html, item.fullWidth, item.hoverTip)
        }
        else if (_type == 'text') {
            const item = _item as Settings.UI.TextInput
            const itype = item.type
            context.configList[name] = item
            html += makeLabel(item)
            let value = getSettingValue(context, base, name)
            if (value === undefined) {
                value = (item.default || '')
                setSettingValue(context, base, name, value)
            }
            html += wrapRight(`<input id="${id}" class="setting" type="${itype}" name="${name}"${(item.placeholder ? ` placeholder="${escapeAttr(item.placeholder)}"` : '')}>`)
            html = wrapRow(html, item.fullWidth, item.hoverTip)
        }
        else if (_type == 'color') {
            const item = _item as Settings.UI.ColorSelector
            context.configList[name] = item
            html += makeLabel(item)
            let value = getSettingValue(context, base, name)
            if (value === undefined) {
                value = (item.default || '#000000')
                setSettingValue(context, base, name, value)
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

    let base = ksof().settings[context.cfg.scriptId]
    if (base === undefined) ksof().settings[context.cfg.scriptId] = base = {}

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

export const getSettingValue = (context:KSOFSettings, base: Settings.SettingCollection, name: string) => {
    const item = context.configList[name] as {path?:string}
    const evaluate = (item.path !== undefined)
    const path = (item.path || name)
    try {
        if (!evaluate) return base[path]
        return eval(path.replace(/@/g, 'base.'))
    } catch (e) { return }
}

export const setSettingValue = (context:KSOFSettings, base: Settings.SettingCollection, name:string, value: Settings.Setting) => {
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
