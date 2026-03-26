# Composer OS Changelog

## V4.0 Composer OS — Prompt 1/8: Safe modulation layer + 32-bar Duo route (Phase 1/8)

- **Long-form route (opt-in)** — `resolveLongFormRoute` / `longFormRouteResolver.ts`: **`duo32`** only when preset is **`guitar_bass_duo`** and **`totalBars === 32`** (not the default). Default generation remains **8-bar** golden path unchanged.
- **Modulation (planning only)** — `core/modulation/`: **`ModulationPlan`** / **`generateModulationPlan`** guides section colour and contrast; **inactive** for 8-bar runs. **`modulationTransitions`** (transpose, pivot helpers) and **`validateModulationPlan`** keep plans coherent; harmony still flows through existing **`buildHarmonyPlanFromBars`** / golden path (wrap, not replace).
- **32-bar form** — **`buildDuoLongFormPlan`**: **A / A′ / B / A″** (bars 1–8, 9–16, 17–24, 25–32). **`buildDuoLongFormCompositionContext`** tiles builtin or **4×** custom 8-bar chords; metadata: **`longFormDuo`**, **`modulationPlanActive`**, **`totalBars`**.
- **Section reuse** — Motifs: **`placeMotifsLongFormDuo32`**; interaction: **`planDuoLongFormInteraction`**; quality: **`evaluateDuoLongFormQuality`** (extra soft score weight when long-form). **LOCK gates** for duo still evaluate **bars 1–8** when output is 32 bars (`sliceScoreToFirstEightBars` in **`behaviourGates`**).
- **API** — Optional **`longFormEnabled`** / **`totalBars`** on generate request; app can omit UI — resolver keys off **`totalBars === 32`** for duo.
- **Tests** — `tests/longFormDuo.test.ts` + suite in **`runAllTests.ts`**.
- **Summaries** — For Cursor handoffs, label **prompt N/8**, **phase name**, and **remaining master-plan phases** (2/8 … 8/8).

## V3.0 Guitar–Bass Duo — LOCK upgrade (motif, rhythm, interaction, GCE)

- **Motif-first duo path** — `generateMotif` with `duoLock` builds 2–4 beat cells using strong intervals (3rd/4th/5th/6th or chromatic enclosure) and non-uniform rhythms; **eight bar-level placements** per 8-bar form (`placeMotifsAcrossBars(..., duoLock)`).
- **Interaction** — Section B coupling adds **`bassForward`** for higher guide-tone weight on bass vs section A.
- **Gates** — `duoLockQuality.ts`: composite **GCE** (≥ 8.5 hard gate), guitar **rhythm anti-loop** (no >2 identical consecutive rhythm cells; dense unison rhythm with bass capped), **`duoMusicalQuality`** rest band (~8–45% guitar time).
- **Performance** — Non-ECM duo runs `applyPerformancePass` with **articulation** on before expressive feel.
- **Phrase authority** — Last-note pitch-class variety threshold relaxed slightly (≥3 distinct endings per 8 bars) so motif-forward lines still pass with Bacharach anchor bars.
- **Cleanup** — Removed stale checked-in **`motifGenerator.js` / `motifTracker.js`** (and **`motif.test.js`**) so runtime resolves **`.ts`** sources; avoids silent shadowing of new duo logic.

## V3.0 Generate UI — mode-driven form (Style Stack controls retired from Generate)

- **Generate screen** — Rewritten around **mode** (Guitar–Bass Duo, ECM Chamber, Song Mode, Big Band, String Quartet), **tonal centre**, **tempo**, **bars**, **variation**, **creative control**, and **title**. Duo/ECM MusicXML runs use a **fixed internal style stack** (Barry Harris primary, strong blend) — no user-facing module dropdowns or Style Blend on this screen.
- **Big Band** — UI exposes **arranger**, **era**, and **ensemble size**; a default songwriter id is supplied for the existing pairing API (not shown as a control).
- **Song Mode** — Songwriter, arranger, and era pairing unchanged in intent.
- **Removed** — Style Stack tab from main nav; **Style Stack** page file kept as legacy reference only (commented). Custom chord progression and part **locks** removed from Generate (duo uses built-in harmony path only).
- **Receipt** — Result summary leads with **mode** and **output type**; engine modules listed as plain ids.

## V3.0 app wiring — system check, outputs clarity, preset validation, folder fixes

- **One-click system check** — `POST /api/system-check` and IPC `composer-os-api:run-system-check` run Composer OS engine tests, retro tests, and `composer-os-app` tests from the repo root (with `COMPOSER_OS_REPO_ROOT` / `resolveComposerOsRepoRoot`). Diagnostics panel: **Run system check** + optional technical details. Set `COMPOSER_OS_DISABLE_SYSTEM_CHECK=1` to block.
- **Preset validation** — `apiGenerate` rejects unknown `presetId` before creating output dirs; HTTP `POST /api/generate` returns **400** for unsupported presets (no silent fallback to another preset folder).
- **Outputs list** — `listOutputs` infers preset from folder / artifact type; adds `modeLabel`, `outputTypeLabel`, `presetDisplayName`; legacy **Song Mode Compositions** folder still maps to `song_mode`. Song Mode output folder name is **`Song Mode`** under Mike Composer Files.
- **Outputs UI** — primary line: mode + output type + variation + path; filename secondary.
- **Open folder** — Windows: normalized paths for Explorer and Electron `shell.openPath`; `isPathUnderComposerRoot` is case-insensitive on Windows; forward-slash paths accepted.
- **Tests** — `systemCheck.test.ts`, extended `openOutputFolderGate.test.ts`.

