
// type SrsName = 'lock' | 'init' | 'appr1' | 'appr2' | 'appr3' | 'appr4' | 'guru1' | 'guru2' | 'mast' | 'enli' | 'burn'
// type SrsNumber = -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
// type SubjectType = 'vocabulary' | 'kanji' | 'radical'
// type SubjectTypeString =
//     | `${SubjectType}`
//     | `${SubjectType},${SubjectType}`
//     | `${SubjectType},${SubjectType},${SubjectType}`
// type SubjectTypeShort = 'voc' | 'kan' | 'rad'
// type SubjectTypeShortString =
//     | `${SubjectTypeShort}`
//     | `${SubjectTypeShort},${SubjectTypeShort}`
//     | `${SubjectTypeShort},${SubjectTypeShort},${SubjectTypeShort}`
export type IsoDateString = `${number}-${number}-${number}T${number}:${number}:${number}.${number}Z`
