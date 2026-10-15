# Cursor H6 resume checkpoint

Date: 2026-10-16 (emergency stop during H6-A4b audit)
Branch: `main`
Local HEAD: `fbf0c9b446379eea311c08256f0b932de6d6f2d9`
`origin/main`: `fbf0c9b446379eea311c08256f0b932de6d6f2d9` (matches local HEAD)
HEAD commit: `fbf0c9b4 feat(hexatonic): share audition playback and score preview`

H6-A4b code was not started. Nothing from that task was written, staged, committed, or pushed.

## Current stage

**H6-A4b — Blind Musical Audition, Comparison and Human Review. NOT STARTED in the tree.**

Status: audit only. Reading and search finished. No design was committed to code. No MusicXML examples, no blind-session module, no GUI, no tests, no changelog or roadmap edit for A4b.

Expected start HEAD was `fbf0c9b446379eea311c08256f0b932de6d6f2d9`. That is still HEAD.

## What the audit established

Reuse these. Do not add another audition engine, composition engine, or review system.

| Piece | Where | Use |
| --- | --- | --- |
| H6-A4 audition book | `engines/composer-os-v2/core/hexatonic/coreAuditionBook.ts`, `engines/composer-os-v2/scripts/writeH6CoreAuditionBook.ts`, `docs/h6-a4/` | Triad realisation, nearest-catalogue reading, decision-sheet prompts. 20-bar book stays. A4b wants four short clips, not a replacement of this book. |
| H6-A3 Core laboratory | `engines/composer-os-v2/core/hexatonic/coreLaboratory.ts` | 12 provisional pairs. Review format `hexatonic-laboratory-review` version 1. `artisticApproval` must stay false. |
| Review I/O | `engines/composer-os-v2/app-api/hexatonicProjectApp.ts` | `apiHexatonicSaveLaboratoryReview` / `apiHexatonicOpenLaboratoryReview`. Validator is `validateCoreLaboratoryReview`. |
| H6-B0 player | `apps/composer-os-app/src/score/ScoreAudition.tsx`, `ScorePreview.tsx`, `playbackSequenceFromMusicXml.ts`, `apps/composer-os-app/src/playback/playbackEngine.ts` | One Tone.js transport. Play already stops the previous run. No new synth. |
| Laboratory GUI | `apps/composer-os-app/src/hexatonic/HexatonicLaboratory.tsx`, mounted from `HexatonicEnginePage.tsx` | Extend this section. Detail view (candidate select, analysis, KEEP / REFINE / REJECT, one score) must stay available outside blind mode. |
| Phrase generator | `phraseGeneration.ts` `generateHexatonicPhrase` | Existing scalar / WPS phrases only. Catalogue ids. Not the 12 provisional pairs. Use for concealed references. |
| Human-review pattern | `apps/composer-os-app/src/evaluation/ReviewPanel.tsx` | BMEF dashboard already uses a blank human decision (ACCEPT / REFINE / REJECT / FORK) and does not auto-decide. Mirror that discipline. Do not store Core reviews in the BMEF file. |

All 12 candidates have `commonTones === 0` (`hexatonicH6Laboratory.test.ts`). Do not write ties that claim two common tones. Moving-bass examples must show the real voice motion.

Four contexts, about 8–12 seconds: 4 bars of 4/4 at quarter = 80 is 12 seconds. Suggested split, not yet implemented:

1. Root pedal — bass holds the left-triad root; guitar states both triads.
2. Ambiguous harmony — bass rests (silent bass) so playback tests cover empty bass. Non-root pedal is the allowed alternative.
3. Moving bass — original bass motion, short guitar voice-leading, no fake common-tone holds.
4. Motif and return — original cell, variation, other triad as “outside”, opening cell returns.

Blind plan sketched, not coded:

- 4 sessions, 3 primary candidates each. All 12 ids once as primary.
- 1 concealed existing-catalogue reference per session (`generateHexatonicPhrase` or nearest catalogue triads). Not WWH album notes.
- 2 later repeat items (for example one from session 0 inside session 2, one from session 1 inside session 3). Repeats do not increase the unique count.
- Seeded shuffle. Persist seed, order, codes, and cursor on the laboratory review.
- Codes must not spell pitch names. Hide identity, pitch names, and `ScorePreview` until the answer is saved.
- Questions: distinct Yes/No/Unsure; compose Yes/Maybe/No; colour text. After reveal: guitar-playthrough note. Disposition ACCEPT / REFINE / REJECT / KEEP PROVISIONAL, manual only.
- Map ACCEPT onto the existing decision `KEEP` only when the human chooses it. KEEP PROVISIONAL stays provisional. Never set `artisticApproval`. No catalogue promotion on save, reload, or export.
- Extend version 1 by an optional `blind` object. Absent `blind` must still validate. Existing `distinct` / `useful` / `guitarPlayable` / `colour` / `decision` records must round-trip.
- Hidden-reference hits and repeat disagreements are listening evidence, not an automatic judgement.

Audio: H6-B0 saw Play/Stop UI only. If a human ear does not confirm sound, record **AUDIO NOT HUMAN-VERIFIED**. Do not mark audible sound PASS.

## Completed changes (this session)

None in the repository. No files were created or edited for H6-A4b before this checkpoint note.

## Files created or modified by H6-A4b

- Created by this stop: `docs/CURSOR-H6-RESUME-CHECKPOINT.md`
- No engine, app, test, changelog, or roadmap file was touched for A4b.

## Tests

Not run this session. No A4b assertions exist yet.

Do not treat earlier H6-B0 results as A4b proof. H6-B0 report (`docs/H6-B0-SHARED-AUDITION-AND-SCORE-PREVIEW.md`) said app and engine checks passed at that commit, and that sound was not heard.

A Vite dev server from the earlier H6-B0 visual check is still running:

- Terminal file `823929.txt`
- pid 81341
- `apps/composer-os-app` → `./node_modules/.bin/vite --host 127.0.0.1 --port 5173`
- started 2026-10-15T23:16:30Z, status running at checkpoint time
- This stop did not kill it.

An earlier hexatonic/BHL/pentatonic `tsx` loop (`823928.txt`, pid 80516) already succeeded. It is not running.

## Known errors and blockers

- No code error. The blocker is that A4b was interrupted before implementation.
- Desktop rebuild rule in `.cursor/rules/composer-os-desktop-rebuild.mdc` conflicts with the A4b brief. The brief wins: do not rebuild or install `/Applications/Composer OS Desktop.app`.
- BHL audition rule says MuseScore 4 for BHL. A4b says do not open Sibelius. Do not open either for this resume unless the next prompt says so.
- `apps/composer-os-app` `tsc` previously reported invalid characters in `src/components/mosaic-import/barryHarrisChordMelodyUi.ts`. Leave that file alone.
- Unrelated dirty files are not A4b work. Do not stage them.

## Git

- No A4b feature commit.
- No push in this session.
- Local `main` and `origin/main` both at `fbf0c9b446379eea311c08256f0b932de6d6f2d9` before the checkpoint document commit.
- Checkpoint document, if committed, is a separate docs commit. It is not the A4b feature.
- Recent history: `fbf0c9b4` H6-B0 shared audition, `25fa8f5b` H6-A4 audition pack, `e64bfdc1` H6-A3 laboratory.

## Uncommitted changes to preserve

Leave these dirty. They were already dirty at the start of the A4b prompt. Do not `git add` them, reset, clean, stash, or overwrite.

Modified:

- `BHL-BATCH-D-VERIFIED-FEATURES.md`
- `engines/composer-os-v2/tests/bhl/bhlBatchD.test.ts`

Untracked:

- `.DS_Store`
- `.cursor/rules/bhl-musescore-workflow.mdc`
- `.tmp-bhl-engrave/`
- `.tmp-bhl-manuals/`
- `.tmp-hexatonic-h3/`
- `.tmp-hexatonic-h4/`
- `.tmp-hexatonic-h5a/`
- `.tmp-hexatonic-h6a/`
- `.tmp-pentatonic-phase2e/`
- `.tmp-wwh-p8/`
- `BHL-DEVELOPMENT-CHECKPOINT-2026-10-13.md`
- `docs/MORPH_DQA_V0.1-PILOT.md`
- `docs/WPS_V1.5_CAPABILITY_GAP_AUDIT.md`
- `engines/composer-os-v2/scripts/bhlBatchDClosureExamples.ts`
- `engines/composer-os-v2/scripts/wwhEV2Liquid.ts`
- `reference-materials/`