## Prompt 5/5 — UX polish (mode copy, result summary, honest output labels)

- **Web app (`composer-os-app`)** — **`src/utils/generateUiCopy.ts`**: per-mode hints and **About this mode** cards (what it does, best for, output); **`describeOutputKind`** distinguishes planning vs lead-sheet-ready vs full MusicXML export.
- **Generate receipt** — **Result summary** panel after a run: mode, variation, optional key/tempo/bars, style pairing, ensemble size, creative level, confidence / experimental badge + short explanation (does not block output).
- **Terminology** — **Creative level** (replacing “Stability” as the label), **Total bars**, **Ensemble size (Big Band)**; demo button text avoids “seed”.
- **Tests** — **`generateUiCopy.test.ts`**, extended **`homeGenerateUi.test.ts`**.

## Prompt 4/5 — Desktop build + stable shortcut path

- **electron-builder** — Portable **`release/Composer-OS.exe`**, NSIS **`release/Composer-OS-Setup.exe`** (fixed names; semver stays in app metadata, not in filenames).
- **`install/logReleaseArtifactsCli.ts`** — After each package build, logs the absolute **release** folder and stable paths for portable, installer, and shortcut target.
- **`install/installRules.ts`** — Exported **`STABLE_PORTABLE_FILE_NAME`** / **`STABLE_SETUP_FILE_NAME`** aligned with `package.json` artifact names.
- **Prune** — Existing **`pruneOldPortableExes`** still removes legacy **`Composer-OS-Desktop-*-portable.exe`** / **`*-Setup.exe`** from `release/` only.
- **Shortcut** — **`installComposerOsDesktopIcon`** already targets **`Composer-OS.exe`**; no relink needed when rebuilding the same path.
- **Tests** — **`buildOutputContract.test.ts`** (stable `release/` dir, artifact names, logger); deploy script expectations include **`logReleaseArtifactsCli`**.

## Prompt 2/2 — Control + UX (variation, creative controls, ensemble, sessions)

- **`core/variation/`** — `variationTypes`, `variationAdapter` (`variationIdToSeed`, `seedToVariationDisplayToken`); UI can send **`variationId`** instead of exposing raw **`seed`**; engine still runs on a numeric seed.
- **`core/creative-controls/`** — `creativeControlResolver` (stable / balanced / surprise), **`mutationEngine`** (deterministic XOR nudges only), **`experimentalEvaluator`**; **`stable`** preserves prior behaviour when **`variationId`** and **`creativeControlLevel`** are omitted.
- **`GenerateRequest`** — optional **`variationId`**, **`creativeControlLevel`**; **`generateComposition`** uses **`resolveEffectiveGenerationSeed`**; **`RunManifest`** / **`OutputEntry`** carry optional variation + creative fields.
- **`core/candidates/`** — optional **`baseVariationId`** for candidate batches; **`CandidateEntry`** may include **`variationId`**.
- **`core/big-band/`** — **`bigBandEnsembleConfigTypes`** (`full_band` … `custom`), **`bigBandEnsembleApply`** (silence inactive horns, rebalance lead, **`bass_anchor`** on rhythm); **`assembleBigBandOrchestrationPlan`** accepts **`ensembleMask`**; **`runBigBandMode`** accepts **`ensembleConfigId`**, **`variationId`**, **`creativeControlLevel`**.
- **`core/sessions/`** — format **v4** optional **`variationId`**, **`creativeControlLevel`**, **`stylePairingSnapshot`**, **`bigBandEnsembleConfigId`**, **`lastOutputPath`**.
- **`core/presets-plus/`** — optional **`defaultVariationId`**, **`defaultCreativeControlLevel`**, **`defaultBigBandEnsembleConfigId`** on **`NamedPresetDefinition`**; merged in **`mergeNamedPresetIntoGenerateRequest`** / **`bigBandInputFromNamedPreset`**.
- **Tests** — `variationAdapter`, `creativeControlResolver`, `mutationEngine`, `experimentalEvaluator`, `bigBandEnsembleConfig`, extended **`sessionStore`**.

## Prompt 1/2 — Intelligence layer (Big Band + Songwriting + style pairing)

- **`BigBandRule.priority`** — registry rules carry **1–100** priority for merge/tie-break semantics.
- **`core/style-pairing/`** — `stylePairingTypes`, `stylePairingResolver`, `stylePairingValidation` (non-blocking; **confidenceScore** 0–1, **experimentalFlag**). Optional **`stylePairing`** on **`runSongMode`** / **`buildCompiledSong`** → `songwriting.stylePairingResolution` + light **section contrast** nudge; optional on **`runBigBandMode`** → **`stylePairingResolution`** + validation **warnings**.
- **Research paths** — optional **`COMPOSER_OS_RESEARCH_DIR`**: when set, **`BigBandResearch.md`** / **`Songwriting.md`** in that folder are used if explicit per-file env vars are unset (and the file exists).
- **Validation** — `schneider`: **warning** when density slices do not vary (texture-led flow); Song Mode checks pairing **confidence** in **[0, 1]** when present.
- **Tests** — `stylePairingResolver`, `songwriterResearchParsing` (alias of songwriting parsing suite).

