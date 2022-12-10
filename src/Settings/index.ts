// ==UserScript==
// @name        KameSame Open Framework - Settings module
// @namespace   timberpile
// @description Settings module for KameSame Open Framework
// @version     0.3
// @copyright   2022+, Robin Findley, Timberpile
// @license     MIT http://opensource.org/licenses/MIT
// ==/UserScript==

import { Core } from '../Core/types'
import { createSettings } from './ksofSettings'
import { Settings } from './types'

((async (global: Window) => {
    const ksof = global.ksof as Core.Module & Settings.Module

    ksof.Settings = createSettings()
    ksof.settings = {}

    //------------------------------
    // Load jquery UI and the appropriate CSS based on location.
    //------------------------------
    const cssUrl = ksof.supportFiles['jqui_ksmain.css']

    ksof.include('Jquery')
    await ksof.ready('document, Jquery')
    await ksof.loadScript(ksof.supportFiles['jquery_ui.js'], true /* cache */)
    await ksof.loadCSS(cssUrl, true /* cache */)

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