The conversation-start git snapshot also listed app edits (`HexatonicLaboratory.tsx`, `BhlComposerPage.tsx`, `playbackEngine.ts`, score preview files, audition tests). Those are inside `fbf0c9b4`, not a dirty overlay. Do not revert that commit.

## Exact next steps

1. Re-read this file. Confirm `git rev-parse HEAD` and `origin/main`. Confirm the dirty list above is still unstaged.
2. Implement in small checkpoints, tests before each commit:
   - `coreContextExamples.ts` (or equivalent under `core/hexatonic/`): 12 × 4 MusicXML, guitar + upright bass, no TAB, tempo so each clip is about 8–12 seconds, silent bass on the ambiguous clip, no common-tone ties.
   - `blindAudition.ts`: seeded sessions, codes, repeats, references, evidence text, optional review payload.
   - Extend `validateCoreLaboratoryReview` so version 1 files without `blind` still pass, and a present `blind` block is checked. `artisticApproval` stays false.
   - Export from `core/hexatonic/index.ts`.
   - Blind mode inside `HexatonicLaboratory.tsx`. One `ScoreAudition` mounted at a time. `ScorePreview` only after save. Detail view remains.
   - Persist through the existing laboratory save/open API.
3. Tests: 48 valid reloadable scores; deterministic sessions; each candidate once as primary; reference concealment; repeat evidence; no identity in the pre-answer DOM; decision reload; existing H6 laboratory test; H6-B0 audition/preview tests; BHL, pentatonic, project regression that the prompt lists. Visual check of `#/hexatonic` in the browser. Audio: **AUDIO NOT HUMAN-VERIFIED** unless a person hears it.
4. Docs in the same feature commit as the code: `docs/CHANGELOG.md`, `docs/COMPOSER_OS_ARCHITECTURE.md`, `docs/COMPOSER_OS_ROADMAP.md`.
5. Commit and push to `origin/main` only after those checks pass. Scoped paths only. No `git add .`. No force-push. No Sibelius. No WWH source edits. No desktop app rebuild or install.
6. Stop. Do not start H6-B1, H6-B2, H6-B3, H6-B4, or H6-C.

## Remaining H6 roadmap

Done on `main` before this stop:

- H6-A1 audit
- H6-A2 catalogue mathematics
- H6-A3 provisional Core laboratory (12 pairs, none admitted)
- H6-A4 audition book and decision sheet
- H6-B0 shared `ScoreAudition` / `ScorePreview`

Not done:

- **H6-A4b** — this task. Blind listening, four contexts, comparison, human disposition. Resume here.
- **H6-B1** (deferred in `docs/H6-B0-SHARED-AUDITION-AND-SCORE-PREVIEW.md`): hexatonic colour integration, a separate audition-book player, instrument samples, pause on the shared player, any automatic KEEP. Do not start until A4b is finished and the next prompt says so.
- **H6-B2, H6-B3, H6-B4, H6-C** — not specified in code. The A4b prompt forbids starting them.
- H6-A1 also parked, still not started: TTE, Advanced admission, ALG-1–11, Practice Studio UI, desktop packaging.

Core rule that still holds: the 12 pairs stay `PROVISIONAL — NOT MUSICALLY APPROVED` until a human accepts one through the existing review workflow. Reload, export, and reopen must not promote them.

## Decisions that need approval

None were taken. These were only audit notes, not product choices:

- Store blind data as an optional field on `hexatonic-laboratory-review` version 1, instead of a new file format.
- When the human picks ACCEPT, set the existing decision to `KEEP`. KEEP PROVISIONAL leaves the candidate provisional.
- Ambiguous clip uses a fully silent bass so the audio test has empty bass on every candidate.
- Concealed references come from `generateHexatonicPhrase` on existing catalogue ids, not from WWH scores.

Change any of those if you want a different shape before coding resumes.
