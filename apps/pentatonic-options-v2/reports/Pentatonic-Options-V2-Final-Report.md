# Pentatonic Options V2 — Final Report

REPO: `/Users/user/Documents/DEVS/creative-engines`
BRANCH: `macos-launcher-verification`
FINAL COMMIT: `89cfaad9fcdc7b072ece57c1c840262698d9e4af` (tests). Facade `4ce5318e`. App `ee3662a5`. This report is the following commit.
DEV 6 RELEASE COMMIT: `5eae25f83707118b9a4b3fb88b3fc45361c884ee`
DEV 6 TAG: `pentatonic-dev6-release` (unchanged, still points at the Dev 6 release commit)

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

`engines/composer-os-v2/tests/pentatonicOptionsV2.test.ts`: 29/29 PASS.

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
- MusicXML written to `/tmp/Pentatonic-Options-V2-practice.musicxml`: PASS
- `open -a "MuseScore 4"` returned 0 and MuseScore 4 process started: PASS
- MuseScore page was not visually inspected
- Bundle id `com.thirdsun.pentatonicoptions.v2`

## FINAL STATUS

SOURCE OF TRUTH REMAINS COMPOSER OS: PASS
NO DUPLICATE ENGINE: PASS
DESKTOP LAUNCH: PASS
PRACTICE WORKFLOW: PASS
MUSICXML EXPORT: PASS
MUSESCORE OPEN: PASS
DEV 6 REGRESSION: PASS
V2 READY TO REPLACE V1: YES

## FINAL VERDICT

PENTATONIC OPTIONS V2: PASS

Retiring V1 is a separate task. V1 was not deleted.