## Prompt C/3 — Full ensemble realisation (Phase 3)

- **`core/voicing/`** — `voicingTypes`, `voicingProfiles`, `voicingPlanner`, `voicingValidation`, `ensembleHarmonyUtils` (register-aware spread vs cluster from section density).
- **Big Band** — `bigBandVoicingPlanner.ts`, `bigBandScoreBuilder.ts`, `runBigBandRealisation.ts`: planning → voicing → **ScoreModel** (four section parts, harmonic rhythm + rehearsal marks) → **`runEnsembleExportPipeline`** (same score-model → MusicXML path as duo: `validateScoreModel`, `validateStrictBarMath`, `exportScoreModelToMusicXml`, schema + bar-math checks).
- **String Quartet** — `quartetVoicingPlanner.ts`, `quartetScoreBuilder.ts`, `runQuartetRealisation.ts`: same pattern for four string parts.
- **`core/export/ensembleExport.ts`** — `runEnsembleExportPipeline` reuses existing exporter and gates (no duplicate exporter).
- **Module registry** — `big_band_realise`, `string_quartet_realise`.
- **Tests** — `voicingPlanner`, `bigBandRealisation`, `quartetRealisation`, `ensembleExport`; retro stage-exit gate for Big Band realisation export.

## Prompt B/3 — Song Mode completion (Phase 2 songwriting)

- **`core/song-mode/`** — **Lead melody** planning (`leadMelodyPlanner`, contour/phrase helpers, `melodyValidation`) with sparse note anchors, cadence bars, hook-return measure, chorus lift capped by singer profile.
- **Singer range** — `singerRangeProfiles` / `singerRangeValidation` (default **male_tenor**; placeholder ids for alto, baritone, soprano).
- **Lyric / prosody** — `prosodyPlanner`, `lyricPlaceholderPlanner`, `prosodyValidation`: syllable slots, stress placeholders, **Pattison / Webb / Perricone** alignment when author overlay is set.
- **`runSongMode`** — extended validation: compiled song + prosody + **lead melody shape** + hook-return consistency; **lead sheet** includes top-line events, **prosodySlots**, **voiceMetadata**.
- **Tests** — `leadMelodyPlanner`, `singerRangeValidation`, `prosodyPlanner`, `songModeCompletion`; retro stage-exit gate for Song Mode.

## Prompt A/3 — Reference / import intelligence (Phase 1)

- **`core/reference-import/`** — Types (`referencePieceTypes`, `importSourceTypes`, `behaviourExtractionTypes`, `referenceReuseTypes`); validation; **MusicXML** (first-part, regex-light), **MIDI** (SMF note-on extraction), **lead-sheet text** (via `chord-input`), **internal** adapter from `CompositionContext`; **`extractReferenceBehaviour`** + per-dimension extractors; **`applyReferenceInfluence`** (metadata hints per target mode — not cloning).
- **Sessions** — format **v3** supported; optional **`referenceSourceKind`**, **`referenceBehaviourSummary`**, **`referenceInfluenceMode`**, **`referenceInfluenceStrength`**.
- **Run manifest** — optional **`referenceSourceKind`**, **`referenceBehaviourSummary`**, **`referenceInfluenceMode`**, **`referenceInfluenceStrength`** on `RunManifest` / `createRunManifest`.
- **Tests** — `referenceImportTypes`, `musicXmlReferenceParser`, `leadSheetReferenceParser`, `referenceBehaviourExtraction`, `referenceReuseAdapter`; session v3 round-trip.

## Easy wins + workflow power pack (V3.0 usability)

- **`core/presets-plus/`** — Added **`songwriter_modern`**, **`chamber_development`**; optional **`densityBias`** on definitions; library now **10** named presets.
- **`core/sessions/`** — Session format **v2** (loaders accept **v1**); optional **`lastBestCandidateSeed`**, **`lastCandidateSelection`**, **`styleStackPresetId`**, **`continuationSourceRef`**, **`lastModeLabel`**.
- **`core/lead-sheet/`** — Modes **`big_band`** / **`quartet`**; **`sectionLabels`**; **`runBigBandMode`** / **`runStringQuartetMode`** return **`universalLeadSheet`** (planning placeholders).
- **`core/chord-input/`** — `chordInputParser`, `chordInputAdapter`, `chordInputValidation` (line blocks + pipe lines → harmony scaffold).
- **`core/motif-plus/`** — `motifExtractor`, `motifLibrary`, `motifReusePlanner`.
- **`core/continuation/`** — `continuationPlanner` + validation (same-mode metadata).
- **`core/regeneration/`** — `sectionRegenerator` + validation (locks-aware).
- **`core/style-stack-presets/`** — `styleStackPresetLibrary` (e.g. `bacharach_pattison_ecm`, `thad_bebop_swing`).
- **`core/performance-plus/`** — `densityControlAdapter`, `humanisationToggle` (metadata only).
- **`core/diagnostics/`** — Richer heuristic lines (big band shout, quartet texture, motif reuse, etc.).
- **Tests** — `chordInputParser`, `motifExtractorPlus`, `motifReusePlanner`, `continuationPlanner`, `sectionRegenerator`, `styleStackPresetLibrary`, `humanisationToggle`; extended session / named preset / universal lead sheet tests.

