# Pentatonic Options V2 — Final Report

REPO: `/Users/user/Documents/DEVS/creative-engines`
BRANCH: `macos-launcher-verification`
FINAL COMMIT: `cf940f7b75fb647cdac520ddd52e67a72bff67e7`
DEV 6 RELEASE COMMIT: `5eae25f83707118b9a4b3fb88b3fc45361c884ee`
DEV 6 TAG: `pentatonic-dev6-release` (unchanged, still `5eae25f83707118b9a4b3fb88b3fc45361c884ee`)
V2 TAG: `pentatonic-options-v2-release` at `cf940f7b75fb647cdac520ddd52e67a72bff67e7`
REMOTE MAIN TIP: `9851f44cb8d744f082c3cbf84c268627c2f743a3`

V1 ARCHIVE PATH: `/Users/user/Documents/DEVS/Pentatonic-Options/ARCHIVE/Pentatonic-Options-V1-FROZEN-2026-10-07/`

V2 SOURCE PATH: `/Users/user/Documents/DEVS/creative-engines/apps/pentatonic-options-v2/`
V2 APP PATH: `/Users/user/Documents/DEVS/creative-engines/apps/pentatonic-options-v2/dist/Pentatonic Options V2.app`
DESKTOP APP PATH: `/Users/user/Desktop/Pentatonic Options V2.app`

## ARCHITECTURE

One pentatonic engine. V2 is UI, practice workflow, and `engines/composer-os-v2/core/pentatonic/practiceFacade.ts`.

Authoritative functions:

- `analyzePentatonicScore`
- `formatPentatonicScoreMap`
- `buildPentatonicMusicContext`
- `recommendPentatonicsFromRegion`
- `listPentatonicColourResources`
- `getPentatonicColourResource`
- `evaluatePentatonicColour`
- `planAutoColor`
- `realisePentatonicPhrase`
- `transformCell`
- `realiseQuartalComp`
- `realiseQuartalLine`
- `assessGrounding`
- `manualCollection`
- `comparePentatonicCandidates`
- `orderCompareCandidates`
- `evaluateGce`
- `exportScoreModelToMusicXml`

Adapter added: `practiceFacade.ts`, re-exported from `core/pentatonic/index.ts`.

No second MusicContext, pentatonic engine, phrase engine, GCE, MusicXML exporter, colour registry, or path solver.

Dev 7 seams are named and not implemented: `GRADED_OUT`, `PIVOT_LINK`, `FIELD_WALK`, `PARENT_EXTRACTION`, `BIMODAL_DUO`.

## FEATURES

- Practice: default mode. Categories HOME / CONTINUITY, HOLD_FIELD, RESEAT, CELL_LINEAGE, OUTSIDE / RETURN, TRITONE_PAIR, QUARTAL_COMP, QUARTAL_LINE, ANSWER_BASS, SUPPORT_BASS, STRUCTURAL_SILENCE, NO_PHRASE, NONE. Difficulties SPARSE, INTERMEDIATE, EXPANDED. Default SPARSE, centre C, continuity.
- Analyse: manual context via `recommendPentatonicsFromRegion`, or read-only MusicXML via `analyzePentatonicScore`.
- Auto Color: Dev 6 intention vocabulary with musician labels. No new behaviour.
- Motif: `transformCell` with original, rotation, transposition, M-DEG, M-NEAR. Default M-DEG.
- Phrase: `realisePentatonicPhrase`.
- Compare: `comparePentatonicCandidates`, cap 3, order plan / alternative / silence. GCE does not sort.
- Next Example: increments a deterministic variation on the same context, category, difficulty, and lineage transforms.
- History: in-memory session rows. Back, next, regenerate.
- Favourites: session toggle. Export selected favourites as one practice sheet.
- Field browser: reads `listPentatonicColourResources`.
- Legacy colour wheel: optional practice view. Exact Dev 6 matches stay mapped. Major 7 Color has no exact centre match and is labelled PRACTICE VIEW.
- Custom collection: five distinct pitch classes, session only, CUSTOM unless it matches a registry resource.
- Score input: existing MusicXML import. Source file is not written.
- Export: existing MusicXML exporter. Electric guitar, no TAB.
- MuseScore open: `open -a "MuseScore 4"`.
- Practice sheet: 2–8 examples, one MusicXML file.

