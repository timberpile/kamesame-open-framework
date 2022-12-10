
// Ensure locationchange always works
// https://stackoverflow.com/questions/6390341/how-to-detect-if-url-has-changed-after-hash-in-javascript
export const updateLocationChange = () => {
    const oldPushState = history.pushState
    history.pushState = function pushState() {
        //eslint-disable-next-line prefer-rest-params
        const ret = oldPushState.apply(this, arguments as any)
        window.dispatchEvent(new Event('pushstate'))
        window.dispatchEvent(new Event('locationchange'))
        return ret
    }

    const oldReplaceState = history.replaceState
    history.replaceState = function replaceState() {
        //eslint-disable-next-line prefer-rest-params
        const ret = oldReplaceState.apply(this, arguments as any)
        window.dispatchEvent(new Event('replacestate'))
        window.dispatchEvent(new Event('locationchange'))
        return ret
    }

    window.addEventListener('popstate', () => {
        window.dispatchEvent(new Event('locationchange'))
    })
}
