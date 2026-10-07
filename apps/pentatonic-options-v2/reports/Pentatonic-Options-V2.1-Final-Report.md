# Pentatonic Options V2.1 — Final Report

## INITIAL STATE

- Branch at inspection: `macos-launcher-verification`
- Local HEAD: `80e0d9a3939f638c2bcd0f4ce9dbfb3d5392a69d`
- origin/main: `80e0d9a3939f638c2bcd0f4ce9dbfb3d5392a69d`
- Local HEAD matched origin/main before this release
- Working tree already held unrelated uncommitted Composer OS edits. Those files were left unstaged.

Commit gap from `pentatonic-options-v2-release` (`cf940f7b`) to that HEAD is two report commits only:

- `9851f44c` Record the WWH Orbit MuseScore page check and guitar-audition status.
- `80e0d9a3` Set the V2 report remote tip to the MuseScore close-out commit.

The stopped V2.1 run had started a score-wide pitch-class spelling rewrite. That rewrite was not kept. Explicit per-note spelling was continued instead. Unrelated slur, wedge, marcato, and tempo-mark edits in the exporter were not part of this commit.

## SPELLING ROOT CAUSE

MIDI export spelled sounding pitches with the default sharp alphabet. The pentatonic field already had letter spelling (`F Ab Bb C Eb`, `E F# G# B C#`). The exporter never received that spelling, so F minor came out as `F D# G# A#`.

## SPELLING FIX

`NoteEvent.spelling` is optional: `{ step, alter }`.

The shared exporter uses that spelling when the event carries it. When the event does not, it calls `midiToPitch(midi, preferFlats)` as before. An empty context map is a no-op. There is no global flat preference.

Generated pentatonic notes take the governing field's spelled degrees. SLIP notes take the slipped field's spelling. Source notes keep the written step and alter, so Orbit `G#` stays `G#` when the field letter would be `Ab`.

## SPELLING TESTS

`engines/composer-os-v2/tests/pentatonicSpellingRhythm.test.ts`

1. F minor pentatonic: `F Ab Bb C Eb`
2. E major pentatonic: `E F# G# B C#`
3. Generated F-minor field: no `D#` / `G#` / `A#` substitution
4. Source `G#` remains `G#`
5. SLIP uses the slipped spelling (`F# A C#` outside `F Ab C`)
6. Unspelled export stays on the sharp default and is byte-identical across two runs

## LEGACY BYTE-IDENTICAL PROOF

`export.test.ts` and `exportHardening.test.ts` passed on the spelling-only exporter. Notes with no `spelling` field still go through `midiToPitch`. The unspelled D-sharp fixture remains `step D`, `alter 1`.

## RHYTHM ROOT CAUSE

Practice export had been spacing cell notes evenly. Source onsets, durations, and rests were dropped after the pitch map.

## RHYTHM FIX

Source timing stays beside the pitch map. `CELL_LINEAGE`, `RESEAT`, and `transformCell` copy the source slots. Pitch landing still uses the existing grid, so feeding source beats into the pitch map was not done. Material with no source motif stays on the even grid. Examples record `rhythm: source` or `rhythm: generated`.

The Orbit phrase export reads written guitar and bass events through the existing MusicXML measure reader. It does not add a second rhythm engine. Written bars keep source rests and durations. Operator pitches replace note slots only for a source-rhythm cell. Matching pitch classes keep source spelling.

## RHYTHM TESTS

- Orbit source-derived cell keeps source rhythm and rests
- RESEAT of a source motif keeps source rhythm
- `transformCell` keeps the supplied source rhythm beside the mapped pitches
- A manual example with no source motif stays on even rhythm

## ORBIT COLOUR REVIEW

Report only. No musical-logic change.

- Source: Orbit duo leadsheet, bars 1–2 of the A phrase. Bar 1 has no chord symbol. Bar 2 chord is `Fmaj7#11`.
- Fixture passage used by Dev 5a (`orbitAPassage`): bars 1–7 path line `1–7  F Minor Pentatonic HOME`.
- Bar 2 melody: `F Eb G# Bb`. Bass: `F`. Centre: `F`.
- Field spelling for that HOME reading: `F Ab Bb C Eb`. Source `G#` is the written spelling of field `Ab`.
- Chord tones of `Fmaj7#11`: `F A C E B`.
- Overlap: `F`. `C` is in the field and in the chord, and is not a bar-2 melody note.
- Conflicts: `Ab`/`G#` against `A`, `Eb` against `E`, `Bb` against `B` (`#11`).
- Live export operator on bar 2: `CELL_LINEAGE`.
- Why Dev 6 chose it: colour evaluation of the fixture bars 1–2 (melody `C F Eb G# Bb`, bass `F`, centre `F`) selects `minor_pentatonic` as HOME. Melody and bass outweigh the chord. A bar-2-only check selects `F Minor Sixth Pentatonic` as CONTINUITY, pitch compatibility 1.00. The chord is not the quantiser.
- Live score analysis, left unchanged, labels bars 1–7 `C Minor Pentatonic SUSPENDED`. The phrase export follows that live path.

ORBIT F MINOR PENTATONIC OVER Fmaj7#11: DELIBERATE

RECOMMENDATION: Keep the F minor colour field over Fmaj7#11; do not quantise the line to the chord.

## ORBIT PHRASE EXPORT