## Easy wins pack — named presets, sessions, candidates, diagnostics, universal lead sheet

- **`core/presets-plus/`** — `namedPresetLibrary.ts` (8 named presets), `namedPresetTypes.ts`, `namedPresetValidation.ts`; `mergeNamedPresetIntoGenerateRequest`, `songModeInputFromNamedPreset`, `bigBandInputFromNamedPreset`.
- **`core/sessions/`** — `sessionStore.ts` (JSON read/write), `sessionTypes.ts`, `sessionValidation.ts`.
- **`core/candidates/`** — `candidateGenerator.ts`, `candidateRanker.ts`, `candidateCompare.ts` (Duo/ECM triplet runs + score).
- **`core/diagnostics/`** — `diagnosticsBuilder.ts` (human-readable lines from validation/readiness).
- **`core/lead-sheet/`** — `universalLeadSheetTypes.ts`, `universalLeadSheetBuilder.ts`; optional **`universalLeadSheet`** on `generateComposition` result; **`runSongMode`** returns **`universalLeadSheet`**.
- **Tests** — `namedPresetLibrary`, `sessionStore`, `candidateRanker`, `diagnosticsBuilder`, `universalLeadSheetBuilder`.

## Prompt 6.5/7 — Song Mode songwriting research (styles, author overlays, hook intelligence)

- **Research file** — `engines/composer-os-v2/core/song-mode/data/Songwriting.md`. Optional env **`COMPOSER_OS_SONGWRITING_RESEARCH`** for an alternate path.
- **Parser** — `songwritingResearchParser.ts` extracts ENGINE RULES per songwriter, author, classical block, plus sections 4–9 (hooks, melody/harmony/lyric systems, minimum viable).
- **Registry** — `songwriterRuleRegistry.ts` (songwriters, authors, classical, foundational categories with effect types + priority + applicability).
- **Style system** — `songwriterStyleProfiles.ts`, `songwriterStyleResolver.ts` (primary + optional secondary + overlays); `authorOverlayResolver.ts`.
- **Planners** — `hookPlanner.ts`, `chorusPlanner.ts`, `melodyBehaviourPlanner.ts`; `applySongwritingRules.ts` attaches `SongwritingPlanningBundle` to `CompiledSong`.
- **`runSongMode`** — extended input; validation adds `validateSongwritingPlanning` + explicit-null primary style rejection; manifest hints include style fingerprint + rule count.
- **Tests** — `songwritingResearchParsing`, `songwriterRuleRegistry`, `songwriterStyleResolver`, `authorOverlayResolver`, `hookPlanner`, `songModeBehaviourEncoding`.

## Prompt 5.6/7 — Big Band research integration (rule engine, eras, bebop line metadata)

- **Research file** — `engines/composer-os-v2/core/big-band/data/BigBandResearch.md` (repo copy). Optional env **`COMPOSER_OS_BIG_BAND_RESEARCH`** points to an alternate path.
- **Parser** — `bigBandResearchParser.ts` extracts ENGINE RULES bullets (composers, eras, foundations, shout/riff/soli); invalid/short input fails safely.
- **Registry** — `bigBandRuleRegistry.ts` (composer / era / foundational / functional rule ids + effect types).
- **Era system** — `bigBandEraResolver.ts`; preset `bigBandPreset` adds `defaultEra: post_bop` and supported eras/composers in `presetTypes`.
- **Bebop** — `bebopLinePlanner.ts` sets continuous-line + chromatic-approach metadata when `era === 'bebop'`.
- **Application** — `applyBigBandRules.ts` produces `BigBandEnhancedPlanning` (per-slice behaviour flags).
- **Validation** — `bigBandResearchDrivenValidation.ts` (swing density cap, bebop line rules, basie space, thad shout, schneider transitions).
- **`runBigBandMode`** — extended input/output; default behaviour unchanged for `post_bop` + no composer.
- **Tests** — `bigBandResearchParsing`, `bigBandEraSystem`, `bebopLinePlanner`, `bigBandRuleApplication`.

## Stable desktop build filenames (Composer-OS.exe)

- **electron-builder** — Portable output is always **`release/Composer-OS.exe`**; NSIS installer **`release/Composer-OS-Setup.exe`** (no `${version}` in filenames). In-app version still comes from **`package.json`** (patch bump before build is unchanged).
- **Prune** — After build, legacy **`Composer-OS-Desktop-*-portable.exe`** and **`Composer-OS-Desktop-*-Setup.exe`** files in `release/` are removed when present; stable names overwrite each build.
- **Verify** — `desktop:package` ends with **`verifyStableBuildOutputCli.ts`**: confirms the portable exe exists and (on Windows) launches briefly.
- **Shortcuts** — A permanent path to **`…/release/Composer-OS.exe`** no longer needs updating each release.

## Prompt 7/7 — Web app shell, app/API boundary, desktop path, V1 baseline

