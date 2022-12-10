
export const splitList = (str: string) => {
    // eslint-disable-next-line no-irregular-whitespace
    return str.replace(/、/g, ',').replace(/[\s　]+/g, ' ')
        .trim()
        .replace(/ *, */g, ',')
        .split(',')
        .filter((name) => { return (name.length > 0) })
}
