import { Core } from './types'
import { KANA_CHARS, JAPANESE_CHARS } from './regex'

// declare global {
//     interface Window {
//         ksof: Core.Module
//         $: JQueryStatic
//     }
// }

// TODO better structure for Infos
export class ItemInfo implements Core.ItemInfo {
    ksof: Core.Module

    constructor(ksof: Core.Module) {
        this.ksof = ksof
    }

    get variations() {
        switch (this.ksof.pageInfo.on) {
        case 'item_page':
            switch (this.type) {
            case 'vocabulary':
                return this.facts['Variations'].split('、')
            case 'kanji':
                break
            }
        }

        return null
    }

    get partsOfSpeech() {
        switch (this.ksof.pageInfo.on) {
        case 'item_page':
            switch (this.type) {
            case 'vocabulary':
                return this.facts['Parts of Speech'].split(', ')
            case 'kanji':
                break
            }
        }

        return null
    }

    get wanikaniLevel() {
        switch (this.ksof.pageInfo.on) {
        case 'item_page':
            switch (this.type) {
            case 'vocabulary':
                return parseInt(this.facts['WaniKani Level'], 10)
            case 'kanji':
                break
            }
        }

        return null
    }

    get tags() {
        switch (this.ksof.pageInfo.on) {
        case 'item_page':
            switch (this.type) {
            case 'vocabulary':
                return this.facts['Tags'].split(', ')
            case 'kanji':
                break
            }
        }

        return null
    }

    get id() {
        let url = ''
        if (this.ksof.pageInfo.on == 'review') {
            const itemLink = document.querySelector('#app.kamesame #study .outcome p a.item') as HTMLLinkElement | null
            if (!itemLink) {
                return null
            }
            url = itemLink.href
        }
        else if (this.ksof.pageInfo.on == 'item_page') {
            url = document.URL
        }

        const match = RegExp(/app\/items\/(\d+)/).exec(url)
        if (!match) {
            return null
        }
        if (match.length < 2) {
            return null
        }
        return Number(match[1])
    }

    get characters() {
        if (this.ksof.pageInfo.on == 'review') {
            const outcomeText = document.querySelector('#app.kamesame #study .outcome p')?.textContent
            if (!outcomeText) {
                return null
            }

            const regexes = [
                // characters with reading explanation
                RegExp(`([${JAPANESE_CHARS}]+)\\(read as`),
                // characters without reading explanation, failed
                RegExp(`looking for ([${JAPANESE_CHARS}]+)[\\s⏯]* instead`),
                // characters without reading explanation, success
                RegExp(`Indeed, ([${JAPANESE_CHARS}]+)[\\s⏯]*`),
                RegExp(`That's right! ([${JAPANESE_CHARS}]+)[\\s⏯]*`),
                // characters without reading explanation, different answer expected
                RegExp(`we were actually looking for ([${JAPANESE_CHARS}]+)[\\s⏯]*`),
            ]

            // try out the different possible regexes until one hits
            for (const regex of regexes) {
                const match = regex.exec(outcomeText)
                if (match) {
                    return match[1]
                }
            }
            return null
        }
        else if (this.ksof.pageInfo.on == 'item_page') {
            if (this.type == 'vocabulary') {
                return document.querySelector('.name.vocabulary')?.textContent || null
            }
        }

        return null
    }

    get meanings() {
        if (this.ksof.pageInfo.on == 'review') {
            const outcomeText = document.querySelector('#app.kamesame #study .outcome p')?.textContent
            if (!outcomeText) {
                return null
            }

            const regexes = [
                /does(?: not)? mean[\s\n]*((?:".*?"[, or]*)+)/g,
                /We'd have accepted[\s\n]*((?:".*?"[, or]*)+)/g,
            ]

            // try out all possible regexes
            const meanings:string[] = []
            for (const regex of regexes) {
                const match = regex.exec(outcomeText)
                if (match) {
                    const match1 = match[1]
                    const match2 = match1.replaceAll(' or ', ',')
                    const match3 = match2.split(',')

                    for (const item of match3) {
                        meanings.push(item.replaceAll('"', '').trim())
                    }
                }
            }
            return meanings
        }
        else if (this.ksof.pageInfo.on == 'item_page') {
            if (this.type == 'vocabulary') {
                return this.facts['Meanings'].split(', ')
            }
        }

        return null
    }

    get readings() {
        if (this.ksof.pageInfo.on == 'review') {
            const outcomeText = document.querySelector('#app.kamesame #study .outcome p')?.textContent
            if (!outcomeText) {
                return null
            }
            const readings:string[] = []

            const rawReadingsRegex = new RegExp(`\\(read as ([${KANA_CHARS},a-z\\s⏯]+)\\)`)
            let match = rawReadingsRegex.exec(outcomeText)
            if (match) {
                const readingsRaw = match[1]

                const readingsRegex = new RegExp(`[${KANA_CHARS}]+`, 'g')
                match = readingsRegex.exec(readingsRaw)
                while (match != null) {
                    readings.push(match[0]) // captured readings
                    match = readingsRegex.exec(readingsRaw)
                }
            }

            if (readings.length == 0) {
                const characters = this.characters || ''
                if (RegExp(`[${KANA_CHARS}]`).test(characters)) {
                    readings.push(characters) // if word only consists of kana, then there are no readings in the outcome text, so we just use the word itself
                }
            }
            return readings
        }
        else if (this.ksof.pageInfo.on == 'item_page') {
            if (this.type == 'vocabulary') {
                return this.facts['Readings'].replaceAll(' ⏯', '').split('、')
            }
        }

        return null
    }

    get facts() {
        const facts: {[key: string]: string} = {}
        for (const fact of document.querySelectorAll('#item .facts .fact')) {
            const key = fact.querySelector('.key')?.textContent || ''
            let val = ''

            if (key == 'Tags') {
                const tags: string[] = []
                for (const tag of fact.querySelectorAll('.value .item-tag')) {
                    if (tag.textContent) {
                        tags.push(tag.textContent)
                    }
                }
                val = tags.join(', ')
            }
            else {
                val = fact.querySelector('.value')?.textContent || ''
            }
            facts[key] = val
        }

        return facts
    }

    get type() {
        if (this.ksof.pageInfo.on == 'review') {
            //
        }
        else if (this.ksof.pageInfo.on == 'item_page') {
            if (document.querySelector('#item h2')?.textContent == 'Vocabulary summary') {
                return 'vocabulary'
            }
            else if (document.querySelector('#item h2')?.textContent == 'Kanji summary') {
                return 'kanji'
            }
        }
        return null
    }

    get summary() {
        return {
            characters: this.characters,
            meanings: this.meanings,
            readings: this.readings,
            variations: this.variations,
            partsOfSpeech: this.partsOfSpeech,
            wanikaniLevel: this.wanikaniLevel,
            tags: this.tags,
            on: this.ksof.pageInfo.on,
            type: this.type,
        }
    }
}