- **App API** — `composerOsAppGeneration.ts` routes `apiGenerate` by preset: duo/ECM → `generateComposition`; `song_mode` → `runSongMode` (JSON); `big_band` / `string_quartet` → planning JSON only. Invalid `presetId` fails with a clear error (no stale `composerOsApiCore.js` shadowing TypeScript).
- **`scripts/startComposerOsAppApi.js`** — registers `ts-node` and requires `composerOsApiCore.ts` so plain `node` works without a duplicate compiled `composerOsApiCore.js`.
- **Web UI** — `apps/composer-os-app`: preset-first flow, five modes, seed, generate, outputs, diagnostics with `supportedModes` + product version (`releaseMetadata.ts`, `buildDiagnostics`).
- **Desktop** — existing Electron path unchanged; IPC uses shared `composerOsApiCore.ts`.
- **Tests** — `appShell`, `appApiBoundary`, `modeExposure`, `windowsPackagingPrep`, `outputUx`; `runAllTests` wired.
- **Docs** — README / DEV_NOTES / this file updated for V1 supported modes and limitations.

## Prompt 6/7 — String Quartet planning module (no quartet MusicXML yet)

- **`core/string-quartet/`** — Types, role mapping, form/texture/density planners, `buildQuartetOrchestrationPlan` / `assembleQuartetOrchestrationPlan`, quartet validation, **`runStringQuartetMode.ts`**.
- **Preset** — `string_quartet` (`stringQuartetMetadata`, guitar + bass stand-ins for manifests); **`getPresets`** lists it supported; output subfolder **`String Quartet Compositions`**.
- **Module registry** — `string_quartet_plan` (`orchestration` category, `orchestration_planning` stage).
- **`run-ledger`** — optional `stringQuartetFormSequence`, `stringQuartetOrchestrationReady`, `stringQuartetModuleIds`; `createRunManifest.js` synced.
- **`presetTypes`** — optional `StringQuartetPresetMetadata`.
- **`docs/composer-os/STRING_QUARTET_INTEGRATION_NOTES.md`** — reuse vs later work.
- Tests: `stringQuartetTypes`, `stringQuartetPlanning`, `stringQuartetValidation`, `stringQuartetMode`; `runAllTests` + module registry + output paths + ensemble profiles updated.
- **`app-api/getPresets.js`** and **`app-api/composerOsOutputPaths.js`** synced with `.ts` (Node may resolve `.js` first).

## Prompt 5/7 — Big Band planning module (no full big-band MusicXML yet)

- **`core/big-band/`** — Types (instrument sections, BB roles, plans), `bigBandFormPlanner` / `bigBandSectionPlanner` / `bigBandDensityPlanner`, `buildBigBandOrchestrationPlan` + `assembleBigBandOrchestrationPlan`, `bigBandValidation`, **`runBigBandMode.ts`**.
- **Preset** — `big_band` is a real planning preset (`bigBandMetadata`, guitar + bass stand-ins for manifests); **`getPresets`** marks it supported (planning path).
- **Module registry** — `big_band_plan` (`orchestration` category, `orchestration_planning` stage).
- **`run-ledger`** — optional `bigBandFormSequence`, `bigBandOrchestrationReady`, `bigBandModuleIds`; `createRunManifest.js` synced.
- **`presetTypes`** — optional `BigBandPresetMetadata`.
- **`docs/composer-os/BIG_BAND_INTEGRATION_NOTES.md`** — reuse notes vs separate engines (no heavy imports).
- Removed stale **`presets/bigBandPreset.js`** (could shadow TS and omit metadata).

## Prompt 4/7 — Shared orchestration layer (planning only; no Big Band / Quartet generation)

- **`core/orchestration/`** — Ensemble-agnostic types (`instrumentRole` / `textureRole`, `registerBand`, `densityBand`, `articulationBias`, `sustainVsAttack`), register/texture/density ownership planners, ensemble **family profiles** (duo, chamber, big_band, string_quartet, songwriting_lead_sheet), validation, ECM + Song Mode **compatibility** mappers, **`buildDuoOrchestrationPlan`** / **`buildChamberOrchestrationPlan`** (chamber reads `buildEcmChamberContext` metadata only — no ECM musical change).
- **Conductor / handoff / modules** — `orchestrationLayerMetadata.ts`, optional `orchestrationPlanningStage` on handoff map orchestration entry, optional `orchestrationPlanningNote` on register/density stages, optional `orchestrationPlanning` on `ModuleCapabilities`.
- Tests: `orchestrationCore.test.ts`, `orchestrationPlanner.test.ts`, `ensembleFamilyProfiles.test.ts`, `orchestrationCompatibility.test.ts`. No new generation modules for big band or string quartet yet.

## Prompt 3/7 — Song Mode structural integration (no golden path / ECM change)

- **`core/song-mode/`** — `songHookTypes`, `songStructureTypes`, `songCompilationTypes`, `leadSheetContract`, `songModeBuilder`, `songModeValidation`, **`runSongMode.ts`** (default + extended section plans, chord scaffolds, compiled song, lead-sheet-ready contract).
- **`module-invocation`** — `song_mode_compile` registry entry (`runSongMode`).
- **`run-ledger`** — optional `songHookId`, `songHookSummary`, `songLeadSheetReady`, `songwritingModuleIds`; `createRunManifest.js` synced.
- **`docs/composer-os/SONG_MODE_INTEGRATION_NOTES.md`** — asset audit + integration notes.
- Tests: `songModeIntegration.test.ts`, `leadSheetContract.test.ts`; no UI, no `songwriting_engine` import.

## Prompt 2/7 — conductor alignment metadata + Song Mode scaffold (non-breaking)

