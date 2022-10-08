// ==UserScript==
// @name        KameSame Open Framework - Jquery module
// @namespace   timberpile
// @description Progress module for KameSame Open Framework
// @version     0.2
// @copyright   2022+, Robin Findley, Timberpile
// @license     MIT; http://opensource.org/licenses/MIT
// ==/UserScript==

import { Core, JQuery } from './ksof';

(async (global) => {

    const ksof = global.ksof as Core.Module & JQuery.Module

    await ksof.ready('document')

    try {
        $.fn.jquery
    } catch(e) {
        await ksof.load_script(ksof.support_files['jquery.js'], true /* cache */)
    }

    ksof.Jquery = { version: $.fn.jquery }

    // Notify listeners that we are ready.
    // Delay guarantees include() callbacks are called before ready() callbacks.
    setTimeout(() => { ksof.set_state('ksof.Jquery', 'ready') }, 0)

})(window);
