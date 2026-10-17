# Solo Piano capability and evidence ledger

Status: technically verified draft. Not musical acceptance.

| Item | Value |
| --- | --- |
| Repository | `/Users/user/Documents/DEVS/creative-engines` |
| Branch | `main` |
| HEAD | `51e170692272643ecff7bcfb6ccd461767a2d731` |
| `origin/main` | same commit |
| Commit subject | `feat(composer-os): add general piano composition and GUI` |
| Research baseline | `824d99b241df3db9a72d47f91f659e1aa312aa1c` |
| Research file | `research/Solo-Piano-Musicians-Guide-Research-and-Manual-Design-V1.0.md` |
| Date | 2026-10-17 |

The research file said General Piano was absent. On this commit it is present in `engines/composer-os-v2/core/piano/generalPianoWriter.ts`, `app-api/pianoCompositionApp.ts`, `app-api/pianoCompositionPersist.ts`, and `apps/composer-os-app/src/pages/SoloPianoPage.tsx`.

## What was run

- `docs/manuals/solo-piano-musicians-guide-v1.0/build-examples.ts` called `apiComposePianoV1` and `persistPianoComposition`, then copied files into `examples/`. It did not change engine code.
- The running web page at `http://127.0.0.1:5173/solo-piano` was opened. Piece choices, General Piano controls, and one **Generate** were observed.
- That Generate wrote `/Users/user/Documents/Mike Composer Files/Solo Piano/general-piano-v1-seed76018-8bars-80bpm.musicxml` and the matching `.mid`. SHA-256 matched `examples/general-c-8-seed76018-q80.musicxml` and `.mid`:

```text
2bbb1e7199210e7f8b6c09826a72001d9e03004849b142ff928eebc3666293ef  musicxml
099a56073dbcd19eb94450a82c88d1afa5ed06c6d82213c9b859f71234fa7f95  midi
```

- A direct API probe had already written that same official filename before the button press. The button press replaced it with the same bytes.
- Sibelius was not opened. Cubase was not opened. The files were not heard.

The on-screen header still read `Build 2026-10-17T21:44:20.598Z · git 824d99b`. The controls and the generated file matched the newer source. The stamp was stale relative to HEAD.

## Paths

| Path | Verified behaviour |
| --- | --- |
| Piano V1 fixture — 8 bars | 8 bars, quarter = 64, fixed chords `Dm9 Dm9 Cmaj7 Dm9 Fmaj7 Cmaj7 Dm9 Dm9`. Inner voice on: 45 attacks. Off: 44. Seeds 76018 and 76020 match. Seed 76019 differs in the bar 4 left hand and the bar 7 held note. Grid 30 seconds. Last MIDI release 28.125 seconds. No pedal. |
| Coffee Run — Variation — 24 bars | Fixed written harmony. Seeds 76018 and 76019 match. Inner on: 110 attacks, 44 pedal events. Inner off: 108 attacks, 44 pedal events. Grid and last release 90 seconds. |
| General Piano Composition V1 | 8, 16 or 24 bars. Tempo integer 48–120. Centre C or Am. One parsed chord per bar. Integer seed. 4/4 only. No inner-voice control. Checked files have no pedal. |

## General Piano checks

| Check | Result |
| --- | --- |
| Three seeds, same chords | 76018, 76019 and 76020 differ |
| Same seed, two progressions | Pitches differ. Bar 1 bass C3 versus F3 |
| C major versus A minor settings | Pitches differ. Signatures: major and minor, both fifths = 0 |
| 8 / 16 / 24 at tempo 80 | Grids 24 / 48 / 72 seconds. Attack counts 49 / 102 / 152. Bar 1 matches. Later material does not |
| Tempo 64 versus 80, same miniature | Pitch lists match. Grids 90 versus 72 seconds |
| Hands | Right-hand voice and left-hand voice differ. No voice 2 in General Piano files |
| MusicXML / MIDI | Persist oracle passed. MIDI note counts matched sounding attacks |
| Refusals | Non-integer seed, 12 bars, tempo 47 / 121 / 64.5, centre D, metre 3/4, chord `Cxyz`, study given 16 bars, Coffee Run given tempo 72 |

## Chord spellings used in the guide

Accepted by `parseGeneralPianoChord`: `Cmaj7`, `Am7`, `Dm7`, `G7`, `Fmaj7`, `Em7`, `E7`, `Am`, `F`, `Dm`, `C`, `G`, `Bbmaj7`, and the Coffee Run spellings `C/E`, `Am(add9)`, `Fmaj9`, `G6sus2`, `Dm9`, `Am9/E`, `Cmaj7/E`, `Fmaj7/A`, `Bbmaj7(#11)`, `C(add9)/E`, `Fmaj7(add9)`, plus `Am9`.

Rejected in the same call: `Cxyz`, `C maj7`, `CMaj7`, empty string.

## Output names

Study and Coffee Run: `piano-v1-fixture-seed{seed}-{inner|no-inner}` and `coffee-run-variation-seed{seed}-{inner|no-inner}`.

General Piano: `general-piano-v1-seed{seed}-{bars}bars-{tempo}bpm`.

Harmony and tonal centre are not in the General Piano name. Repeating seed, bars and tempo overwrites both MusicXML and MIDI.

The live web API in this session wrote under `/Users/user/Documents/Mike Composer Files/Solo Piano/`. Read the path on the page. Do not treat that folder as the only possible output root.

## Cross-module

Piano source does not call Song Mode, BHL, Pentatonic, Hexatonic, Riff Generator, quartet, big band, ECM, profiles, Stage C or Stage D.

No end-to-end piano-to-orchestra run was performed. Classifications in the guide stay PARTIAL / UNVERIFIED or FUTURE ONLY. Importer probes from the research commit were not repeated.

## Not claimed

Engraving quality, MIDI playback, physical playability, Finder confirmation for **Open output folder**, and artistic quality.