- **`core/conductor-alignment/`** — declarative conductor roles, stage→role map, compatibility ordering, handoff contract types + category map (no runtime rerouting).
- **`core/module-invocation/`** — optional `ModuleCapabilities` (`readsFrom`, `writesTo`, `compatiblePresets`, `stage`); static registry includes **`song_mode_scaffold`** (songwriting).
- **`core/song-mode/`** — section kinds expanded to **verse / pre_chorus / chorus / bridge**; metadata flags **melodyFirst**, **hookFirst**, **leadSheetReady**, **voiceType** (`male_tenor`); default planner still **verse / chorus / verse / chorus** (no harmony).
- **`run-ledger`** — optional manifest fields: `activeModuleCategories`, `presetType`, `songModeVoiceType`, `songSectionSummary` (existing runs unchanged when omitted). **`createRunManifest.js`** kept in sync with `.ts` so optional fields (and `ecmMode`) are present when Node resolves `.js` first.
- No musical runtime or ECM behaviour changes; no `songwriting_engine` import.

## Desktop packaging — auto version bump

- **`npm run desktop:package`** runs **`install/bumpDesktopVersionCli.ts`** first so `package.json` **patch** increments (`1.0.1` → `1.0.2` → …) before **electron-builder**. The portable artifact is always **`Composer-OS-Desktop-${version}-portable.exe`**, so each build writes a **new** file and avoids Windows locking the previous exe. Set **`COMPOSER_OS_SKIP_VERSION_BUMP=1`** to skip the bump (rare).
- After packaging, **`install/pruneOldPortableExesCli.ts`** keeps the **newest 3** portable exes in `release/` and deletes older ones (best-effort; failures do not fail the build).
- The web shell shows **`Composer OS - v{version}`** in the header when running inside the desktop shell (IPC), matching the Electron window title.

## Bacharach behaviour strengthening

- **Bacharach** validation uses shared **bacharachSignal** helpers: each section (A/B) must show chromatic colour, off–strong-grid placement, or rhythmic variety; fully diatonic + square lines fail; global chromatic density is capped.
- **Golden path** injects deterministic **anchor bars** (2 and 6) when Bacharach is active—chromatic neighbour + 3+5 asymmetry—so conformance matches generation without bar-math drift.

## Stabilisation + Bacharach visibility

- **Guitar–Bass Duo** golden-path generation is regression-tested across many seeds (default style stack and **Bacharach** primary) so **strict bar math**, **MusicXML round-trip**, and **bass metadata** gates stay green; the Generate screen lists loaded style modules by name (**Barry Harris**, **Metheny**, **Triad Pairs**, **Bacharach**) when the API returns them.
- **Bacharach** remains a first-class registered style module end-to-end (registry, `/api/style-modules`, UI selectors, receipts).

## Guitar–Bass Duo musical pass + Bacharach module

- **Guitar–Bass Duo** golden-path output is more musical: guide-tone–oriented bass lines (with staggered entries and quarter-safe rhythms), improved guitar phrasing (rests, dyad-style bars, stagger), A/B interaction via conversational downbeats, motif merge uses quarter-beat quantization for stable MusicXML bar math.
- **Bacharach** is a registered Composer OS style module (`bacharach`) with `moduleApply` / `moduleValidation`; it appears in the style-module list and Style Blend like other modules. Behaviour gates include **Bacharach conformance** when Bacharach is in the stack and **duo musical quality** checks (bass variety, guitar rest/onset spread, simultaneous downbeats).
- **Tests:** Stale `tests/styleModule.test.js` was removed so `ts-node` runs the TypeScript tests (avoids shadowing `styleModule.test.ts`).

## Output manifests (`_meta`)

- **Disk manifests** (`.manifest.json`) are stored under each preset folder’s **`_meta`** subfolder so user-facing folders (e.g. **Guitar-Bass Duos**) contain **only `.musicxml`**. Listing still reads metadata from `_meta` or from the legacy **next-to-MusicXML** path. **Open folder** unwraps `_meta` so Explorer opens the composition folder. On Windows, `_meta` is marked **hidden** (`attrib +h`) when creation succeeds.

## Automated desktop rebuild + smoke

- **Command:** `npm run desktop:rebuild-and-smoke` in `apps/composer-os-desktop` (or repo root: same name) runs: close stale `Composer-OS-Desktop-*-portable.exe` processes (Windows), `desktop:package`, resolve newest portable exe, verify `resources/ui` stamp, launch the exe, confirm the process stays up, compare UI `buildTimestamp` to the last successful run (stored in `.last-smoke-ui-timestamp.txt`). Prints **PASS** or **FAIL** with the blocking step — no fake success.

## Desktop packaging + score titles

- **Packaged folder actions:** `openFolderMain` loads **`resources/open-folder-helpers.cjs`** (esbuild bundle of `composerOsOutputPaths` + `ensureFolderForOpen`), not loose `engines/...` paths — fixes `Cannot find module ... composerOsOutputPaths.js` in the portable exe. `config.resolveOpenFolderHelpersBundlePath()` mirrors other bundled assets (`process.resourcesPath` + dev fallbacks).
- **Score titles:** Guitar–Bass Duo default work title is **Guitar-Bass Duo Study** (not “Golden Path Duo”). Optional **`title`** on generate requests flows through `runGoldenPath` → score model → MusicXML `<work-title>` → run manifest and disk manifest.
- **Try Another:** Runs a **full generation** immediately with a fresh hidden seed (same pipeline as **Generate**). Output filenames include timestamp and **seed** so rapid back-to-back runs never overwrite the previous file. After success, the **Generation receipt** and **Outputs** list update (custom `composer-os:outputs-changed` event + existing refresh trigger).

