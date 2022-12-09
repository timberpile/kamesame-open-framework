import { IsoDateString } from '../types'

export declare namespace Core {
    export interface FileCache {
        dir: {
            [key: string]: {
                added: IsoDateString
                lastLoaded: IsoDateString
            }
        }
        syncTimer: NodeJS.Timeout | undefined

        ls: () => void
        clear: () => Promise<void | Event>
        delete: (pattern: string | RegExp) => Promise<void | string[]>
        dirSave: (immediately:boolean) => void
        flush: () => void
        load: (name:string) => Promise<string | { [key: string]: any }> // TODO raw string really right type?
        save: (name:string, content: string | { [key: string]: any }, extraAttribs?:object) => Promise<string>
        fileNocache: (list:string | string[] | undefined) => void
    }

    export interface Version {
        value: string
        compareTo: (neededVersion:string) => 'older' | 'same' | 'newer'
    }

    export type FailedInclude = {
        name?:string
        url?:string
    }

    export type StateCallback = (newValue:StateValue, prevValue:StateValue) => void

    export type StateListener = {
        callback?: StateCallback
        persistent: boolean
        value: StateValue
    }

    export type UnknownCallback = (...args: unknown[]) => void

    export type AnswerOutcome = 'exactly_correct' | 'reading_correct' | 'alternative_match_completion' | 'alternative_match' | 'incorrect'

    export interface ReviewInfo {
        answerCorrect: AnswerOutcome | null
        reviewType: 'production' | 'recognition' | null
    }

    export interface ItemInfo {
        characters: string | null
        meanings: string[] | null
        readings: string[] | null
        variations: string[] | null
        partsOfSpeech: string[] | null
        wanikaniLevel: number | null
        tags: string[] | null
        type: 'vocabulary' | 'kanji' | null
        summary: {[key: string]: string | string[] | number | null}
        id: number | null
    }

    export type Page = 'review'
    | 'review_summary'
    | 'lessons'
    | 'lessons_summary'
    | 'item_page'
    | 'search'
    | 'search_result'
    | 'account'
    | 'home'
    | null

    export interface PageInfo {
        on: Page
    }

    export type StateValue = any

    export interface DomObserver {
        name: string
        query: string
    }

    export interface Module {
        version: Version
        fileCache: FileCache
        supportFiles: { [key: string]: string }
        stateListeners: {[key:string]: StateListener[]}
        stateValues: {[key:string]: StateValue}
        eventListeners: {[key:string]: UnknownCallback[]}
        includePromises: {[key:string]: Promise<string>}
        domObservers: DomObserver[]
        itemInfo: ItemInfo
        reviewInfo: ReviewInfo
        pageInfo: PageInfo

        loadFile: (url: string, useCache?: boolean) => Promise<any>
        getState: (stateVar:string) => StateValue
        setState: (stateVar:string, value:StateValue) => void
        waitState: (
            stateVar: string,
            value: StateValue,
            callback?: StateCallback,
            persistent: boolean
        ) => Promise<string>
        trigger: (event: string, ...args_: unknown[]) => void
        on: (event:string, callback: UnknownCallback) => void
        loadScript: (url:string, useCache?: boolean) => Promise<string>
        loadCSS: (url:string, useCache?:boolean) => Promise<string>
        include: (moduleList:string) => Promise<{ loaded: string[]; failed: FailedInclude[] }>
        ready: (moduleList:string) => Promise<'ready' | 'ready'[]>
        addDomObserver: (observer:Core.DomObserver) => void
        domObserverState: (name: string) => string
    }
}
