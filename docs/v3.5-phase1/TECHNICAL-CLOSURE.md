# V3.5 Phase 1 — technical closure

Date: 2026-10-19
Baseline: `aa719509560baf686af2a9a388e227e7663bae25`
Branch: `main` (local HEAD matches freshly fetched `origin/main`)

Technical acceptance is the scope of this record. Artistic approval remains **PENDING**.

## Implementation

Opt-in `pianoChamber` branch of `orchestrate()` and `apiOrchestrate()`. Legacy reduction and E2 do not run when that command is set.

Verified capabilities in the focused test:

- Strict source capture of a 24-bar piano MusicXML score in 4/4, 3/4, or 6/8.
- Explicit refusal of a short score, 5/4, an unsupported tuplet, a missing tempo with no musician BPM, realisation before review confirmation, and omission of a still-locked event.
- Roles and phrase bounds stay proposals until `reviewConfirmed`.
- Developing mode keeps locked theme and bass anchors and may answer from a source cell with `displace`, `fragment-head`, or `augment`.
- Faithful mode redistributes the source and adds no derived answer.
- Ten existing chamber parts, one player each, through E2 placement. MusicXML plus sounding-pitch MIDI, including ties, tempo, and written transposition.
- Same seed repeats the same MusicXML.
- `musicalQualityScore` stays null. `musicallyApproved` stays false.

Wiring present in the staged sources: page `#/orchestrate`, `POST /api/piano-chamber`, desktop IPC `composer-os-api:piano-chamber`. This session did not launch the web app, the desktop app, or MuseScore.

## Tests rerun now

```text
node --max-old-space-size=4096 node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.json engines/composer-os-v2/tests/pianoChamber.test.ts
```

Result: `piano chamber phase 1 tests passed`. Operators observed: `displace`, `fragment-head`, `augment`.

The test writes example scores under `docs/v3.5-phase1/{lyrical,contrapuntal,rhythmic}/`, plus `operators.json` and `LISTENING.md`. Realisation MIDI uses an OS temporary directory (`piano-chamber-`), not the repository. SHA-256 of all 80 files already in `docs/v3.5-phase1` matched before and after this run.

Broad smoke, GUI, and external-application checks were not repeated.

## Historical evidence, not rerun

`docs/v3.5-phase1/external/import-report.json` records an existing MuseScore Studio 4.7.5 piano import (24 bars, 4/4, tempo 96 from the score, one source tie retained, ten export parts, no omissions). The MusicXML files beside that report are the retained artifacts of that check. This session did not open MuseScore.

No player review is recorded. This record does not claim practical playability.

## Listening boundary

Automated listening assessment was inconclusive because its comparisons were unreliable. That finding is neither artistic approval nor evidence that the music failed.

Listening audio, page images, PDFs, and the duplicate faithful/developing scores remain on this machine in the working tree at `docs/v3.5-phase1/listening/`. Those files are excluded from the commit. A clone will not contain them. `LISTENING.md` only lists open listening questions.

## Preservation

Solo Piano V1.1 tracked sources have no diff against the baseline. The existing integrity list `.tmp-piano-v1.1-musical-acceptance/HASHES.txt` matched its 37 in-folder files. The five hashes marked UNTOUCHED match `.tmp-piano-v1.1-stage-b/acceptance/` and `.tmp-piano-v1.1-stage-b/comparison/`. Those trees stay untracked and were not regenerated.

## Phase 2

Phase 2 harmonic controls are not wired. Phase 2 needs separate user authorisation.