## Correctness gates (desktop, MusicXML, bass identity)

- **Desktop:** Open library / open file folder uses Electron **main** `shell.openPath` after `resolveOpenFolderTarget` (same rules as `apiOpenOutputFolder`). IPC handler is registered in `openFolderMain.ts` after the API bundle; structured result includes `openedPath` when successful.
- **Score model:** `validateStrictBarMath` (per-voice bar fill, no overlap) runs before export; golden-path guitar motif measures insert rests for leading gaps and merge sequential motif notes without overrunning the bar.
- **Export:** `validateExportedMusicXmlBarMath` re-validates measure duration sums per voice after export; generation fails if round-trip bar math does not match.
- **Guitar–Bass Duo bass:** Part/instrument name **Double Bass**, `instrument-sound` `pluck.bass.acoustic`, GM **midi-program 33** (see `guitarBassDuoExportNames.ts`).
- **Receipt:** “Passed” requires strict bar math, export round-trip, instrument metadata, and existing integrity/MX gates; `GenerateResult.validation` includes `strictBarMathPassed`, `exportRoundTripPassed`, `instrumentMetadataPassed`.
- **Performance pass:** Duration/bar structure unchanged (`performanceRules.ts`); articulation only.

## Style Blend (composer-facing controls)

- **Weights** UI replaced by **Style Blend**: primary (Strong / Medium / Light), optional secondary (Off / Light / Medium) and colour (Off / Subtle / Present) when those modules are selected. Values map to internal normalized weights in `mapStyleStack.ts` (`deriveRawWeightsFromAppStyleStack`). Legacy numeric `weights` in the API still work for tests; when both are sent, **Style Blend** wins.
- Generate uses **Try Another** (no raw seed field). Seed may still appear in manifests/diagnostics only.

## Desktop UX — outputs, bass export, variation UI

- Default output root: **`Documents\\Mike Composer Files`**, with preset subfolders (`Guitar-Bass Duos`, `Big-Band Compositions`, `ECM Chamber Compositions`). Folders are created as needed. `COMPOSER_OS_OUTPUT_DIR` overrides the root only. Listing, receipts, manifests, and **Open output folder** use the same canonical paths.
- Guitar–Bass Duo MusicXML exports **acoustic/upright bass** GM metadata (`midi-program` 33 in MusicXML; GM program 32), not vocal/choir bass.
- Main UI: no raw **Seed** field; **Try Another** re-rolls internal randomness.

## Desktop packaging (Windows exe)

- `npm run desktop:package` uses `CSC_IDENTITY_AUTO_DISCOVERY=false` and `win.signAndEditExecutable: false` so unsigned builds do not require **winCodeSign** extraction (avoids symlink privilege failures). Canonical artifact: `release/Composer-OS-Desktop-*-portable.exe`. `npm run verify:packaged-exe` fails if no portable exe exists. `desktop:self-test-install` = package → verify exe → UI + shortcut + launch.

## Desktop clean-room (IPC + new identity)

- Windows desktop product: **Composer OS Desktop**, `appId` `com.mikeb55.composeros.desktop`, portable `Composer-OS-Desktop-*-portable.exe`.
- Packaged app loads UI from disk (`loadFile`); engine access is **IPC only** via `desktop-ipc.bundle.cjs` + preload `invokeApi` — **no localhost** for the Electron shell.
- Web workflow unchanged: `startComposerOsAppApi` + HTTP for `npm run dev` in `composer-os-app`.
- `npm run desktop:clean-install` (aliases: `desktop:deploy`, `desktop:install`) packages the app, verifies the UI stamp, quarantines legacy shortcuts, refreshes **Composer OS Desktop.lnk** to the newest portable exe, and **launches the packaged app once** (summary: exe path, shortcut path, `Launched: yes`).

## Desktop shortcut deploy (Windows)

- `apps/composer-os-desktop/install/` — `desktop:clean-install` runs `desktop:package` then the TypeScript installer: verifies UI resources, scans shortcut locations, quarantines legacy Composer Studio / stale “Composer OS” / **Composer OS Desktop** `.lnk` files when the target is not the current portable exe, creates **Composer OS Desktop.lnk** on the desktop targeting the newest `release/Composer-OS-Desktop-*-portable.exe`, verifies the shortcut, and launches that exe once. Quarantined files go to `%USERPROFILE%\ComposerOsDesktop\shortcut-quarantine\`.

## Desktop UI bundle provenance

- `apps/composer-os-app` Vite build writes `composer-os-ui-stamp.json` (product id, name, shell version, timestamp, git commit, allowed page list).
- `apps/composer-os-desktop` deletes and recopies `resources/ui` on each UI build, verifies the stamp after copy, and Electron **main** refuses to load `http://127.0.0.1:…` until the on-disk stamp passes (wrong/stale bundles show a single error page with path and product id). Window title and in-app diagnostics show Composer OS identity, desktop version, and UI path.

## Desktop legacy quarantine

