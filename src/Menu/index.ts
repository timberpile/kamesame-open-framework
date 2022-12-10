// ==UserScript==
// @name        KameSame Open Framework - Menu module
// @namespace   timberpile
// @description Menu module for KameSame Open Framework
// @version     0.2.0.1
// @copyright   2022+, Robin Findley, Timberpile
// @license     MIT http://opensource.org/licenses/MIT
// ==/UserScript==

import { Core } from '../Core/types'
import { MenuUi } from './menuUi'
import { Menu } from './types'

(async (global: Window) => {
    const ksof = global.ksof as Core.Module & Menu.Module

    await ksof.ready('document')

    const ui = new MenuUi()

    ksof.Menu = {
        insertScriptLink: ui.insertScriptLink,
        ui,
    }

    // Delay guarantees include() callbacks are called before ready() callbacks.
    setTimeout(() => { ksof.setState('ksof.Menu', 'ready') }, 0)
})(window)
