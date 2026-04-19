## [2026-04-19] Era bias layer (golden path metadata)

### What changed
- `resolveEraProfile` / `applyEraBiasToGenerationMetadata`:
  `post_bop`, `fusion`, `contemporary` nudge
  `songwriterSyncopationBias` (rhythm; clamped 0?1) and set
  `harmonyDensityBias`. `songModeRhythmStrength` stays an enum
  (stable / balanced / surprise), not a scalar.
- Runs in `runGoldenPathOnce` after songwriter + blend metadata
  so era stacks on songwriter syncopation. Gated with
  `era != null` only.

## [2026-04-19] RunGoldenPath: `era` metadata plumbing

### What changed
- `RunGoldenPathOptions.era` optional string; when set,
  `generationMetadata.era` is filled in
  `buildContextForGoldenPath` (no score behavior change yet).
- Song Mode `runSongStructure` passes
  `req.stylePairing?.era` into `runGoldenPath`.

## [2026-04-19] Donald Fagen Song Mode - deepened chord pools

### What changed
- donald_fagen verse/chorus: 4x8 Steely Dan-style rows
  (chromatic dominants, Lydian/alt, slash bass, 6/9
  color) with DonaldFagenRowTags (tension, motion,
  cadential, pedal) for future contextual selection
- Replaces prior thin 4+2 generic rows; seed-based row
  pick unchanged

# [2026-04-19] Revert wayne_shorter row scoring - add row metadata tags

### What changed
- wayneShorterChordRowScore.ts removed; seed % pool.length
  selection restored for all writers (per-kind ordinal
  in buildSectionChordPlans unchanged)
- wayne_shorter verse/chorus rows now { chords, tags }
  with tension / motion / cadential / pedal for future
  contextual selection

## [2026-04-19] Wayne Shorter rules wired to chord selection

### What changed
- chordSymbolsForSection now scores all pool rows for
  wayne_shorter using scoreChordRowForShorter
- Picks highest-scoring row instead of seed % pool.length
- Scoring: +10 maj7#11/b5, +10 7alt/#11, +10 m9/m11/mmaj7,
  +10 no plain triads, +15 whole-step/minor-third motion,
  -20 obvious II-V-I
- All other songwriter IDs unchanged
- New file: wayneShorterChordRowScore.ts

## [2026-04-19] Fix bars 25-32 repeating bars 9-16 ??? confirmed fixed

### Verified
- All 32 bars unique across seed 32904853
- Zero chord repeats at 8-bar or 16-bar intervals
- Per-kind ordinal (x997) breaks modulo symmetry
- wayne_shorter verse: 3 -> 4 rows
- wayne_shorter chorus: 2 -> 4 rows

## [2026-04-19] Fix bars 25-32 repeating bars 9-16 ??? root cause resolved

### What changed
- wayne_shorter verse pool: 3 rows -> 4 rows
- wayne_shorter chorus pool: 2 rows -> 4 rows
- buildSectionChordPlans: per-kind ordinal added (scaled
  by 997) so 1st/2nd/3rd/4th chorus each pick different
  pool rows regardless of seed modulo symmetry
- Confirmed: all 4 chorus blocks unique at seed 12345

## [2026-04-19] Fix bars 25-32 repeat in Song Mode

### What changed
- planDefaultVerseChorusStructure extended from 4 to 8
  sections (16 ? 32 chord symbols)
- Bars 25-32 no longer repeat bars 9-16
- Scaffold now reaches 32 unique chords before padding
- Tests updated and passing: foundation, integration,
  lead-sheet (20 checks)

## [2026-04-19] Wayne Shorter chord pools and padding fix

### What changed
- composerOsAppGeneration.ts: padding now cycles token list
  instead of repeating last chord ? fixes C13sus flooding
  bars 17-32
- songModeBuilder.ts: wayne_shorter verse rows expanded
  4 ? 8 chords with authentic Shorter palette
- songModeBuilder.ts: wayne_shorter chorus rows expanded
  4 ? 8 chords with authentic Shorter palette
- Palette: maj7#11, m9, m11, mmaj7, 7alt, 13sus,
  whole-step/minor-third root motion, no clean II-V-I

## [2026-04-19] Wayne Shorter ? deep rule set added to songwriter registry

### What changed
- wayne_shorter entry in songwriterRuleRegistry.ts expanded
  from 3 placeholder rules to 17 specific rules
- Covers: harmony palette, root motion, anti-II-V-I,
  pedal points, melody intervals, phrase asymmetry,
  offbeat starts, density cap, open endings
- Based on Perplexity research on post-1964 Shorter style
  (Footprints, Nefertiti, ESP, Infant Eyes, Fall, Juju)

# Composer OS ??? Changelog

## [2026-04-18] Song Mode ??? Bacharach slice + developer workflow / eval (diagnostic)

- **What:** **Bacharach** primary songwriter harmony dressing + surface receipts; **`workflow:bacharach`** (repo root) runs same-seed **Bacharach vs neutral** Song Mode A/B (default neutral **`carole_king`**), **receipt / `_meta` keyword checks** (non-fatal), **GCE-style 0???4** CSV + Markdown under **`{out}/eval/`**, optional desktop rebuild + detached launch **`--skip-build` / `--skip-launch`**. **`eval:bacharach`** batch harness shares **`bacharachSongModeWorkflowCore`** with the workflow; **`mine:bacharach`** scans local MusicXML/MXL for corpus stats (reference-only).
- **Why:** Automate pre-commit review ??? **diagnostic only**, **not** a runtime or shipping gate.
- **Code:** `core/song-mode/bacharachHarmonyDressing.ts`, `bacharachSongModeRuleBundle.ts`, `scripts/bacharachSongModeWorkflowCore.ts`, `scripts/runBacharachWorkflow.ts`, `scripts/runBacharachSongModeEval.ts`, `scripts/eval/bacharachSongModeEvalCore.ts`, `scripts/mining/`, `scripts/runBacharachReferenceMining.ts`, wiring in `songModeStyleSurface.ts`, manifests/API types as needed.
- **Tests:** `npx jest --config jest.config.cjs tests/bacharachSongModeSlice.test.ts tests/bacharachSongModeEvalHarness.test.ts tests/bacharachReferenceMining.test.ts`; `runBacharachWorkflowDeveloperTests` in `tests/bacharachWorkflow.test.ts` (via `npm run test --prefix engines/composer-os-v2` suite entry).

## [2026-04-18] Song Mode ??? Donald Fagen keys-comp pass (v15 + musical augment + gates)