- `apps/composer-os-desktop` loads only `composer-os-app` UI (`copy-ui.js` → `resources/ui`) and the bundled Composer OS API. Electron `main.ts` uses one `BrowserWindow`, `setWindowOpenHandler` deny, navigation guard to non-localhost HTTP(S), `app.setName('Composer OS')`. No script runtimes or legacy app paths in Electron sources (enforced by `desktopQuarantine.test.ts`). Web shell is only Generate / Presets / Style Stack / Outputs plus Diagnostics panel — no Hybrid / Projects / Score tabs.

## Style modules (UI)

- Style modules are listed from the engine registry (`getStyleModules`, `GET /api/style-modules`); diagnostics includes the same `styleModules` list. Generate and Style Stack load from the API (no silent empty dropdowns); if the list is empty or the request fails, the UI shows: “No style modules available — check backend.” Generation passes the selected primary/secondary/colour stack into the golden path so run manifests and receipts match the request.

## Desktop product hardening

- Explicit startup state machine in Electron main (`booting` → … → `ready` / `fatal_error`, plus generation phases); renderer reads state via preload; fatal startup shows a single-window error page with clear copy.
- Central app API constants (`composerOsConfig.ts`) and `GET /api/diagnostics` (port, canonical output path, writable flag, version).
- Web UI: expandable **Diagnostics** panel; prominent **Generation receipt** after each run (paths, manifest, preset, style stack, readiness/MX, pass/fail, open folder); friendlier errors when the API or output folder fails.
- `openOutputFolder` validates folder existence/writability; `GET /api/output-directory` returns `displayPath` (Windows-friendly).
- Engine tests: multi-run generation smoke (5 runs), diagnostics payload, friendly error copy; desktop tests: packaging smoke, startup helpers.

## V2.0 Foundation

- Core architecture: conductor, rhythm engine, primitives, instrument profiles
- Score integrity gate, MusicXML export, readiness scoring, run ledger
- Presets: guitar-bass duo, ECM chamber, big band

## Golden Path

- First end-to-end generation: 8-bar guitar-bass duo
- Score model, chord symbols, rehearsal marks
- Full pipeline: preset → feel → harmony → integrity → export → manifest

## Stage 2 Musical Core

- Section roles (statement, development, contrast, return)
- Section-aware register maps and density curves
- Guitar/bass behaviour planners
- Rhythm engine deepening
- Behaviour gates: rhythm, texture, harmonic integrity, section contrast

## Stage 3 First Intelligence

- Motif tracker: generate, vary, place across A/B
- Barry Harris style module
- Motif-driven melody, bass motif echoes

## Stage 4 Style System

- Metheny style module
- Triad Pairs module
- Style stack: primary, secondary, colour
- Style blend and triad-pair validation gates

## Stage 6 Output & Control

- Export hardening: stricter MusicXML validation (divisions, structure, chord symbols)
- Lock system: melody, bass, harmony, rhythm, sections locks
- Performance pass: articulation (staccato/tenuto), no pitch changes
- Export Integrity, Lock Integrity, Performance Integrity gates

## Stage 5 Interaction Layer

- Interaction modes: support, call_response, overlap, independent
- Golden path default: A support, B light call_response
- Register separation: guitar floor 60, bass ceiling 52
- Behaviour coupling: bass simplifies, guitar reduces attack in call_response
- Interaction Integrity and Register Separation gates

## Stage 7 App Productisation

- Local web app: React + TypeScript + Vite
- App API bridge: presets, style modules, generate, outputs, open-output-folder
- Preset-driven UI: Guitar-Bass Duo, ECM Chamber, Big Band (latter two coming soon)
- Style stack: primary / secondary / colour (Barry Harris, Metheny, Triad Pairs)
- Generation controls: seed, lock toggles (melody, bass, harmony, rhythm, section A/B)
- Output management: list outputs, validation summary, open folder
- Packaging-ready structure for future Windows desktop wrapper
- No Python or .bat dependency for user workflow

## Desktop bugfix / unification

- Single Electron window; single-instance lock; no second window for errors (inline loading/error pages)
- No `openExternal` / browser auto-open; `setWindowOpenHandler` denies popups
- `GET /api/output-directory` for UI; `openOutputFolder` uses `spawn(explorer)` with `windowsHide` (no visible cmd)
- Generate panel shows full path, manifest fields, gates, and open-folder actions
- `launchers/COMPOSER_OS.md` clarifies Composer OS vs legacy Composer Studio

## Desktop port handling

- Automatic port resolution: prefer 3001, reuse Composer OS via `GET /health`, or fall back to next free port
- API exposes `GET /health` with `{ status, app: "composer-os" }`

## Stage 8 Windows Desktop Product

- Electron desktop wrapper around Composer OS
- Packaged executable (portable + NSIS installer)
- Desktop shortcut and icon support
- Single-click launch: API auto-starts, UI opens
- Outputs: dev uses repo `outputs/`, packaged uses `%APPDATA%`
- electron-builder for Windows distribution
- No Python, no .bat for end user

## Retro Self-Test / Hardening Pass

- Retro test suite for Foundation, Golden Path, Musical Core, First Intelligence, Style System
- Regression fixtures (bar count, event counts, pitch ranges, style metadata)
- Stage exit gate tests per implemented stage
- Negative tests proving gates catch failures (rehearsal marks, chord symbols, register, motif, style stack)
- `npm run test:retro` to run retro suite only
