
export class Deferred<T> {
    promise: Promise<T>
    resolve: (value: T | PromiseLike<T>) => void
    reject: (value?: any) => void

    constructor() {
        this.resolve = () => { /*placeholder*/ }
        this.reject = () => { /*placeholder*/ }
        this.promise = new Promise<T>((resolve, reject)=> {
            this.reject = reject
            this.resolve = resolve
        })
    }
}
