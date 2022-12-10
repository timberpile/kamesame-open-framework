// ==UserScript==
// @name        KameSame Open Framework - Jquery module
// @namespace   timberpile
// @description Jquery module for KameSame Open Framework
// @version     0.3
// @copyright   2022+, Robin Findley, Timberpile
// @license     MIT; http://opensource.org/licenses/MIT
// ==/UserScript==

import { Core } from '../Core/types'
import { JQuery } from './types'

(async (global) => {
    const ksof = global.ksof as Core.Module & JQuery.Module

    await ksof.ready('document')

    try {
        $.fn.jquery
    } catch (e) {
        await ksof.loadScript(ksof.supportFiles['jquery.js'], true /* cache */)
    }

    ksof.Jquery = { version: $.fn.jquery }

    // Notify listeners that we are ready.
    // Delay guarantees include() callbacks are called before ready() callbacks.
    setTimeout(() => { ksof.setState('ksof.Jquery', 'ready') }, 0)
})(window)