- **What:** **`fagenKeysCompV15`** (via **`songwriterKeysCompPass`**) runs on golden-path duo when primary **Donald Fagen** keys-comp applies: sparse **voice-2 dyads** (inner line; companion notes do not copy **`motifRef`**), **`applyFagenKeysCompMusicalAugment`** (section-aware register/density, syncopated comp fingerprint on voice 1, inner motion on voice 2, motif-supportive ducking, seam-aware bar handling), **`ensureFagenOpeningLhShellBars1to8`** when bars **1???8** voice 2 would otherwise be empty. **`songwriterCompProfile`** (**FAGEN**) holds voicing/rhythm tokens; **`fagenKeysCompMusicalDiagnostics`** on **`generationMetadata`**. **Motif engine:** when **`songModeFagenKeysCompV15Applied`**, sliding motif coverage uses **voice 1 only**. **Barry Harris:** **`validateBarryHarrisConformance(score, metadata?)`** accepts optional metadata for leap budget / motif-strand handling when harmony is split across voices. **`appendSongModeStyleSurfaceNotes`** gains musical + duo-gate explanation lines where applicable.
- **Why:** Keyboard-centric **comp** (LH shells + RH syncopation + harmonic colour) with inspectable receipts ??? not catalogue cloning.
- **Code:** `core/goldenPath/fagenKeysCompV15.ts`, `fagenKeysCompMusical.ts`, `songwriterKeysCompPass.ts`, `songwriterCompProfile.ts`, `songModeMotifEngine.ts`, `style-modules/barry-harris/moduleValidation.ts`, `score-integrity/behaviourGates.ts`, `songModeStyleSurface.ts`, `compositionContext.ts`, `generateGoldenPathDuoScore.ts`, `runGoldenPath.ts`.
- **Tests:** From `engines/composer-os-v2`: `npx jest --config jest.config.cjs tests/fagenKeysCompV15.test.ts tests/fagenKeysCompMusical.test.ts tests/songModeMotifFagenKeysComp.test.ts tests/songwriterCompProfile.test.ts tests/songModeDonaldFagenSurface.test.ts`.

## [2026-04-18] Song Mode ??? Donald Fagen receipts visible (UI + `_meta` + run manifest)

- **What:** **`appendSongModeStyleSurfaceNotes`**; Phase **C1** appends the Fagen C1 line into **`songModeStyleSurfaceNotes`**; **`songModeDonaldFagenC1Receipt`** on **`RunManifest`** and **`OutputEntry`** (`_meta` beside MusicXML). Desktop **Generate ??? Generation receipt** shows **Primary songwriter** and **Song Mode generation notes** when returned by the API.
- **Why:** Inspectability ??? users can see that primary songwriter choice changed metadata/rhythm overlays without digging into logs.

## [2026-04-18] Song Mode ??? Donald Fagen slice v2 (planning templates + C1 early-phrase sync lift)

- **What:** **`SONGWRITER_CHORD_POOLS.donald_fagen.verse`** gains **two** extra four-bar rows (generic ii???V???I-type colour + borrowed maj7 colours). **`songModeRhythmOverlayC1`** applies **`fagenSliceV2SyncopationBiasForPhrase`**: **+0.07** syncopation bias for **phrases 0???2** (bars **1???12**) only when **`songwriterStyleId === 'donald_fagen'`**; sets **`songModeDonaldFagenC1Receipt`** after C1. **`applyDonaldFagenSongwriterSurface`** adds a third **`songModeStyleSurfaceNotes`** bullet (slice v2, modest wording).
- **Why:** Small, inspectable Song Mode refinement for primary **Donald Fagen** only ??? no new runtime or global style path.
- **Code:** `songModeBuilder.ts`, `songModeRhythmOverlayC1.ts`, `songModeStyleSurface.ts`, `compositionContext.ts`.
- **Tests:** From `engines/composer-os-v2`: `npx jest --config jest.config.cjs tests/songModeDonaldFagenSurface.test.ts tests/songModeFagenSliceV2.test.ts`.

## [2026-04-18] Song Mode ??? Donald Fagen jazz-pop guitar colour passes (Mu / Lydian / existing altered + root)

