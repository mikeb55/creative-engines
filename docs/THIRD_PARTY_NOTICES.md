# Third-party notices

## Tonal.js scale dictionary

The Practice & Scales Studio glossary file `apps/composer-os-app/src/practice/data/named-scales.json` is derived from `@tonaljs/scale-type` 4.9.4, file `packages/scale-type/data.ts`, retrieved 2026-10-16.

https://github.com/tonaljs/tonal

Licence: MIT.

Interval spellings were converted to pitch-class masks in this repository. Tonal.js chroma integers were not copied. Those integers put the root in the high bit. Composer OS and Ian Ring put pitch class 0 in bit 0.

`@tonaljs/scale-type` 4.9.4 `package.json` declares `"license": "MIT"` and `"author": "danigb@gmail.com"`. The repository root had no `LICENSE` file on 2026-10-16. The MIT terms are:

```text
MIT License

Copyright (c) danigb (danigb@gmail.com), as named in @tonaljs/scale-type package.json

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

The Tonal package metadata names the author as danigb@gmail.com and the licence as MIT. The notice above follows that licence. It is not a claim about any other file in Tonal.js.

## music21 Forte numbers

`apps/composer-os-app/src/practice/data/forte-table.json` stores Forte numbers and Z-relation flags read from music21 8.3.0 chord tables on 2026-10-16. Prime forms were computed in this repository and checked against that music21 build for all 4,096 pitch-class masks.

https://github.com/cuthbertLab/music21

music21 8.3 labels the empty set `N/A`. This table uses `0-1` so the 224 TnI classes each have a number. music21 8.3 omits the `Z` character from `forteClassTnI`. This table inserts `Z` when `hasZRelation` is true.

Licence: BSD-3-Clause, as shipped with music21 8.3.0.

```text
Copyright (c) 2006-2022, Michael Scott Asato Cuthbert
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the names music21, Michael Scott Asato Cuthbert, nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL Cuthbert BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

## Not imported

Ian Ring's scale names, aliases, and page prose were not copied. William Zeitler's coined names were not copied. Justin Pecot's Dozenal names were not copied. Ian Ring page URLs are built from the mask for tonic-fixed sets only. Opening one is a link, not a copy of the page.