- Path: `apps/pentatonic-options-v2/reports/wwh-orbit-phrase.musicxml`
- Bars 1–9. Dev 6A first phrase. Section `section-1`. Phrase function `unknown`. Not extended. The next real boundary is the A′ rehearsal at bar 10.
- Meter 3/4. Tempo 129. Key fifths 0, mode major. Guitar treble, bass bass clef. No TAB.
- Guitar is the practice line on the source rhythm. Bass is the source bass. Chord symbols are the source symbols. Staff text is `CELL` or `NONE` plus a short field label when the label changes.

| Bar | Chord | Operator | Field | Rhythm |
| --- | --- | --- | --- | --- |
| 1 | N.C. | NONE | C minor `C Eb F G Bb` | source |
| 2 | Fmaj7#11 | CELL_LINEAGE | C minor | source |
| 3 | Ebmaj7#5 | NONE | C minor | source |
| 4 | Dbmaj7 | CELL_LINEAGE | C minor | source |
| 5 | Bmaj7 | NONE | C minor | source |
| 6 | Bbm9 | CELL_LINEAGE | C minor | source |
| 7 | Abmaj7 | CELL_LINEAGE | C minor | source |
| 8 | Gbmaj7 | CELL_LINEAGE | E major `E F# G# B C#` | source |
| 9 | Emaj7 | NONE | E major | source |

Bar 2 guitar: F5 quarter, Eb5 quarter, G#4 16th, Bb4 dotted eighth.

Hidden MusicXML degree elements were omitted on this practice file so MuseScore prints the source kind text once. The shared exporter still writes hidden degrees for other scores.

## MUSESCORE

- `apps/pentatonic-options-v2/reports/musescore-orbit-phrase-p1.png`
- One page, 992×1403. MuseScore 4 cocoa export. No page 2.

Visual checklist:

- F-minor generated spelling uses flats. Bar 2 written source spelling is F, Eb, G#, Bb.
- Source G# remains G#.
- Source rhythm and rests are on the page, including the bar 1 rests and the bar 2 16th plus dotted eighth.
- 9 bars.
- Chord symbols: Fmaj7#11, Ebmaj7#5, Dbmaj7, Bmaj7, Bbm9, Abmaj7, Gbmaj7, Emaj7.
- Electric Guitar and Upright Bass. Treble and bass clefs. 3/4. Quarter equals 129.
- No TAB. Staff text is inside the page. No broken tuplets. Bar durations sum to the 3/4 capacity.

## SOURCE INTEGRITY

File: `/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS/05-Orbit-Duo-Leadsheet-V2.1.musicxml`

- SHA-256 before and after: `911f07a6aa9deab3ddd5b7a97eff9bd9dc987a8f8cce5038201553a8b978b3db`
- mtime: `1791284952`
- size: 79812

The WWH source was not written.

## TEST MATRIX

- Spelling and rhythm tests: 10/10 PASS
- Dev 3.7 fingerprint: `cca0456e61a2a14e06f4aa14af0ae4bff902a46baa18ced000aec9ab146c91e6` PASS
- Dev 4: 9/9 PASS
- Dev 5a: PASS
- Dev 6c: 4/4 PASS, including frozen fingerprint and change cost
- Shared exporter tests: PASS
- Legacy unspelled exporter fixture: PASS
- Pentatonic Options V2 suite: 29/29 PASS, including desktop smoke and the Dev 3.7 fingerprint
- Panel Vitest `pentatonicPanel.test.ts`: 14/14 PASS
- Composer OS app Vite build: PASS
- Orbit MusicXML `validateMusicXml`: valid, no errors
- Dist app self-test: `SELF_TEST_OK HOME_CONTINUITY CELL_LINEAGE C4 F4 G4`
- Desktop app self-test: same `SELF_TEST_OK`
- Desktop double-click launch: process started, Terminal window count stayed 0

## BUILD RESULT

- Dist: `apps/pentatonic-options-v2/dist/Pentatonic Options V2.app`
- Product name and executable remain `Pentatonic Options V2` so the existing bundle check stays valid
- Window title and HTML header: `Pentatonic Options`
- Header subtitle: `V2.1`
- Packager no longer copies a second app onto the Desktop

## FINAL COMMIT

Message: `Pentatonic Options V2.1: field spelling, source rhythm, Orbit phrase export`

Hash: recorded as the commit that adds this report.

## PUSH RESULT

main pushed after the commit. Local HEAD must equal origin/main.

## V2.1 TAG

`pentatonic-options-v2.1-release` created on that commit and pushed.

Not moved:

- `pentatonic-options-v2-release` → `cf940f7`
- `pentatonic-dev6-release` → `5eae25f83707118b9a4b3fb88b3fc45361c884ee`

## V1 SOURCE ARCHIVE

`/Users/user/Documents/DEVS/Pentatonic-Options/ARCHIVE/Pentatonic-Options-V1-FROZEN-2026-10-07/` still present. V1 source was not deleted.

## V1 DESKTOP ARCHIVE

From `/Users/user/Desktop/Pentatonic Options.app`

To `/Users/user/Documents/DEVS/Pentatonic-Options/ARCHIVE/Desktop/Pentatonic Options V1.app`

Archive exists. `codesign --verify --deep --strict` passed. The executable is present.

## ACTIVE V2.1 DESKTOP APP

`/Users/user/Desktop/Pentatonic Options.app`

- Finder display name: Pentatonic Options
- Only this Pentatonic Options app is on the Desktop
- Self-test passed
- Launch did not open Terminal

## GUITAR AUDITION STATUS

GUITAR AUDITION: DEFERRED — USER VALIDATION

A later guitar test is musical QA only. A practical issue after that becomes V2.1.x or V2.2 unless it exposes an engine bug.
