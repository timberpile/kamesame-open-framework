import { Core } from './types'

export class PageInfo implements Core.PageInfo {
    // returns the type of the current page
    get on() {
        const matches: {
            tag: Core.Page
            matcher: RegExp
        }[] = [
            { tag: 'review', matcher: /kamesame\.com\/app\/reviews\/study\/[a-z0-9]+/ },
            { tag: 'review', matcher: /kamesame\.com\/app\/lessons\/study\/[a-z0-9]+/ },
            { tag: 'review_summary', matcher: /kamesame\.com\/app\/reviews\/summary/ },
            { tag: 'lessons_summary', matcher: /kamesame\.com\/app\/lessons\/summary/ },
            { tag: 'item_page', matcher: /kamesame\.com\/app\/items\/\d+/ },
            { tag: 'lessons', matcher: /kamesame\.com\/app\/lessons$/ },
            { tag: 'search', matcher: /kamesame\.com\/app\/search$/ },
            { tag: 'search_result', matcher: /kamesame\.com\/app\/search\// },
            { tag: 'account', matcher: /kamesame\.com\/app\/account/ },
            { tag: 'home', matcher: /kamesame\.com\/app$/ },
        ]

        for (const match of matches) {
            if (document.URL.match(match.matcher)) {
                return match.tag
            }
        }

        return null
    }
}
