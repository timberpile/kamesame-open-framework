import { Core } from './types'

export class Version implements Core.Version {
    value: string

    constructor(version:string) {
        this.value = version
    }

    //------------------------------
    // Compare the framework version against a specific version.
    //------------------------------
    compareTo(clientVersion:string) {
        const clientVer = clientVersion.split('.').map(d => Number(d))
        const ksofVer = this.value.split('.').map(d => Number(d))
        const len = Math.max(clientVer.length, ksofVer.length)
        for (let idx = 0; idx < len; idx++) {
            const a = clientVer[idx] || 0
            const b = ksofVer[idx] || 0
            if (a === b) continue
            if (a < b) return 'newer'
            return 'older'
        }
        return 'same'
    }
}
