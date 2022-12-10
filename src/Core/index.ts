// ==UserScript==
// @name        KameSame Open Framework
// @namespace   timberpile
// @description Framework for writing scripts for KameSame
// @version     0.3
// @match       http*://*.kamesame.com/*
// @copyright   2022+, Robin Findley, Timberpile
// @license     MIT http://opensource.org/licenses/MIT
// @run-at      document-start
// @grant       none
// ==/UserScript==

import { KSOF } from './ksof'
import { Core } from './types'
import { updateLocationChange } from './updateLocationChange'

declare global {
    interface Window {
        ksof: Core.Module
    }
}


(((global: Window) => {
    'use strict'

    updateLocationChange()

    const onDocumentLoaded = () => {
        ksof.domObserver.init()

        window.addEventListener('locationchange', () => {
            ksof.setState('ksof.document', '') // Reset document state when navigating to different page

            setTimeout(() => { ksof.setState('ksof.document', 'ready') }, 2000) // fallback if unknown page -> assume everything loaded after 2 seconds

            ksof.trigger('ksof.page_changed')
        })
    }

    const startup = () => {
        // Start doc ready check once doc is loaded
        if (document.readyState === 'complete') {
            onDocumentLoaded()
        } else {
            window.addEventListener('load', onDocumentLoaded, false)  // Notify listeners that we are ready.
        }

        // Open cache, so ksof.fileCache.dir is available to console immediately.
        ksof.fileCache.open()
        ksof.setState('ksof.ksof', 'ready')
    }

    global.ksof = new KSOF()
    const ksof = global.ksof

    startup()
})(window))