## V1 AUDIT

RETAIN

- Double-click desktop practice app
- Centre selection
- Sparse short studies
- Custom five-note collection
- Optional five-position colour-wheel exploration, as a practice view
- MusicXML export
- One-window workflow

REPLACE

- Python definitions, recommendation, phrase writer, and MusicXML writer
- V1 recommendation tiers, with Dev 6 compare
- V1 activity levels, with SPARSE / INTERMEDIATE / EXPANDED on the existing outside budget and operators
- V1 library as authority, with the Dev 6 colour registry

DEPRECATE

- V1 musical logic as a source of truth
- V1 PyInstaller app as the practice app to develop
- V1 scales that are not Dev 6 resources. They are not added to the registry.

V1 source and `/Users/user/Desktop/Pentatonic Options.app` were not deleted or replaced.

## TESTS

Re-run 2026-10-07, exit 0:

- `pentatonicOptionsV2.test.ts`: 29/29 PASS
- Dev 3.7 fingerprint (`pentatonicDev37.test.ts`): 10/10 PASS
- Dev 4 (`pentatonicDev4.test.ts`): 12/12 PASS
- Dev 5a (`pentatonicDev5a.test.ts`): 9/9 PASS
- Dev 6c (`pentatonicDev6c.test.ts`): 4/4 PASS

Covers authoritative imports, no local engine, all practice categories including SLIP, silence kinds, custom collection, read-only score, compare cap, GCE advisory order, MusicXML, MuseScore command, reset, next example, field browser, legacy wheel, session history, Dev 3.7 fingerprint, and desktop `--self-test`.

## REGRESSIONS

- Dev 3.7 fingerprint `cca0456e61a2a14e06f4aa14af0ae4bff902a46baa18ced000aec9ab146c91e6`: PASS (`pentatonicDev37.test.ts`)
- Dev 4: PASS (`pentatonicDev4.test.ts`, source hashes unchanged)
- Dev 5: PASS (`pentatonicDev5a.test.ts`, 9/9)
- Dev 6: PASS (`pentatonicDev6c.test.ts`, 4/4)

## REPLACEMENT TEST

- Desktop app process launched from `/Users/user/Desktop/Pentatonic Options V2.app`: PASS
- Self-test printed `SELF_TEST_OK HOME_CONTINUITY CELL_LINEAGE C4 F4 G4`: PASS
- Sparse example C4 F4 G4: PASS
- Field browser, silence categories, compare, next example, custom collection, read-only MusicXML: PASS in the automated suite
- WWH Orbit V2.1 analysed read-only (SHA-256 `911f07a6aa9deab3ddd5b7a97eff9bd9dc987a8f8cce5038201553a8b978b3db`). Practice cell from centre F, F minor pentatonic, motif `F Eb G# Bb`, chord `Fmaj7#11`, bass F. Notes `F4 D#4 G#4 A#4`. Not the C4 F4 G4 self-test.
- MusicXML: `apps/pentatonic-options-v2/reports/wwh-orbit-practice.musicxml`
- MuseScore 4 page 1 screenshot: `apps/pentatonic-options-v2/reports/musescore-page1.png`
- Page 1: four quarter notes present (F, D#, G#, A#). Treble clef. 4/4. Tempo 92. Chord `Fmaj7#11`. One full bar, no empty bar, no collisions. Key signature is the export default (no sharps or flats), which matches the file.
- Bundle id `com.thirdsun.pentatonicoptions.v2`

## FINAL STATUS

SOURCE OF TRUTH REMAINS COMPOSER OS: PASS
NO DUPLICATE ENGINE: PASS
DESKTOP LAUNCH: PASS
PRACTICE WORKFLOW: PASS
MUSICXML EXPORT: PASS
MUSESCORE VISUAL: PASS
SCREENSHOT: `apps/pentatonic-options-v2/reports/musescore-page1.png`
DEV 6 REGRESSION: PASS
V2 READY FOR GUITAR AUDITION

## FINAL VERDICT

PENTATONIC OPTIONS V2: PASS

Retiring V1 is a separate task. V1 was not deleted.
