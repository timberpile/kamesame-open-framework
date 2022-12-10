import { Core } from './types'

export class DomObserver implements Core.DomObserver {
    ksof: Core.Module
    observers: Core.DomObserverEntry[]
    mutationObserver: MutationObserver

    constructor(ksof: Core.Module) {
        this.ksof = ksof
        this.observers = []
        this.mutationObserver = new MutationObserver(this.onBodyMutated)
    }

    // Because KameSame loads its DOM data after the doc is already loaded, we need to make an additional check
    // to see if the DOM elements have been added to the body already before we can mark the doc as truly ready
    init() {
        this.mutationObserver.observe(document.body, { childList: true, subtree: true })

        // Add default Observers
        this.add({ name: 'study_outcome', query: '#app.kamesame #study .outcome p a.item' })

        // TODO
        // HACK THAT SHOULD BE REMOVED ONCE ISSUE FIXED:
        // On some of the KameSame pages (like during reviews) bodyObserver never automatically
        // processes the mutations it records. I have no idea why. On the dicionary entry pages
        // this isn't a problem. So we also manually process these events instead once in a while
        const checkObserver = () => {
            const mutations = this.mutationObserver.takeRecords()
            if (mutations.length > 0) {
                this.onBodyMutated()
            }
            setTimeout(checkObserver, 100)
        }
        checkObserver()

        this.addPageLoadObservers()
    }

    addPageLoadObservers() {
        const pageQueries = new Map([
            ['item_page',       '#app.kamesame #item .facts .fact'],
            ['review',         '#app.kamesame #study .meaning'],
            ['review_summary',  '#app.kamesame #reviews #reviewsSummary .level-bars'],
            ['lessons_summary', '#app.kamesame #summary .item-list li a.item'],
            ['lessons',        '#app.kamesame #lessons #lessonsFromLists.section'],
            ['search',         '#app.kamesame #search form .search-bar #searchQuery'],
            ['search_result',   '#app.kamesame #search .fancy-item-list .actions'],
            ['home',           '#app.kamesame #home .section .stats'],
            ['account',        '#app.kamesame #account .fun-stuff'],
        ])

        const setStateReady = () => { this.ksof.setState('ksof.document', 'ready') }

        for (const query of pageQueries) {
            const observer = { name: `page.${query[0]}`, query: query[1] }
            this.add(observer)
            this.ksof.waitState(this.stateName(observer), 'present', setStateReady)
        }
    }

    // Throws Error if observer with the given name or query already exists
    add(observer:Core.DomObserverEntry) {
        for (const _observer of this.observers) {
            if (_observer.name == observer.name) {
                throw new Error(`Observer with the name ${observer.name} already exists`)
            }
            if (_observer.query == observer.query) {
                throw new Error(`Observer with the query ${observer.query} already exists under the name ${observer.name}`)
            }
        }

        this.observers.push(observer)
        this.update(observer)
    }

    stateName(observer: Core.DomObserverEntry) {
        return `ksof.dom_observer.${observer.name}`
    }

    onBodyMutated() {
        if (this.observers) { // TODO this safeguard had to be added when moving observer into own class. Try to remove it.
            for (const observer of this.observers) {
                this.update(observer)
            }
        }
    }

    update(observer:Core.DomObserverEntry) {
        const visible = (document.querySelector(observer.query) != null)
        this.ksof.setState(this.stateName(observer), visible ? 'present' : 'absent')
    }
}