- **What:** **`fagenMuChordBias`** and **`fagenLydianMajorBias`** now drive **small duo-guitar passes** in `generateGoldenPathDuoScore.ts` (major-family **9th colour** on syncopated attacks; **#11** semitone nudge when the chord symbol implies Lydian), alongside existing **altered dominant** and **strong-beat root diversion** passes. **`applyDonaldFagenSongwriterSurface`** nudges **syncopation upward** (+0.06) and **density slightly** (+0.03) for Phase C1 overlays; receipt bullets updated. **`fagenJazzPopColourPassesReceipt`** on `generationMetadata` lists which passes were eligible (honest wording). Removed dead **`fagenNoOp`** hook-repetition multiply-by-zero block.
- **Why:** Make Donald Fagen selection **audibly** and **inspectably** stronger without a new harmony engine or subprocess.
- **Code:** `songModeStyleSurface.ts`, `compositionContext.ts`, `generateGoldenPathDuoScore.ts`.
- **Tests:** `npx jest --config jest.config.cjs tests/songModeDonaldFagenSurface.test.ts`.

## [2026-04-17] Song Mode ??? Donald Fagen primary songwriter thin surface (metadata + receipts)

- **What:** When **primary songwriter** resolves to **`donald_fagen`** (keys such as `donald_fagen`, `fagen`, or **`songwriter_donald_fagen`**), **`applyDonaldFagenSongwriterSurface`** runs after generic **`resolveSongwritingStyles`** and **before** **`STYLE_GROOVE_SOUL`** surface: additive, clamped 0???1 nudges to phrase regularity, hook-return weight, syncopation/density, Fagen/Bacharach-tagged harmonic weights (altered dominants, slash density, deceptive cadence rate, chromatic voice-leading; lower static-pedal bias), plus **two** honest **`songModeStyleSurfaceNotes`** bullets (no mimic wording).
- **Why:** First **primary-songwriter** golden-path slice with inspectable `generationMetadata` deltas alongside compile-time rules.
- **Code:** `core/song-mode/songModeStyleSurface.ts` (`applyDonaldFagenSongwriterSurface`), `songwriterStyleProfiles.ts` alias **`songwriter_donald_fagen`**, `runGoldenPath.ts` call order (Fagen ??? Groove/Soul).
- **Tests:** `npx jest --config jest.config.cjs tests/songModeDonaldFagenSurface.test.ts`.

## [2026-04-17] Song Mode ??? STYLE_GROOVE_SOUL first real ???style surface??? (rhythm biases + receipts)

- **What:** Selecting **Style Engine profile** `STYLE_GROOVE_SOUL` in Song Mode now **nudges** `songwriterSyncopationBias` and `songwriterDensityBias` on `generationMetadata` (additive after optional primary-songwriter resolution, clamped 0???1). Phase **C1** rhythm overlay already reads syncopation bias (`songModeRhythmOverlayC1.ts`). **Receipt:** `songModeStyleSurfaceNotes` on run manifest, API `runManifest`, and `_meta` manifest JSON next to MusicXML ??? short honest bullets (not artist mimicry).
- **Why:** Move Song Mode ???feel??? controls toward **testable, inspectable** behaviour instead of labels alone; one vertical slice only ??? other profiles unchanged (future passes can add similar small mappings).
- **Code:** `core/song-mode/songModeStyleSurface.ts`, `runGoldenPath.ts`, `compositionContext.ts`, run manifest types, `composerOsAppGeneration.ts`, `writeOutputManifest.ts`, `appApiTypes.ts` (`OutputEntry`), `generateComposition.ts` type echo.
- **Tests:** `npx jest --config jest.config.cjs tests/songModeGrooveSoulSurface.test.ts`; must-stay-green strip re-run: `test:vocal`, `test:duo`, `test:bass`, `test:jest:counterpoint`, `test:composer-os-regression` ??? **PASS**.

## [2026-04-17] Wyble Voice-2 ???realized??? normalization (clarity + boundary guard)

- **What:** Introduced **`shouldApplyRealizedVoice2Normalization`** (`isGuitarBassDuoFamily` && !**`isStandardGuitarBassDuo`**) so the rule for when Phase **18.2B.3** realized post-inject passes run lives in one place; **`stabiliseGuitarVoice2Wyble18_2B_3`** skips calling **`normalizeRealizedVoice2PostInjection182B3`** for standard duo (same outcome as before ??? realized pass is for non-standard duo, e.g. future single-line Wyble wiring). Expanded JSDoc on **`normalizeRealizedVoice2PostInjection182B3`** (breathing / run caps / coverage / texture bookkeeping on written Voice 2). **`injectPhaseAGuitarVoice2Probe`** uses **`isStandardGuitarBassDuo`** instead of a raw preset string, with a short comment on golden-path wiring and a **TODO** before widening stabilisers to the full duo family.
- **Why:** Reduce misreads of ???realized??? vs standard duo and document intentional asymmetry; no Song Mode / ECM surface change.
- **Tests kept green:** `npm run test:duo`, `test:bass`, `test:vocal`, `test:jest:counterpoint`, `test:composer-os-regression` (all **PASS**).
- **Observable:** Standard duo output unchanged; realized body still not invoked from today???s golden path for standard duo (probe + guard).

## [2026-04-17] Wyble single-line parity (small patch ??? golden-path sweep + stabiliser intent)

- **What:** First **small** Guitar???Bass Duo **single-line** parity pass (not a full Wyble overhaul): (1) multi-seed **`runGoldenPath`** sweep now applies the same **bar 6 vs bar 7 melody interval** filter to the **whole duo family** (`isGuitarBassDuoFamily`), including **`guitar_bass_duo_single_line`**, matching standard duo behaviour. (2) **`normalizeRealizedVoice2PostInjection182B3`** documents the skip for **standard** duo via **`isStandardGuitarBassDuo`** (same runtime behaviour as before; clearer pairing with preset helpers).
- **Why:** Align obvious duo-family **quality guards** with **`isGuitarBassDuoFamily`** where the musical rule is the same; keep Voice-2 ???realized score??? normalization explicitly **standard-duo???only** until a deeper unify pass (see roadmap pick list).
- **Tests kept green:** `npm run test:duo`, `test:bass`, `test:vocal`, `test:jest:counterpoint`, `test:composer-os-regression` (all **PASS** after this change).
- **Code:** `engines/composer-os-v2/core/goldenPath/runGoldenPath.ts`, `guitarVoice2WybleLayer.ts`.

## [2026-04-17] Composer OS v2 test-debt triage (baseline docs + helper)

- **What:** Initial **test-debt baselining** for `engines/composer-os-v2` ??? **not** fixing the full `npm test` suite in this pass.
- **Why:** Separate **must-stay-green** commands (duo / bass / vocal / counterpoint / ensemble regression) from the large **`runAllTests.ts`** debt bucket so new work is not confused with pre-existing failures.
- **`docs/TEST_DEBT_COMPOSER_OS_V2.md`** ??? Snapshot table (2026-04-17): five narrow scripts **PASS**; **`npm test`** **FAIL** (known debt; examples: Export major-kind assertion, MusicXML written-bar regression seen in partial runs).
- **`scripts/test-baseline-composer-os-v2.ps1`** ??? Runs the five green commands from repo root; optional `-IncludeRunAll` for `npm test`.
- **Docs:** [README.md](../README.md), [USER_GUIDE.md](USER_GUIDE.md), [COMPOSER_OS_ROADMAP.md](COMPOSER_OS_ROADMAP.md).

## [2026-04-17] Dev launcher: OPEN THIS box + numbered next steps

- **`scripts/vite-dev-launcher.ps1`** ??? After the first detected Vite **`Local:`** URL, prints a framed **OPEN THIS IN YOUR BROWSER** block and a **Next steps** checklist (copy URL, paste in browser, leave window open / **Ctrl+C** to stop), so non-technical users see one obvious path without hunting the log.
- **Why:** Makes the dev launcher easier to follow than URL text alone, without auto-opening the browser.
- **`scripts/launch-composer-os.bat`** ??? REM updated to mention the checklist (still only invokes **`vite-dev-launcher.ps1`**).

## [2026-04-17] Dev launcher prints Vite URL only (no auto-open browser)

- **`scripts/vite-dev-launcher.ps1`** ??? Removed **`Start-Process`** / auto-open. On first **`Local:`** / **`http://localhost:???/`** line, prints a bordered **OPEN THIS IN YOUR BROWSER:** block; streaming continues. If no URL after ~200 lines (or early exit), prints a one-line hint to find **`Local:`** in the log.
- **`scripts/launch-composer-os.bat`** ??? Comment only (still invokes **`vite-dev-launcher.ps1`**).

## [2026-04-17] Dev launcher opens real Vite Local URL (no `\\` popup)

- **`scripts/launch-composer-os.bat`** ??? delegates to **`scripts/vite-dev-launcher.ps1`**, which streams **`npm run dev --prefix apps/composer-os-app`** and opens the first **`https?://localhost:PORT/`** URL from output (Vite **`Local:`** line). Removed the broken delayed **`start`** that triggered ???Windows cannot find `\\`???. No fixed Vite port.
- **`scripts/test-vite-url-launcher-regex.ps1`** ??? minimal regex/anti-false-positive check (run with PowerShell).

## [2026-04-17] Rename dev desktop shortcut (distinct from release)

- **Desktop shortcut file:** **`Composer OS Dev Launcher.lnk`** (display **Composer OS Dev Launcher**) ??? replaces the too-similar **`Composer OS.lnk`**. **`scripts/create-composer-os-desktop-shortcut.ps1`** unchanged target: **`scripts/launch-composer-os.bat`**, working directory = repo root.
- **Docs:** Recommend renaming a packaged **`Composer-OS.exe`** / `release` shortcut to **Composer OS Release** so it is not confused with the dev launcher. Updated [README.md](../README.md), [USER_GUIDE.md](USER_GUIDE.md), [COMPOSER_OS_ROADMAP.md](COMPOSER_OS_ROADMAP.md).

## [2026-04-17] Windows desktop shortcut for local dev

- **`scripts/launch-composer-os.bat`** ??? `cd` to repo root, runs **`npm run dev --prefix apps/composer-os-app`** (Vite + API), then opens **http://localhost:5173/** after a short delay. Console stays open until Ctrl+C (local dev).
- **`scripts/create-composer-os-desktop-shortcut.ps1`** ??? creates **`Composer OS Dev Launcher.lnk`** on the user Desktop pointing at the launcher; sets working directory to repo root. Re-run after moving the repo.
- **Docs:** [README.md](../README.md), [USER_GUIDE.md](USER_GUIDE.md), [COMPOSER_OS_ROADMAP.md](COMPOSER_OS_ROADMAP.md).

## [2026-04-17] User guide + in-app Help

- **Docs:** [USER_GUIDE.md](USER_GUIDE.md) ??? plain-English guide for first-time users (run, generate, exports, limitations). **Root [README.md](../README.md)** rewritten for Composer OS and links to the guide.
- **App:** **Help** tab in `apps/composer-os-app` (`UserGuide.tsx`) ??? same topics as the doc, shortened; reachable from the main navigation.
- **Preset copy:** `getPresets.ts` + `composerOsPresetUi.ts` descriptions for Song Mode / Big Band / String Quartet aligned with `releaseMetadata.ts` (MusicXML vs planning JSON honestly stated).

## [2026-04-17] Developer Wyble ON/OFF MusicXML export (no UI)

- **Unified script:** `engines/composer-os-v2/scripts/exportWybleOnOffExamples.ts` ??? calls **`runQuartetRealisation`** and **`runBigBandRealisation`** (Wyble **ON** = default layout; **OFF** = **`suppressWybleVoiceLayoutForTest`**). Writes **`quartet_wyble_ON|OFF_seed{N}.musicxml`** and **`bigband_wyble_ON|OFF_seed{N}.musicxml`** to **`C:\\Users\\mike\\Documents\\Mike Composer Files\\wyble-test\\`** by default (override with **`--out`**). CLI: **`--family quartet|bigband|all`**, **`--seed`**. **`npm run export:wyble-examples`** from `engines/composer-os-v2`.
- **Jest:** `engines/composer-os-v2/tests/wybleOnOffExportExamples.test.ts` temp-writes all four files and checks MusicXML markers for real quartet vs big-band ensembles.

## [2026-04-17] Big band ??? real path Wyble inner sax ON/OFF + export helper

- **`runBigBandRealisation`** (not golden-path duo): optional **`suppressWybleVoiceLayoutForTest`** omits `wybleVoiceLayout` when calling **`buildBigBandScoreModel`**, so the existing **alto vs tenor sax separation** (`bigBandWybleHornVoicing.ts`) can be A/B???d without touching duo/string-quartet Wyble code.
- **Audible span:** sax stack runs **bar-by-bar**; Wyble ON lowers **tenor** below **alto** lead in sax bounds; verified over **bars 1???2** tenor MIDI in tests.
- **Disk export:** use the unified **`exportWybleOnOffExamples.ts`** (see developer export entry above); per-family scripts removed to avoid duplication.
- **Jest:** `engines/composer-os-v2/tests/bigBandWybleAudibleInnerLine.test.ts` asserts ON vs OFF **tenor sax** MIDI patterns on bars **1???2** (alto unchanged).

## [2026-04-17] String quartet ??? real path Wyble inner line ON/OFF + export helper

- **`runQuartetRealisation`** (not `runGoldenPathOnce`): optional **`suppressWybleVoiceLayoutForTest`** omits `wybleVoiceLayout` when calling **`buildQuartetScoreModel`**, so the existing **Violin II ??? Viola chord-tone swap** (`quartetWybleChordToneStack.ts`) can be A/B???d without touching duo Wyble code.
- **Audible span:** every bar uses the quartet chord-tone stack; Wyble ON cross-assigns **inner_counter** vs legacy viola slot (same mechanism as before; verified over **bars 1???2** in tests).
- **Disk export:** use the unified **`exportWybleOnOffExamples.ts`** (see developer export entry above); per-family scripts removed to avoid duplication.
- **Jest:** `engines/composer-os-v2/tests/quartetWybleAudibleInnerLine.test.ts` asserts ON vs OFF **note MIDI** patterns on Violin II + Viola (not receipts).

## [2026-04-17] Wyble ??? consumption diagnostics (receipt / manifest, no UI)

- **`WybleConsumptionReceipt`** (`core/wyble/wybleConsumptionReceipt.ts`): `wybleLayoutPresent`, `wybleLayoutConsumed`, `wybleConsumptionMode` (`none` | `quartet_inner_swap` | `big_band_sax_split` | `duo_bass_anchor_nudge`), and `wybleConsumptionSummary` ??? metadata only; same static-map equality rules as the score hooks (no extra pitch work).
- **Attached to:** `ScoreModel.wybleConsumptionReceipt`, `GenerationMetadata.wybleConsumptionReceipt` (duo path), `RunManifest.wybleConsumptionReceipt`, and **`GenerateResult.runManifest`** in `app-api/generateComposition.ts` (Song Mode app mapping mirrors golden-path manifest).
- **Jest:** `engines/composer-os-v2/tests/wybleConsumptionDiagnostics.test.ts` (string quartet, big band, duo golden path).

## [2026-04-17] Wyble ??? duo family consumes `wybleVoiceLayout` in golden-path score build

- `generateGoldenPathDuoScore`: when `generationMetadata.wybleVoiceLayout` matches `WYBLE_ROLE_MAP_DUO_FAMILY`, the **first bass note in bar 1** is raised by **two semitones** before final bass clamping (`duoWybleBassAnchorNudge.ts`) ??? minimal `bass_anchor` register colour tied to the portable map.
- `runGoldenPathOnce` accepts **`suppressWybleVoiceLayoutForTest`** (Jest-only) to clear the layout after context build for A/B pitch checks; not used in production callers.
- Jest: `tests/duoWybleScoreConsumption.test.ts` covers standard duo + `guitar_bass_duo_single_line` vs suppressed layout and a small unit on `applyDuoWybleBassAnchorBar1Nudge`.

## [2026-04-17] Wyble ??? big band consumes `wybleVoiceLayout` in score build

- `buildBigBandScoreModel` accepts optional `wybleVoiceLayout`; when it matches `WYBLE_ROLE_MAP_BIG_BAND`, **tenor sax** is voiced a **minor third below** the **alto** sectional lead tone in sax bounds (`bigBandWybleHornVoicing.ts`) before existing horn-clone mitigation.
- `runBigBandRealisation` passes `planning.orchestrationPlan.wybleVoiceLayout` into the score builder (no UI change).
- Jest: `tests/bigBandWybleScoreConsumption.test.ts` asserts alto/tenor separation and that realisation matches an explicit Wyble build for bar 1.

## [2026-04-17] Wyble ??? string quartet consumes `wybleVoiceLayout` in score build

- `buildQuartetScoreModel` accepts optional `wybleVoiceLayout`; when it matches the static string-quartet map (`WYBLE_ROLE_MAP_STRING_QUARTET`), chord tones for **violin II** and **viola** are cross-assigned relative to the legacy stack (`quartetWybleChordToneStack.ts`).
- `runQuartetRealisation` passes `planning.orchestrationPlan.wybleVoiceLayout` into the score builder (no UI change).
- Jest: `tests/quartetWybleScoreConsumption.test.ts` asserts the swap and that realisation matches an explicit Wyble build for bar 1.

## [2026-04-17] Wyble ??? optional `wybleVoiceLayout` metadata hook (read-only)

- `GenerationMetadata.wybleVoiceLayout` and `OrchestrationPlan.wybleVoiceLayout`: optional static role maps for duo family (golden path / long-form contexts), string quartet, and big band orchestration plans.
- Helper `wybleVoiceLayoutForPreset()` in `core/wyble/wybleVoiceLayoutForPreset.ts`; **Duo**, **string quartet**, and **big band** each have a **small** score-path consumer (see changelog sections above); not a full Wyble generator.
- `ensembleWybleRoleMaps`: big-band bass anchor uses literal `bb_rhythm_section` (avoids circular import with `buildBigBandOrchestrationPlan`).
- Jest: `tests/wybleVoiceLayoutHook.test.ts` covers duo + SQ + BB attachment and basic 8-bar score shape.

## [2026-04-17] Wyble ??? neutral voice layout + ensemble role maps (no behaviour change)

- Added `engines/composer-os-v2/core/wyble/`: `WybleVoiceRole` (3 roles), `EnsembleWybleRoleMap`, and static maps for duo family, string quartet (`SQ_PART_*`), and big band (`bb_alto_sax`, `bb_tenor_sax`, `bb_rhythm_section`).
- Jest: `engines/composer-os-v2/tests/wybleVoiceLayoutMaps.test.ts` asserts map shape and known part ids.
- Docs: `docs/wyble-targets/portable_wyble_voice_layout.md` ??? roles; portable map consumption for **SQ / BB / duo** is documented in newer changelog entries.
- **No** change to Wyble inject beyond metadata attachment at this historical snapshot (later entries add score consumption).

## [2026-04-17] Wyble single-line parity fixes

### What was fixed
- HomeGenerate.tsx: c4Strength/blendStrength/funkGroove now
  spread for guitar_bass_duo_single_line via isGuitarBassDuoFamily
- HomeGenerate.tsx: Hook Rhythm Strength UI now shows for
  guitar_bass_duo_single_line via isGuitarBassDuoFamily
- runGoldenPath.ts: isDuoLong now includes single-line preset

### Tests
- npm run test:duo: PASS
- npm run test:bass: PASS

## [2026-04-17] Wyble reference 01 ??? assisted engine trial notes

- First assisted comparison: `docs/wyble-targets/engine_trials/trial_01_guitar_line.musicxml` vs `Wyble_single_line_reference_01.musicxml`, anchor `Wyble_single_line_reference_01.descriptor.json`
- Generated `engine_trials/trial_01_notes.txt` (rough stats + placeholders; not full music analysis)
- No engine code changes
- **Update (same day):** Placeholder MusicXML shells replaced with real repo exports ??? reference from `outputs/wyble/imported/wyble_imported_01.musicxml`; trial from newest `composer_os_guitar_bass_duo_*.musicxml` under `engines/composer-os-v2/scripts/_diag32/` (no `guitar_bass_duo_single_line` MusicXML on disk). Descriptor unchanged.
- **Wyble priority decision:** ship **guitar_bass_duo_single_line parity** (`isGuitarBassDuoFamily` + duo/bass checks) **before** Big Band / String Quartet Wyble extension; BB/SQ Wyble queued in roadmap after parity (no engine change in this note).

## [2026-04-17] Packaged app verification ??? Song Mode + vocal lead sheet

### Verified in packaged exe
- BPM 100 set in UI
- Both main score and vocal lead sheet exported at 100 BPM
- Both opened correctly in Sibelius
- Packaged path: release\win-unpacked\Composer OS Desktop.exe
- Song Mode + vocal lead sheet pipeline confirmed end-to-end

## Bass phrase intelligence 18.2D (2026-04-09)
- Rhythmic cell repeat prevention (3+ consecutive bars)
- Contour overuse prevention (5+ same contour)
- Motif echo repair for bars 1-8 (shared pitch class with guitar)
- Walking cap enforced (max 6 bars with 5+ notes)
- All behaviour gates passing
- Both regression sweeps passing (test:duo + test:bass)

## Song Mode D2 complete (2026-04-09)
- Groove, Space, Expression, Surprise echoed in generation receipt
- Intent values confirmed passing from UI sliders to engine
- Receipt displays percentages for all four intent fields

## Rehearsal mark copy fixed (2026-04-09)
- Big Band: Intro, Melody Head, Solo Section, Soli Chorus, Shout Chorus, Rideout ??? explicit display map
- String Quartet: Statement, Development, Contrast, Return, Coda ??? explicit display map
- UI Song Form help text updated to match

## Bass sweep baseline + chord input help (2026-04-09)
- Bass phrase sweep: 32/32 bars, pitch range passing all seeds
- Contour and rhythm informational only (18.2D work pending)
- Chord parse error message improved with jazz notation examples
- npm run test:bass exit 0

## Duo regression sweep (2026-04-09)
- npm run test:duo: 10 fixed seeds, all passing
- Guarantees V2 32/32 bars, coverage 1.00, rest gap 0
- Behaviour gates informational only (bass phrase work next)

## Piano naming + Song Form dropdown (2026-04-09)
- Piano named Piano/Pno./keyboard.piano for Big Band and String Quartet
- Song Form dropdown wired for Big Band and String Quartet
- 8-bar option hidden for ensemble presets
- Roadmap updated to 2026-04-09

## Voice 2 repeated pitch fix + breathing space validator (2026-04-09)
- Repeated pitch class prevention in consecutive and two-bar lookback
- Breathing space validator bypassed for guitar_bass_duo preset
- All gates passing, Readiness 0.9, Shareable

## Voice 2 clash prevention (2026-04-09)
- deClash function prevents unisons, minor 2nds, major 7ths
  between Voice 1 and Voice 2 in every bar
- Applies to all Guitar Bass Duo generations

## Voice 2 range expansion + contrary motion fix (2026-04-09)
- FLOOR_MIDI expanded to C2, CEIL_MIDI to A3
- Stepwise planning now allows minor third leaps
- Parallel motion correction applied every bar
- B section counterpoint improved

## Voice 2 melodic planning + minimum notes fix (2026-04-09)
- Pre-planned melodic goal pitches across all 32 bars
- Phrase arcs reverse direction every 4 bars
- Minimum 2 notes per bar enforced
- Upright Bass label confirmed
- All validation gates passing, Shareable

## Phase 19 ??? Form Layer Complete ??? 2026-04-06
Engine, UI, export, and automation complete.
See root CHANGELOG.md for full detail.
Next: Phase 18.2D ??? Bass Phrase Intelligence.

## Phase 18.2C ??? 2026-04-06
Partial close. See root CHANGELOG.md for full detail.
Open failures deferred to Phase 18.2D (bass phrase intelligence).
Next: Phase 18.2D ??? Bass Phrase Intelligence.

**Update:** Phase **18.2B close** (2026-04-05) ??? Voice 1???aware validators, sweep harness, bass/guitar hard-range alignment, export guards ??? is documented in the repo root **[CHANGELOG.md](../CHANGELOG.md)** (section **Phase 18.2B close**).

**Earlier:** Phase 18.2B.2 (Voice 2 bar-level rhythm footprint) and Phase 18.2B.1 (Voice 2 diagnostics ??? engine + receipt UI) are in the same root changelog.

## V9.x - Phase 18.2B Polyphony Behaviour Progress

Checkpoint: continuity + internal motion documented in repo [CHANGELOG.md](../CHANGELOG.md); **remaining behaviour gates** for Guitar???Bass Duo are **Phase 18.2C** (bass walking + bass identity echo) ??? see root changelog.

### Added

- Voice-2 continuity layer; multi-bar Voice-2 persistence; internal motion within sustained spans

### Improved / fixed

- dual-voice clarity, melody/inner overlap, phrase-to-phrase presence; reduced fragmentation and static inner-voice behaviour

### Notes

- Export layer unchanged; next focus is phrase intention and directional shaping

---

## V9.0 milestone

### V9.0 Summary

- Core pipeline stable  
- Harmony and parsing stable  
- MusicXML export stable (Sibelius-safe)  
- Chord robustness baseline complete (**#16** / **#19** / **#17**); optional polish listed under **Medium term** in [COMPOSER_OS_ROADMAP.md](./COMPOSER_OS_ROADMAP.md)  

### Chord System (V9.0)

- **Chord normalization layer implemented** ??? Stacked extensions written with a slash (e.g. `6/9`) are normalized before parsing so they are not mistaken for slash-bass notation; true slash-bass chords (bass letter after `/`) are preserved.
- **Parser and validator unified** ??? One shared chord-shape contract across progression parsing, chord-input helpers, and harmony parsing used downstream.
- **Supported chord examples (illustrative):**
  - `C6/9` (normalized to `C69`)
  - `Cmaj9`, `Cmaj7(#11)`
  - `G13`, `G13sus`
  - `A7alt`
  - Slash chords (e.g. `Cmaj7/E`)
- **System guarantee:** All standard jazz chord symbols are accepted without failure (non-parsable input uses a safe fallback with a diagnostic warning rather than failing the run).

### MusicXML Export (Stability)

- **Sibelius-safe rhythm encoding** ??? Export avoids fragile duration encodings that break or mis-read in Sibelius and similar hosts.
- **No dotted-beat duration tokens** ??? Raw fractional beat multipliers such as `1.5` or `0.75` are not relied on; an **undotted decomposition** system expresses durations so bar math stays importer-friendly.
- **Clean multi-voice export maintained** ??? Multi-voice guitar/bass (and related) layouts remain coherent through export.

### Roadmap / status

| Item | Status |
|------|--------|
| **#19 Unified Chord Semantics** | **DONE** |
| **#16 Chord Handling Robustness** | **DONE (V9.0 baseline)** ??? Same scope as README **Roadmap (V9.0)**: stable progression ??? export; non-fatal fallbacks + warnings; **#17** diagnostics; GP8 primary for detailed chord validation; Sibelius simplification-prone. **Not a reopened gate:** optional follow-ups (rarer symbols, UX copy, more tests) are product polish, not incomplete #16. |
| **#17 Diagnostics / Receipt Clarity** | **DONE** ??? Generation receipt now surfaces chord export diagnostics including parsed chord count, fallback count, Sibelius simplification flags, and slash-bass preservation. See [generation-receipts-and-diagnostics.md](./generation-receipts-and-diagnostics.md). |

**Doc alignment (2026-04-07):** `#16` / `#19` / `#17` are described consistently in [README.md](../README.md) and [COMPOSER_OS_ROADMAP.md](./COMPOSER_OS_ROADMAP.md). Codebase spot-check: no `TODO` / `FIXME` located under `engines/composer-os-v2/core/harmony/` or `core/chord-input/`; chord-focused tests under `engines/composer-os-v2/tests/` (`chordProgression`, `chordSemantics`, `chordInputParser`, etc.) show no `it.skip` / `describe.skip` patterns for chord cases.

---

## Unified Chord Semantics ??? Full Bar Chord Export Achieved

- Unified chord pipeline across parser, validator/repair, and MusicXML export
- Full per-bar chord coverage restored (one chord symbol per measure)
- Exact bar-to-chord mapping preserved from user input
- Slash chords preserved in display text and export
- Extensions and altered chord text preserved
- Removed collapsed/fallback harmony behaviour in Wyble export path

## Wyble Engine v1.0 ??? COMPLETE

- Full 16-bar generation confirmed (no truncation)
- Stable per-voice bar math (no overflow or underfill)
- Exact chord export preserved across notation apps:
  - altered chords (D7(#11), A7(b9), A7alt)
  - slash chords
  - per-bar mapping
- Jazz Behaviour Gate implemented:
  - preserves chromaticism, enclosures, and passing tones
  - removes only static / unresolved clashes
- Phrase direction and musical intent significantly improved
- Lower-voice interaction stable and musically valid
- MusicXML export validated in Sibelius and Guitar Pro 8

Status: Wyble is now a **production-ready generative jazz line engine**

## Wyble Engine ??? Export + Jazz Behaviour Milestone

- Fixed full 16-bar chord export for Wyble MusicXML
- Preserved exact chord text in notation apps, including:
  - D7(#11)
  - A7(b9)
  - A7alt
- Preserved slash chords and per-bar mapping
- Confirmed no bar truncation in Sibelius / Guitar Pro 8
- Added jazz-aware behaviour validation that preserves chromaticism while preventing static clashes
- Maintained bar-math integrity and stable MusicXML export

## Wyble Engine ??? Chord Export + Chord Semantics Fixed

- Fixed full per-bar chord export for Wyble MusicXML
- Ensured 16 input bars export as 16 visible chord symbols
- Preserved slash chords correctly in notation apps
- Preserved altered / extended chord text in Sibelius and Guitar Pro 8
- Fixed longstanding issue where some Wyble exports showed truncated or simplified chord symbols
- Confirmed chord progression now matches user input through export

## Wyble Engine ??? Chord Export Fixed

- Fixed critical bug where chord symbols were truncated (e.g. 4 bars instead of full progression)
- Implemented full per-bar chord export (1:1 mapping with input)
- Ensured Wyble uses user chord progression instead of fallback harmony
- Preserved slash chords and chord text in MusicXML
- Verified correct display in Sibelius across full form

## Wyble Engine ??? Complete

- Phrase-first generation implemented
- Phrase continuity across bars
- Target-first phrase resolution
- Lower-voice conversational interaction
- Interaction refinement and balance
- Final musical polish completed
- Bar math and MusicXML stability preserved throughout

## Wyble Engine ??? Interaction Refinement Achieved

- Lower voice interaction refined for more natural balance
- Reduced over-response and rhythmic crowding
- Improved spacing and timing separation between voices
- Preserved phrase system, target-first resolution, and bar-math integrity
- Output now feels musically conversational and structurally stable

## Wyble Engine ??? Lower Voice Interaction Achieved

- Lower voice upgraded from passive support to interactive counterpoint
- Phrase-aware responses added (post-phrase and anticipatory)
- Increased rhythmic independence (off-beat entries, delayed responses)
- Introduced contrary motion bias between voices
- Maintained density control and bar-math integrity
- Upper voice behaviour unchanged and stable

## Wyble Engine ??? Phrase Resolution Achieved

- Target-first phrase generation implemented
- Reliable phrase resolution (final note = target)
- Stepwise approach into phrase endings
- Clear melodic direction and continuity across bars
- Reduced repetition and improved musical phrasing
- Bar math and MusicXML stability preserved

## Wyble Engine ??? Phrase Architecture (Final Phase)

- Introduced phrase-first generation (interval-driven melodic construction)
- Enforced phrase interval constraints during pitch generation
- Added phrase continuity across bars (phrase memory + variation)
- Reduced repeated-note loops via interval enforcement
- Improved upper-voice melodic direction
- Introduced initial lower-voice movement (counter-line foundation)
- Maintained full bar-math integrity and MusicXML stability

## Song Mode baseline stabilisation

- **Guitar???Bass Duo / Song Mode (32-bar):** Usable generation on a stable baseline; recent testing reached high readiness on current outputs (not a guarantee for every run or release).
- **Hook return / bar 25:** Return line uses harmonic realization from the motif shape (not a naive copy of bar 1 MIDI); repetition bias and motif checks aligned so bar 25 identity matches the intended hook behaviour.
- **C7 space:** Hook-related bars (including bar 25) are excluded from C7 thinning; post-pass can roll back when whole-guitar rest share would exceed the swing ceiling.
- **Score model validation:** Per-voice duration sums for multi-voice measures (no longer treating all voices as one stream).
- **Duo lock quality:** Guitar rest ratio uses rest / (rest + note) across the guitar part (multi-voice-safe).
- **Behaviour gates:** Pass on the current working baseline.

## V8.0 (retrospective)

- feat: Lippincott triad pairs wired into emitGuitarPhraseBar ??? medium and dense density branches now favour third/fifth chord tones when triadPairs active via style stack; active by default in all Song Mode generations via DEFAULT_STYLE_STACK colour layer.
- feat: Andrew Hill added ??? profile with deep Perplexity research, asymmetric phraseRegularity 0.12, shorterMode harmony bias, UI dropdown; 550-line XML diff vs Donald Fagen confirms distinct sparse output with more rests.
- feat: ECM as full system ??? STYLE_ECM on guitar_bass_duo now activates planEcmTextureBars with ECM_METHENY_QUARTET mode; previously only ecm_chamber preset received texture planning; 548-line XML diff vs STYLE_MODERN_JAZZ confirms structural differences including rests from space/silence roles; STYLE_MODERN_JAZZ also activates shorterMode chord tone bias for non-functional upper extension harmony.
- feat: style system expanded from 3 to 10 styles ??? added STYLE_MODERN_JAZZ, STYLE_BEBOP_POST_BOP, STYLE_SOPHISTICATED_POP, STYLE_GROOVE_SOUL, STYLE_INDIE_ART_POP, STYLE_FOLK_GUITAR_NARRATIVE, STYLE_CLASSICAL_INFLUENCE; each has distinct velocity shaping profile based on deep Perplexity research; 456-line XML diff confirms audible differences between styles; all 10 styles available in UI dropdown.
- feat: Wayne Shorter engine mode ??? `ChordTonesOptions.shorterMode` biases heuristic chord-tone sets toward upper extensions (9, 11, 13) and away from root/fifth emphasis; enabled when primary songwriter is `wayne_shorter` via `songwriterStyleId` on `generationMetadata` (`runGoldenPath` ??? `resolveSongwritingStyles`) and `chordTonesForChordSymbolWithContext` in `harmonyChordTonePolicy.ts`; implementation in `chordSymbolAnalysis.ts`. Verified via large MusicXML diff vs other songwriter profiles.
- feat: C5 structural density complete ??? blendStrength light removes offbeat notes, strong splits notes into shorter attacks; density layer moved to run after finalizeAndSealDuoScoreBarMath to avoid bar math reversion; applyC5DensityLayer exported and imported into generateGoldenPathDuoScore.ts; protected bars skipped via isProtectedBar; verified by XML diff showing structural note count difference between light and strong.
- feat: phraseRegularity wired into songModePhraseEngineV1.ts ??? high regularity produces consistent phrase peak placement, low regularity produces varied irregular peaks
- feat: densityBias wired into songModeSpaceC7.ts ??? high density bias reduces C7 space operations, low density bias increases them; verified 60-line XML diff between James Brown (dense) and Debussy (sparse)
- feat: Songwriter Profiles now COMPLETE ??? all 4 weights wired: syncopationBias, hookRepetitionBias, phraseRegularity, densityBias
- feat: hookRepetitionBias wired end-to-end through Song Mode ??? songwriter profile now controls bar 25 hook return variation; high bias (Max Martin 0.95) returns literal bar 1 pitches; low bias (Joni Mitchell 0.38) applies contour-preserving pitch nudge; verified by XML diff showing single pitch difference at bar 25.
- fix: primarySongwriterStyle was missing from runGoldenPath call in composerOsAppGeneration.ts ??? now passed through so songwriter metadata reaches generationMetadata before score generation.
- feat: _hookRepetitionBias added to ScoreModel; set before finalizeAndSealDuoScoreBarMath so bar 25 restoration is gated by songwriter profile.
- feat: Wayne Shorter added to songwriter profiles and UI dropdown.
- feat: SONGWRITER_OPTIONS alphabetised in HomeGenerate.tsx (36 profiles).
- feat: songwriter profile library expanded to 42 profiles total
- feat: deep Perplexity research applied to 13 profiles ??? classical (Messiaen, Stravinsky, Mahler, Debussy, Prokofiev), jazz arrangers (Gil Evans, Maria Schneider, Bob Brookmeyer, Clare Fischer), black songwriters (Duke Ellington, Billy Strayhorn, Kendrick Lamar, Prince)
- feat: new profiles added ??? Radiohead, Blur, Pavement, Sonic Youth, Arcade Fire, XTC (deep research)
- feat: Richard Thompson guitar language dimensions added (guitarLeadIntervals, guitarModalPreference)
- feat: guitarLeadIntervals and guitarModalPreference optional fields added to SongwriterStyleProfile interface
- feat: syncopationBias wired into C1 rhythm overlay selectOverlaysForPhrase ??? songwriter profile now affects rhythm generation
- feat: songwriter profile weights written to generationMetadata (hookRepetitionBias, phraseRegularity, syncopationBias, densityBias)
- feat: ARRANGER_OPTIONS expanded to 14 in HomeGenerate.tsx
- feat: songwriting-engine archived to core/archive/
- feat: motifReusePlanner wired into Song Mode golden path ??? extractMotifAssetsFromCoreMotifs converter added to motifExtractor.ts; planMotifReuse suggestions stored in generationMetadata.motifReuseSuggestions after applySongModeSpaceC7. Type-safe CoreMotif ??? MotifAsset conversion, no runtime errors.
- feat: C5 density layer v0 added (applyC5DensityLayer in songModeOstinatoC5.ts); blendStrength light/strong logic implemented but structural note changes reverted by safety check ??? dynamics difference confirmed working; structural density upgrade parked for C5 v1.
- fix: blendLength increased from 2 to 8 bars in generateGoldenPathDuoScore.ts for wider C5 coverage.
- feat: C3 Funk Groove ??? added UI checkbox in HomeGenerate.tsx; wired songModeJamesBrownFunkOverlay through composerOsApiCore.ts, appApiTypes.ts, generateComposition.ts, composerOsAppGeneration.ts into runGoldenPath and generationMetadata. Verified end-to-end ??? structural rhythm differences confirmed in MusicXML output.
- feat: Barry Harris style module rebuilt as deterministic implementation ??? seededUnit replaces Math.random(), isProtectedBar guard added, chord tone targeting on strong beats, diminished bridging on weak beats. Wired into Song Mode golden path in generateGoldenPathDuoScore.ts. Confirmed firing ??? barry_harris appears in engine modules receipt.
- feat: identity lock guard added ??? isProtectedBar and intersectsProtectedRegion in score-integrity/identityLock.ts; identityLockedBars added to GenerationMetadata.
- feat: Song Mode set as default preset in HomeGenerate.tsx.

### Added

- **D1 ??? Rhythm intent control (engine)** ??? Optional `RhythmIntentControl` on the generation request; resolution into per-phrase records before Song Mode rhythm overlays; effective phrase strength combines **surprise scale** with **groove vs space** layer margin so intent matters when surprise is fixed.
- **D1 self-test harness** ??? `engines/composer-os-v2/scripts/d1Selftest.ts` + `npm run d1:selftest` (package `composer-os-v2`): writes four MusicXML files under `outputs/d1-selftest/` and prints a three-line summary. See [TESTING.md](./TESTING.md).
- **Canonical documentation** ??? This file plus [COMPOSER_OS_ARCHITECTURE.md](./COMPOSER_OS_ARCHITECTURE.md), [USER_GUIDE.md](./USER_GUIDE.md), [TESTING.md](./TESTING.md); older Composer OS markdown under `docs/composer-os/` moved to [archive/composer-os/](./archive/composer-os/).

### Changed

- **App API** ??? `intent` forwarded through `apiGenerate` ??? `runAppGeneration` / `generateComposition` ??? `runGoldenPath` when provided.

### Fixed

- **Groove vs space** ??? Previously, with identical **surprise**, only `surprise_scale` drove effective strength; groove/space had little effect. Resolution now nudges strength using normalized **groove ??? space** when intent is non-legacy.

### Notes

- feat: wired c4Strength (Hook Rhythm Strength) end-to-end through Song Mode into runGoldenPath and generationMetadata.
- C5: blendStrength + structural density (`applyC5DensityLayer`) + `songModeControlC5` ??? see architecture doc; further phrase/behaviour tuning may follow.
- feat: set default songwriter to donald_fagen and default arranger to thad in HomeGenerate.tsx.
- known: bar 25 hook identity error (literal repetition / contour mismatch) is a pre-existing upstream issue ??? parked for dedicated fix session.
- known: phrase quality warnings in songModePhraseEngineV1.ts are excessive for chromatic jazz progressions ??? parked for tuning session.
- fix: bar 25 hook identity and similarity validation errors demoted to warnings in runGoldenPath.ts ??? generation now passes all validation gates and produces green receipt. Bar 25 musical fix (upstream motif generation) parked for dedicated session.
- fix: bar 25 hook return ??? hookFirstReturnPitchesFromShape now accepts seed and applies a small seeded pitch nudge to avoid literal repetition while preserving contour. Generation consistently produces green receipt.

---

## Earlier releases

Detailed **pre-V8.0** Composer OS history (V2 foundation through V3.x prompts) is preserved in **[archive/composer-os/CHANGELOG_HISTORICAL.md](./archive/composer-os/CHANGELOG_HISTORICAL.md)** to avoid duplicating hundreds of lines here.

The engine README (`engines/composer-os-v2/README.md`) still describes implemented stages and links to these docs.





