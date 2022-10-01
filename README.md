# KameSame Open Framework

KameSame Open Framework ("`ksof`") is a user-created framework for rapidly developing web browser userscripts for use with the Japanese kanji learning site [kamesame.com](https://www.kamesame.com).

This basically uses the Wanikani Open Framework as a base, and modifies it to be somewhat compatible with KameSame.

# Developers

## Building

1. Run `tsc` in root dir
2. Uncomment `export {};` in all generated `.js` files (unwanted behavior from TS compiler that needs to be fixed)
