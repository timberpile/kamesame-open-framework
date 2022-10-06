# KameSame Open Framework

KameSame Open Framework ("`ksof`") is a user-created framework for rapidly developing web browser userscripts for use with the Japanese kanji learning site [kamesame.com](https://www.kamesame.com).

It is an adapted version of the fantastic [Wanikani Open Framework](https://community.wanikani.com/t/wanikani-open-framework-developer-thread/22231) written by [rfindley(Robin Findley)](https://community.wanikani.com/u/rfindley) that was adapted to work with KameSame and is completely written in TypeScript

# Developers

## Building

1. Run `tsc` in root dir
2. Uncomment `export {};` in all generated `.js` files (unwanted behavior from TS compiler that needs to be fixed)
