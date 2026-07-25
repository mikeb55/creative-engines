# Composer OS â€” Architecture

## Overview

**Composer OS** (`engines/composer-os-v2/`) is a single generative pipeline for jazz/chamber-style outputs: preset â†’ planning â†’ score build â†’ integrity â†’ MusicXML export â†’ validation â†’ readiness. **Apps** (`apps/composer-os-app`, `apps/composer-os-desktop`) call the shared **app API** (`engines/composer-os-v2/app-api/`), not the engine core directly.

### RiffGen Phase 1.5 (inspect + GenerateIsland â€” 2026-07-18)

- **Route:** app shell `#/riffgen` (nav label **RiffGen**) â€” sibling page, not a HomeGenerate branch. Hash routing required for desktop `file://` reload safety.
- **API:** `GET /api/riff-phrase-corpus` + IPC `composer-os-api:get-riff-phrase-corpus` â†’ `resolveRiffPhraseCorpusDerivedRoot` loads `data/riff-phrase-corpus/derived/phrases.jsonl` + `audit.csv` (read-only). Desktop packages derived via `copy-riff-phrase-corpus.js` â†’ `extraResources`.
- **Corpus state (2026-07-23):** **11** categories in schema (`RIFF_PHRASE_CATEGORIES`); target total **171**. Derived **193** files / **345** phrases. **All 11 populated** (no empty stubs). Motif-seed: many-to-many `STYLE_PAIRINGS` â€” **11 of 11** categories paired (**12** edges; `blues_rock`â†’hendrix **+** led_zeppelin; `modern_rock`â†’morello; `virtuoso_technique`â†’eddie_van_halen; `southern_rock`â†’jimmy_herring). **`virtuoso_technique` kind note:** cross-genre technique showcase (Scott Allen *50 Rock Virtuoso Licks*), not a genre-authentic style category.
- **S3 GenerateIsland:** `RiffGenGenerateIsland` + local `useRiffGenGenerateState` mount `RiffGeneratorPanel` (Variation / Open-folder); `api.generate({ presetId: 'riff_generator', â€¦ })` â€” same contract as Home. Optional phrase-seed checkbox when VRB has a proven pairing (default OFF).
- **Export Guitar Pro (2026-07-24):** After generate, island shows **Export Guitar Pro** beside Open folder. Calls existing `api.exportGuitarPro` on the written MusicXML `filepath` (MuseScore CLI → sibling `.gp`; same soft-fail when MuseScore missing as vault tools).
- **Corpus details collapse (2026-07-24):** `RiffGenCorpusQaPanel` (histograms / ingest QA) sits behind a default-closed **Corpus details** `<details>` on `RiffGenPage`; panel + data unchanged when expanded.
- **Chord-loop trust Phase 1–3 (2026-07-19 / 2026-07-24):** `riffChordLoop.normalizeChordLoopWithDisclosure` — null slots still → `Am7`, but `GenerateResult.chordLoopDisclosure` + UI banner (`RiffChordLoopDisclosureBanner`) list typed→used + bars. Phase 2: live `RiffChordLoopTokenStrip` badges (`valid` / `normalized` / `unsupported` / `invalid`). **Phase 3:** ack gating — soft Accept on `normalized`, hard Pick/Edit on `unsupported`/`invalid`; Generate disabled while unresolved (Home + RiffGen); empty loop ungated; soft acks clear on text edit. Parse grammar unchanged; no polychord / confidence scores.
- **Desktop hash routing (2026-07-19):** App shell uses `#/â€¦` routes (`appRouter`) so `file://` reload keeps `index.html`. Electron `did-fail-load` recovers bad `file:///C:/â€¦` URLs via `loadFile` + hash restore.
- **Scope freeze:** melody path OFF for phrase corpus (`riffPitchFieldForBar â†’ â€¦ â†’ applyLoopClosure` not phrase-conditioned) unless motif-seed opt-in. **`presetId` stays `riff_generator`**.
- **MelodicIdentity P0+P1+P2 (2026-07-23 / 2026-07-24):** Dense multi-bar rhythm enforces onset floor (`enforceDenseOnsetFloor` in `riffRhythm.ts` — ≥2 played attacks/bar when segment budget allows). Rock/fusion procedural path runs `applyRockStructuralCellRecall` after `enforceHook` (opening 4-note interval cell cycles the line; skipped when phrase-seeded). Closes confirm-seed **3/4** MI hard-gate FAILs on `hendrix` / `led_zeppelin` **motif-seed OFF**. **P2:** `getIntervalTarget` rock cases — `hendrix` blues-lead band; `led_zeppelin`/`iommi` hard-rock leap/wide band — plus hendrix `intervalWeights` (zep weights unchanged).
- **P3 — phrase-seed onset coverage (SHIPPED 2026-07-25):** For phrase-seeded `hendrix` / `led_zeppelin` / `mahavishnu`, `buildRiffScoreModel` calls `enforcePhraseSeedOnsetCoverage` (`riffRhythm.ts`) — flip rests + peel grid-unit attacks until onset count ≥ phrase notes + wrap cushion. Closes MI hard-gate FAILs on seeds **3,7** / **3,7** / **4** without re-enabling cell-recall. Phase 2 snapshot: **all 12** pairings **ready=Y**. `defaultEnabled` still false.
- **P4 — degenerate corpus phrase selection (SHIPPED 2026-07-24):** `pickPhraseForSeed` (`riffPhraseMotifSeed.ts`) walks forward from `seed % pool.length` past empty / all-zero `intervalSequence` via `isDegeneratePhraseIntervalSequence`. Non-degenerate native landings unchanged; `findSeedsWithMinPhraseIntervals` uses the same pick. No corpus file edits. Confirm: fripp seed **4** + gilmour seed **3** hard PASS / high cos; both pairings **ready=Y** on Phase 2 snapshot. `defaultEnabled` still false.
- **P5 — phrase-seed skip call-response rest windows (SHIPPED 2026-07-25):** When `isPhraseSeededCoreMotif` (`CoreMotif.id` starts with `phrase:`), `buildRiffScoreModel` skips `applyGuitarRestWindowsToBar` (same gate as `enforceHook` / cell-recall). Protects EVH (`EVH_SIL_*` / `very_high_call_response`) and herring (`twin_guitar_call_then_sustain_answer`) phrase contours from drop+ghost inject. Phase 2 snapshot: EVH + herring **ready=Y** (0/6 hard FAIL ON); prior 7 ready edges unchanged. `defaultEnabled` still false.
- **Pairing enablement user-override (SHIPPED 2026-07-25):** `pairingEnablementOverrides.ts` JSON under Electron `userData`; `isPairingEnabled` = PairingFlags → override → env → `defaultEnabled`. RiffGen checkbox + `riffPairingFlags` request path. **Style Pairings settings panel** on `#/riffgen` (12 rows, toggle + reset). **Phase 2 Batch 1 default-ON** (2026-07-25): `weather_report` / `bill_evans_sax` / `morello` / `nile_rodgers` / `iommi`; other seven remain false.
- **Phrase â†’ engine (Phase 1.9 + many-to-many motif-seed SHIPPED):** `riffStylePairings.ts` registry â€” composite `PairingId` `category::profile`; plural APIs (`getPairingsForProfile` / `getPairing` / â€¦); per-edge flags (derived env + legacy aliases). **12** edges covering **11 of 11** categories: saxâ†’weather_report / jazz_rockâ†’mahavishnu / dimâ†’fripp / white_rock_funkâ†’iommi / black_soul_funkâ†’nile_rodgers / bebopâ†’bill_evans_sax / **blues_rockâ†’hendrix + blues_rockâ†’led_zeppelin** / progressive_bluesâ†’david_gilmour / **modern_rockâ†’morello** / **virtuoso_techniqueâ†’eddie_van_halen** / **southern_rockâ†’jimmy_herring**. Shared-category: both blues edges may be ON; generate resolves exactly one edge for selected profile (no blend). Browser-safe catalog: `riffPhraseMotifSeedUi.ts`. RiffGen UI catalog includes full registry parity (`jamerson` funk + `eddie_van_halen` / `jimmy_herring` rock; default rock still `iommi`). Broader default-ON = future.
- **S4 backlog (curation UX — not built):**
  1. **`diminished_lines` chunk quality** — road-test emit has **8** `barCount===1` leftover phrases and several **mid-run** splits (continuous dim lines cut by ingest `MAX_PHRASE_BARS=4`, not musical boundaries). When S4 curation lands, mark these **low-quality / needs-review** in audit (or UI flags) — **do not** treat as equal-weight phrases for downstream use.
- **Per-phrase meter (SHIPPED 2026-07-24):** Ingest stamps `RiffPhraseEntry.meter` from the phrase window’s bars (`meterByBar` + `phraseMeterForRange`), splits ranges at mid-file meter changes, and no longer applies file-level `meter_mismatch_file` quarantine. Audit `meterMismatch=true` still flags mixed-meter **files** (e.g. `diminished_lines/mvoldsu-003.gpx` 6/4→4/4). Defensive reason `meter_mismatch_phrase` only if a window still spans unequal meters.

**Ending context (`endingContext`):** `terminal` / `loop` / `open_idiom` gates `finalBarTension` auto-fail without changing the numeric threshold (`> 0.7`). `riff_generator` defaults to `loop` (loop-setup unresolved endings do not auto-fail). Song Mode / leadsheets / charts stay `terminal`. `acknowledgeOpenIdiomEnding` **or** user pref `openIdiomDefault` (default OFF; `composerOs.openIdiomDefault` localStorage) → `open_idiom` with disclosure (same chord-loop-trust banner). Modules: `core/gce/endingContext.ts`, `core/gce/finalBarTensionGate.ts`; UI `apps/composer-os-app/src/preferences/openIdiomDefault.ts`. See `docs/GCE_LOCK_DCR_STANDARDS.md` §3.1a.

**App UI â€” AuditionDock Phase 1 (playback only):** **`apps/composer-os-app/src/playback/auditionFromGenerateResult.ts`** is the single path from **`POST /api/generate`** (or desktop IPC equivalent) result â†’ MusicXML load â†’ **`PlaybackSequence`** â†’ **`playbackEngine`**. **`AuditionDock`** on the **Composers** tab and **Generate** tab Listen/Play both call this helper. **`buildAuditionGenerateRequest`** always targets **`song_mode`** for dock demos (**32** bars); **`debussy`**, **`messiaen`**, **`steve_reich`** do **not** route to String Quartet or other native ensemble presets in audition â€” duo Song Mode only (**`composerCoverageManifest.json`** **`arrangementPath`**). Dock generates **new** seeded demos; it does **not** audition user lead-sheet or import input (future phase). Empty parse â†’ **`no_notes`** gate (no silent play).

**Leadsheet-input engine â€” Phases 1â€“7 + full-chart import (parallel import path):** Additive lane beside Song Mode / mosaic style-transfer / **`generateGoldenPathDuoScore`**. Entry: **`core/import/`** â€” **`musicXmlToImportTimeline`** (Phase 4 file read via **`loadDebussyLeadSheetImportTimelineFromMusicXmlFile`**) or hardcoded proof timeline (Phase 1) â†’ **`MosaicImportTimeline`**. **`importTimelineToLockedHarmony`** feeds **`buildDebussyLeadSheetHarmonySpine`** (composer **`composerId`** dispatch / style-transfer on locked rail). **`assembleDebussyLeadSheetQuintetScore`** builds **guitar + four strings**; **`assembleDebussyLeadSheetQuintetWithHandoffScore`** + **`applyDebussyLeadSheetMelodyHandoff`** pin melody (**guitar â†’ Vn1 â†’ cello â†’ guitar** over **N** bars â€” full chart up to **64**); **Phase 7** **`leadSheetStringRealizationPass`** adds accompaniment motion. Export: **`exportScoreModelToMusicXml`**. **GCE/LOCK eval:** **`leadSheetGceLockEvalRunner.ts`** â†’ **`evaluateGce`** + **`evaluateLock`** â€” **`runLeadSheetOrbitGceLockProofCli.ts`** and **`leadSheetPhase7StringRealizationProof.test.ts`** only; **not** wired into **`generateComposition`**. **GUI:** **`LeadSheetInputDesktopPanel`** when **`COMPOSER_OS_FULL_UI=1`**. **Limits:** **64-bar cap** (full input bar count; **8-bar** regression-safe) Â· MusicXML-only Â· **viola silent** (known) Â· **`debussy` / `kenny_wheeler` / `bartok`** proven on Orbit compare â€” harmony differs most; sparse-chord charts may leave long unlabeled harmonic stretches.



**V65 P4 â€” Groove scaffold:** `core/groove-scaffold/grooveScaffold.ts` is an opt-in Song Mode drum scaffold, not a full drum engine. A request must carry a `Song` with `globalDefaults.grooveScaffold.enabled: true`; otherwise no `groove_drums` part is generated. `generateGoldenPathDuoScore.ts` runs `grooveScaffoldPass(afterExpressive, context, context.song)` immediately before `finalizeAndSealDuoScoreBarMath(afterExpressive)`, so the unpitched drum part participates in strict bar math and score freezing. The part is one voice / one staff, using `NoteEvent.pitches` stacks for simultaneous GM drum hits plus rests to fill every bar. MusicXML exports `Groove Drums` as unpitched percussion with channel 10 and explicit display-step mapping; MIDI score export routes this part to channel 10. GCE melodic-part resolution excludes `groove_drums`; diagnostics and `GROOVE_*` receipts travel through `GenerationMetadata`, run manifests, app API output, and disk manifests.



**V65 P3 â€” MusicXML deep import bridge:** `core/musicXmlDeepImport.ts` adds an additive import lane beside legacy `parseMusicXml` and LeadSheet import. It parses score-partwise MusicXML into `MusicXmlDeepImportResult` (parts, carry-forward `meterByBar`, tempo marks, rehearsal `sectionStarts`, role hints, and `chordsByBar`) and maps that to `ImportedSongResult` (`Song`, `lockedHarmonyBars`, optional LeadSheet). `composerOsAppGeneration.ts` / `generateComposition.ts` use the imported Song when no request Song is supplied so Song Mode, GBD, ECM, Big Band, and String Quartet can inherit sections, meter, tempo, and locked harmony from MusicXML without manual re-entry. Legacy import paths remain stable.

**Song Mode â€” Fripp / King Crimson (`fripp_king_crimson`):** optional **`GenerateRequest.asymmetricRhythm`** (preset id or validated custom **`CycleDefinition`**) and **`frippPolymeterSecondaryPresetId`** map to **`GenerationMetadata.asymmetricRhythmRequest`** / **`frippPolymeterSecondaryPresetId`**. **`precomputeFrippKingCrimsonEffectiveHarmonyBars`** (`core/song-mode/frippKingCrimsonSlice.ts`) applies a **uniform** **`barMeterMap`** from the **primary** cycle (odd meters such as **7/8**, **15/16**); optional **`frippKingCrimsonPolymeterReceipt`** records **LCM** alignment on a shared **16th** grid vs the secondary preset. Custom **`barMeterMap`** on the request is superseded when this writer is primary â€” use **`asymmetricRhythm`** for meter authority.

**Song Mode â€” Charles Mingus (`charles_mingus`):** **`SONGWRITER_CHORD_POOLS`** tiers **`mingus_blues`**, **`mingus_modal`**, **`mingus_chromatic`** (seed **`% 3`**). **`precomputeCharlesMingusEffectiveHarmonyBars`** (`core/song-mode/charlesMingusSlice.ts`) emits **`cm:*`** device receipts + **`charlesMingusEpisodePlan`** (texture archetypes **`dirge` / `riff_layer` / `collective_shout` / `pedal_modal`**, adjacent episodes differ in â‰¥2 of tempo / texture / harmonic family / improv density; shock-cut bar when form is long). **`VoiceRuleBundle`** **`charles_mingus`** carries research **`fingerprintReceipts`** on **`orchestrationPolicy`**. **`getChordForBar`** / spine treat **`charlesMingusEffectiveHarmonyBars`** as authoritative after precompute; duo golden path wires precompute + accumulate + finalize (`generateGoldenPathDuoScore.ts`). Big Band **`BIG_BAND_RULE_REGISTRY`** exposes **`charles_mingus`** and alias **`mingus`** with shared **`CHARLES_MINGUS_COMPOSER_RULES`**.

**Song Mode â€” Count Basie (`count_basie`):** **`SONGWRITER_CHORD_POOLS`** tiers **`basie_blues`** / **`basie_swing`** / **`basie_ballad`** (**`seed % 3`**). **`precomputeBasieEffectiveHarmonyBars`** (`core/song-mode/basieSlice.ts`) emits **`cb:*`** receipts, **`basieEpisodePlan`** (episodes **`riff_head`** / **`solo_background`** / **`shout`** / **`tag`**), optional **`basieTestamentMode`** (Old vs New Testament weighting on **`basieStyleProfile`**). **`GenerateRequest.basieTestamentMode`** â†’ **`GenerationMetadata`** and **`OutputEntry`** manifest echo. **`VoiceRuleBundle`** **`count_basie`**; Big Band **`basie`** rule list (10). Locked harmony + duo golden path same wiring pattern as Thad/Mingus.

**Song Mode â€” Bob Brookmeyer (`bob_brookmeyer`):** stub pools **`brookmeyer_quartal`** / **`brookmeyer_linear`** / **`brookmeyer_cluster`** (**`seed % 3`**); planner tags **`line_first:true`**. **`precomputeBobBrookmeyerEffectiveHarmonyBars`** (`core/song-mode/bobBrookmeyerSlice.ts`) â†’ **`bobBrookmeyerEffectiveHarmonyBars`** (**`brk:*`** receipts), **3-note `activePitchModule`**, episode plan + solo gate, **`brookmeyerPeriodMode`** (**`early_brookmeyer`** vs **`late_brookmeyer`**). **`lineFirstHierarchy`** on **`GenerationMetadata`** drives **`voiceLeadingSolver`** (harmony yields to melody). **`GenerateRequest.brookmeyerPeriodMode`** + diagnostics echo on **`OutputEntry`**. **`VoiceRuleBundle`** **`bob_brookmeyer`** (12 **`fingerprintReceipts`**).

**Song Mode â€” Oliver Nelson (`oliver_nelson`):** stub pools **`nelson_minor_modal`** / **`nelson_minor_blues`** / **`nelson_orchestral`**; planner tags **`pedalBased` / `bluesModalHybrid` / `twoLayerForm`**. **`precomputeOliverNelsonEffectiveHarmonyBars`** (`core/song-mode/oliverNelsonSlice.ts`) â†’ **`oliverNelsonEffectiveHarmonyBars`** (**`on:*`** receipts), **`buildNelsonEpisodePlan`** (pedal Â· modal head Â· orchestral wedge Â· turnaround Â· 12-bar minor blues), **`NelsonPeriodMode`**, **`NelsonBluesFormVariant`**, **`activePedal`**, **`upperModalChords`**. **`GenerateRequest.nelsonPeriodMode` / `nelsonBluesFormVariant`** + manifest echo. **`VoiceRuleBundle`** **`oliver_nelson`** (12 **`fingerprintReceipts`**).

## Song Mode â€” cross-cutting patterns (metadata / solver)

- **`lineFirstHierarchy`** â€” Declared on **`VoiceRuleBundle`** (Bob Brookmeyer). When true, **`voiceLeadingSolver`** resolves pitch-module / melody-first priority over chord-tone filling so **composed line** wins conflicts (**`voiceRuleBundle.ts`**, **`voiceLeadingSolver.ts`**).
- **`pedalBased` / `bluesModalHybrid` / `twoLayerForm`** â€” Chord-plan tags for Oliver Nelson in **`songModeBuilder.ts`**; **`nelsonEpisodeTypes.ts`** / **`oliverNelsonSlice.ts`** swap **modal-head** vs **minor-blues solo** harmonic environments within one chart.
- **`messiaenPeriodMode`** + **`colourTag`** â€” **`GenerateRequest`** / **`GenerationMetadata`** carry Messiaen era posture and stub colour label from limited-transposition mode; **`messiaenSlice.ts`** holds spine **â‰¥2** bars per chord and removes bare functional **Vâ†’I** from the locked rail.

## GCE structural memory (Phase 1)



Lightweight **JSON fingerprints** (no ML, no new scoring engine) under **`engines/composer-os-v2/gce-memory/fingerprints/`**.



- **Core:** **`core/gce/gceStructuralMemory.ts`** â€” `StructuralFingerprint`, **`extractFingerprint`**, **`validateAgainstFingerprint`**, **`saveFingerprint` / `loadFingerprint`**, **`parseComposerOsBigBandMusicXml`** (Composer OS BB part ids `bb_*`), **`extractFingerprintFromMusicXmlFile`** for seeding from exported MusicXML.


- **Registry:** **`core/gce/gceMemoryRegistry.ts`** â€” **`formatGateOverrides`** (hint floors per ensemble format) and **`bestFingerprintIdByFormatSongwriter`** (`big_band:bill_evans` â†’ **`orbit_v6_64`**, `big_band:donald_fagen` â†’ **`steely_orbit_v1_7`**).


- **Critical guard:** melodic parts must not reach **three consecutive bars** with identical voice-1 pitch-sequence signatures outside intro bars **1â€“4** (targets stuck repetition such as bars **17â€“24**).
- **Steely Orbit script:** **`scripts/generateSteelyOrbitV1.ts`** (npm **`orbit:steely-v2`**) â€” loads **`steely_orbit_target`** ( **`gce-memory/fingerprints/steely_orbit_target.json`** â€” V6-compatible density through bar **56**, bars **57â€“64** thinned for Steely handoff; **`gceScore`** tracks V2.1 baseline **7.42**) and runs **`validateSteelyOrbitV2FingerprintGate`** before combined GCE ( **`STEELY_ORBIT_V2_FINGERPRINT_RULE_COUNT`** = **5** ). **Density:** global 8-bar mean abs **â‰¤ 0.4** (**`STEELY_V2_DENSITY_EIGHT_MAX`**); windows overlapping **57â€“64** use **`STEELY_V2_DENSITY_ZONE_MAX`** (default **0.65**) via **`DensityEightBarTransitionZone`**. Drum / section / melody-streak env as before. No export if combined **< `STEELY_GCE_GATE`** (default **7.3** empirical BB gate).


- **Maintenance:** **`npm run gce:seed-structural-fingerprints`** in **`engines/composer-os-v2`** regenerates JSON from **`projects/Orbit/V6.0 orbit - BB.musicxml`** and **`projects/Orbit/Steely Orbit - 1st 64 bars/V1.7-Steely-Orbit.musicxml`**.


- **Frank Zappa Song Mode (compositional):** **`core/gce/frankZappaStructuralFingerprint.ts`** declarative profile + **`applyZappaGceStructuralGeneration.ts`** generation wiring in **`runGoldenPathOnce`** (after **`attachMacroFormPlanToContext`**). When **`zappaStyleMode`** is compositional and no request **`barMeterMap`**, auto-splices **7/8 Â· 5/4 Â· 4/4** at section boundaries; **`zappaSectionKindSequence`** (march / ballad / â€¦) drives macro goals + **`planSectionRoles`** metadata; **`registerShiftProbability`** (default **0.65**) gates Phase 4 guitarâ†”bass register swaps in **`generateGoldenPathDuoScore`**. Golden **`zappaGceFingerprint.test.ts`** (seed **76001**, off smoke). Post-hoc pillars remain in **`gceGate.ts`** **`scoreFrankZappaResultForGce`**.



## HTTP API â€” `POST /api/melodic-variation-pack`

Local dev server: **`scripts/startComposerOsAppApi.ts`** (default **`http://127.0.0.1:3001`**). **Desktop:** same payload via IPC **`composer-os-api:melodic-variation-pack`**.

**Request (JSON)**

| Field | Type | Notes |
|--------|------|--------|
| `melody` | `{ pitch: number, duration: number }[]` | Pitch = MIDI; `duration` = quarter-note units. Contract name **NoteEvent** in product docs = this minimal shape (not full score `NoteEvent`). |
| `chords` | `string[]` | Lead-sheet symbols per bar or harmonic span (e.g. **`Cmaj7`**, **`Am9`**); length drives default GCE section span when `sections` omitted. |


| `variationCount` | `number` | Clamped **3â€“5** server-side. |
| `songwriterId` | `string` | Canonical or alias (**`normalizeSongwriterStyleKey`**); unknown â†’ **400**. |
| `sections` | optional | Override GCE Structure & Form (`label`, `barStart`, `barEnd`, optional `role`). |



**Response (success)**

| Field | Type | Notes |
|--------|------|--------|
| `success` | `true` | |
| `scoringMode` | `"melody-only"` | Stub duo score for GCE; arrangement pillar reflects placeholder bass part. |


| `melody` | same as request | Echoed. |
| `variations` | array | Length â‰¤ `variationCount`; sorted by **`gceScore`** descending. Each item: **`melody`**, **`gceScore`** (0â€“10 overall), **`transform`** (`MotifTransform` â€” which mutation produced the row). |



**Response (error)** â€” `{ "success": false, "error": string }` with HTTP **400** for validation failures when using the HTTP route.

## V9.0 baseline (chords & export)

**Unified chord semantics (#19)** â€” Done: normalization before parsing, shared parser/validator behaviour, standard jazz symbols accepted without hard failure (see guarantee in [CHANGELOG.md](./CHANGELOG.md) V9.0 section).

**MusicXML export stability** â€” Sibelius-safe rhythm encoding; undotted decomposition (no reliance on dotted-beat fractional tokens such as `1.5` / `0.75` in the export path); multi-voice export kept clean. Details: [CHANGELOG.md](./CHANGELOG.md) â€” *MusicXML Export (Stability)* and the Composer OS section in the [repo README](../README.md).

**Roadmap:** **#16 Chord Handling Robustness** is **DONE** â€” MusicXML export stabilised; GP8 is primary detailed chord-validation target; Sibelius accepted as simplification-prone fallback. Further UX around chord input may continue incrementally.

**#17 Diagnostics / Receipt Clarity** is **DONE** â€” Generation receipt now surfaces chord export diagnostics including parsed chord count, fallback count, Sibelius simplification flags, and slash-bass preservation. See [docs/generation-receipts-and-diagnostics.md](./generation-receipts-and-diagnostics.md).

## Guitar polyphony (Phase 18.2)

| Milestone | Status |
|-----------|--------|
| **18.2A** â€” Polyphony export / Sibelius-safe proof | **COMPLETE** |
| **18.2B** â€” Voice-2 behaviour (Wyble layer) | **IN PROGRESS** |

**Achieved so far:** dual voices stable in Sibelius and Guitar Pro 8; continuity layer working; internal motion partially working. **Open work** is phrase-level musical refinement (intention / direction), not export or score structure.

**Phase 18.2B.1 â€” Voice 2 diagnostics:** read-only metrics for Guitar/Bass Duo (bar coverage, density, rest gaps, activity runs, strong-beat vs offbeat entries) are emitted to console and the Generation Receipt UI; they do not change generation output.

**Phase 18.2B.2 â€” Voice 2 rhythm footprint:** the Wyble inner-voice inject path plans **one bar-level rhythm shape per active bar** (sustained bar, two slabs, offbeat hold, or rest fallback), with coverage targeting and gap limits â€” see root [CHANGELOG.md](../CHANGELOG.md).

## Phase labels (A / B / C / D)

These labels are used in product and handoff docs; boundaries are conceptual, not separate runtimes.

| Track | Meaning (typical) |
|--------|-------------------|
| **A** | Foundations: conductor, rhythm engine, score model, export, gates |
| **B** | Musical core: sections, density, register, behaviours, interaction |
| **C** | **Song Mode rhythm stack** â€” passes C1â€“C7 on the guitarâ€“bass duo **32-bar Song Mode** path (hook-first identity, phrase engine, then overlays). |
| **D** | **Intent & control** â€” user-facing rhythm intent and resolution before downstream passes |

## Song Mode rhythm stack (C1â€“C7)

Order for the duo **32-bar** Song Mode golden path (after core duo build, before final bar-math seal):

### ContrapuntalLineEngine (duo golden path, pre-harmony-bar precompute)

On **`generateGoldenPathDuoScore`**, when **`isDuoGoldenPath`**, **`precomputeContrapuntalLines`** runs **before** every songwriter **`precompute*EffectiveHarmonyBars`** call (including Basie). For VRB ids **`bob_brookmeyer`** and **`bartok`** with **`contrapuntalLinePolicy.enabled`**, **`GenerationMetadata.contrapuntalLineSet`** receives an **`AbstractLineSet`** from **`ContrapuntalLineEngine`**. **`lineFirstHierarchy`** in **`voiceLeadingSolver.ts`** is **not** fed the line set; Brookmeyerâ€™s harmony precompute may still set that flag separately. **Pass 3 scope:** metadata + smoke musical gate; MusicXML / part writers do not yet consume **`contrapuntalLineSet`**. Closeout rules: **`engines/composer-os-v2/core/counterpoint/INVARIANTS.md`**.

### Phrase Engine V2 (pre-C1 pass)

On the **guitarâ€“bass duo** golden path, when **`songModeHookFirstIdentity`** is on and the preset is in the **guitarâ€“bass duo family** with **32 bars**, **`generateGoldenPathDuoScore`** runs **Phrase Engine V2** immediately **before C1**: **`buildMotifPool`** on the working score, optional **`seedPoolFromHookIdentity`** when **`songModeHookIdentity`** is present on metadata, then **`applyPhraseEngineV2`** on the guitar part and **`applyBassMotifEcho`** on the bass part (same motif pool), replacing those parts on the score before the C1â€“C7 overlay chain.

1. **C1** â€” `songModeRhythmOverlayC1`: soft rhythm overlay on guitar (phrase-level overlays + note-level bias); preserves structure.
2. **C2** â€” Phrase rhythm intent is *derived inside C1/C2 layer* (phrase intent summaries, mode-scaled strength). Documented with C1 in code as the phrase-intent layer.
3. **C3** â€” `jamesBrownFunkOverlay` (optional James Brown funk overlay when enabled).
4. **C4** â€” `songModeOstinatoC4`: ostinato / hook bias (phrase-level, safety-first).
5. **C5 (two passes)** â€” **`songModeOstinatoC5`**: blend / feel interpolation + optional structural density (`applyC5DensityLayer`, `blendStrength`); then **`songModeControlC5`**: control layer â€” primary/secondary stack roles, caps, gentle velocity contrast; ties layers using resolved strength. A postâ€“bar-math density pass may apply in `generateGoldenPathDuoScore` after `finalizeAndSealDuoScoreBarMath` (see CHANGELOG).
6. **C6** â€” `songModeExpressionC6`: expression (guitar velocity + articulation), yields to C5.
7. **C7** â€” `songModeSpaceC7`: space / rest operations within caps, yields to C5/C6.

**Central rule (D1):** Raw **rhythm intent** from the request is resolved **once** into per-phrase records (`rhythmIntentResolve` + metadata). Downstream passes read **effective strength** via `getEffectiveRhythmStrength` (from **resolved** weights + surprise), not raw UI fields. **UI â†’ `GenerateRequest.intent` â†’ `runGoldenPath` â†’ resolution before overlays â†’ C4â€“C7.**

## Songwriter id â†’ chord tones (Wayne Shorter mode)

When Song Mode supplies a **primary songwriter** style, `runGoldenPath` resolves profiles via `resolveSongwritingStyles` and writes **`songwriterStyleId`** (and weight fields) onto **`generationMetadata`**. **`chordTonesForChordSymbolWithContext`** (`harmony/harmonyChordTonePolicy.ts`) forwards **`shorterMode: true`** into **`chordTonesForChordSymbol`** when the id is **`wayne_shorter`**. In **`chordSymbolAnalysis.ts`**, `shorterMode` rewires the heuristic `ChordToneSet` returned from symbol parsing to emphasise upper-extension pitch classes (post-bop, non-functional line flavour) instead of the default rootâ€“thirdâ€“fifthâ€“seventh mapping. Other profiles leave `shorterMode` off.

## D-phase status

| Item | Status |
|------|--------|
| **D1** | **Complete** â€” `RhythmIntentControl` types, optional `intent` on generate path, resolution into metadata, groove/space-aware effective strength for C4â€“C7 when intent is present; legacy path unchanged when `intent` is omitted. |
| **D2** | **In progress** â€” Song Mode UI sliders (Groove, Space, Expression, Surprise) feeding `GenerateRequest.intent`; pattern fixed at 0.5 in the wire contract unless extended later. |
| **D3** | **Upcoming** â€” not defined in code; reserved for future control work. |

## C-module status

- C4: done â€” UI control wired end-to-end; c4Strength reaches generationMetadata via Song Mode request path
- C5: done â€” `applySongModeOstinatoC5` + `applySongModeControlC5`; blendStrength + structural density layer (see CHANGELOG); control caps/velocity contrast
- C6: done â€” expression pass fully built and firing; velocity shaping, articulation, phrase emphasis, fail-safe restore
- C7: done â€” space pass fully built and firing; note-to-rest and merge ops, density caps, anti-oversparsity guard, fail-safe restore

## Text pipeline (high level)

```
User / API
  â†’ GenerateRequest (optional intent)
  â†’ runGoldenPath / runAppGeneration
  â†’ build score (duo / ECM / Song Mode compile, etc.)
  â†’ Song Mode 32: ensure rhythm intent resolved into metadata
  â†’ C1 â†’ C3 (optional) â†’ C4 â†’ C5 â†’ C6 â†’ C7
  â†’ finalize bar math â†’ export MusicXML â†’ gates â†’ manifest
```

## Current system status

- **Guitarâ€“Bass Duo** and **ECM Chamber**: full MusicXML golden path; optional **32-bar** long-form for duo.
- **Song Mode**: compile + planning + duo MusicXML generation path via app API; rhythm intent applies on the **Song Mode duo MusicXML** path when `intent` is sent.
- **Big Band / String Quartet**: planning and/or realisation paths per preset (see engine README for module ids).

## SQ Harmonic Voice â€” VRB Registry

A **Voice Rule Bundle (VRB)** is a per-composer parameter set that governs how the GCE scores string-quartet output on the SQâ†’BB path. It controls the Ïƒ register ceiling, independence level, register policy, phrase articulation, cadence credit, and harmony-interval credits. When the user picks a name in the **SQ Harmonic Voice** picker, the engine loads that profileâ€™s adjustments into Gate 2 scoring (via `getSqVrbGceAdjustments` and isolated branches in `gceAutoScorers.ts`).



**Registry source:** `engines/composer-os-v2/core/counterpoint/vrbProfiles/sqVrbProfileRegistry.ts` â€” twelve film-stub profiles. **BartÃ³k** is the default SQ contrapuntal `VoiceRuleBundle` (native bundle, not a film-stub row in the registry); the picker enables BartÃ³k, but `getSqVrbProfile('bartok')` is undefined.

### Section architecture (V64 P4 domain + P5 contract)

**P4 geometry:** **`sectionArchitectureDomain.ts`** â€” **`CompositionSection`**, **`SectionTemplateBundle`**, **`SectionMeterSpan`**, **`SectionArchitectureDocument`**, layer kinds (`form` Â· `macro_goals` Â· `vrb_context` Â· `marker` Â· `meter`), **`validateSectionPartition`**. **`docs/SECTION_ARCHITECTURE_DOMAIN.md`**. Golden seed **78001** (off smoke).

**P5 Song schema:** **`sectionArchitectureTypes.ts`** â€” **`Song`**, **`SongDefaults`**, per-row **`SectionPreset`**, **`InstrumentOverride`**, **`LocalOverride`**, **`EffectiveGenerationContext`**. Signatures in **`sectionArchitectureContracts.ts`** (`resolveEffectiveContext`, `validateSong`, â€¦) â€” **P6** implements merge; **P7** wires **`meterMap`**. Behavioural spec: **`docs/COMPOSER_OS_SECTION_ARCHITECTURE.md`**.

**V65 P1/P2 generation bridge:** **`effectiveContextForBar.ts`** validates **`Song`** at pipeline entry, bridges `Song.sections` â†’ `FormMap`, then caches `resolveEffectiveContext(bar, song)` per composition run. P1 fan-out covers duo/Song Mode pitch, rhythm, voicing, density, and `riffMode`. P2 extends the same context to per-section `tuningProfile`, `registerWindow`, bass `followRootProbability`, `interpolateRegister`, Slonimsky `PitchProfile.cellSets`, and Big Band / String Quartet score-builder profile echoes. Goldens **80001â€“80002** and **81001â€“81003** stay off smoke until V65 closeout.

### Per-section VRB â€” `SectionMarker` (P1 / P7, all modes)

**SQâ†’BB** already supports **whole-VRB-id** switching per canonical section label via **`SectionVrbContext`** / **`sqToBbVrbContextBySection`** (`vrbContextMap.ts`, `resolveVrbForBar`). **`SectionMarker`** (`sectionMarkerTypes.ts`) carries **`vrbOverrides: Partial<VrbParams>`** â€” partial bundle + riff-profile + Slonimsky lane patches merged per bar by **`resolveVoiceRuleBundleForBar`** (`resolveSectionVrb.ts`). Consumers: **`getChordForBar`** (harmonic rhythm), **`applyVoiceBundleVoicingSpreadFloor`**, GBD **`buildGuitarBassDuoSlonimskyContext`** in **`generateGoldenPathDuoScore.ts`**. **sonic_youth** Song Mode auto-attaches A/B markers (bars 1â€“4 base Â· 5â€“8 **SY_SLON_01** elevated). Golden: **`sonicYouthPerSectionVrb.test.ts`** (seed **75002**, off smoke).

### VRB registry (Ïƒ ascending)

| vrbId | Ïƒ ceiling | phraseArticulation | registerPolicy | bestBbStyle |
|-------|-----------|-------------------|----------------|-------------|
| glass | 18 | looping_cell_no_cadence | compressed_mid | schneider |
| rota | 19 | strict_periodic_tonal_cadence | mid_soprano_lead | schneider |
| ravel | 20 | periodic_cadential | mid_soprano_lead | schneider |
| badalamenti | 21 | through_composed_arch_no_cadence | mid_chromatic_arch | schneider |
| morricone | 22 | folk_modal_suspended | mid_soprano_lead | schneider |
| joni_mitchell | 23 | four_bar_periodic_suspended_non_resolving | open_string_low_pedal_lyrical_soprano_arch | schneider |
| goldsmith | 24 | doubly_open_cell_development | mid_soprano_lead | schneider |
| bartÃ³k | 24 | (native contrapuntal bundle) | â€” | â€” |
| williams | 26 | romantic_periodic_cadential | mid_soprano_lead | schneider |
| zimmer | 26 | repeating_ostinato_no_cadence | mid_cathartic | schneider |
| shostakovich | 28 | asymmetric_cell_non_resolving | low_biased_extreme_punctuation_spikes | mingus |
| herrmann | 36 | ostinato_cell_based | mid_high_tension | brookmeyer |
| webern | 40 | aphoristic_cell_silence_bounded | extreme_pointillist_leaps_all_registers | brookmeyer |

*BartÃ³k:* default SQ contrapuntal bundle, not a film-stub VRB profile; picker enabled but not in `sqVrbProfileRegistry`.

### GCE branch structure



Each film-stub `vrbId` has its own isolated branch in `engines/composer-os-v2/core/gce/gceAutoScorers.ts`, guarded by `contrapuntalLinePolicy.enabled` **and** `vrbId === '<id>'` (or equivalent profile lookup). Branches are strictly additive: adding a new VRB does not modify existing VRB branches.



### Per-VRB differentiators

**Glass** â€” Looping cell is rewarded; silence does **not** mark a phrase boundary (inverse of Webern).

**Webern** â€” Looping cell is **penalized** (inverse of Glass). Silence â‰¥ 1 beat is a hard phrase boundary. One- to two-voice Klangfarbenmelodie texture is **not** penalized.

**Joni Mitchell** â€” Three-tier texture (cello pedal / sustained quartal-sus inner / lyrical Vln I) is **not** penalized for low inner-voice activity. sus2/sus4/maj7/maj9 endings are credited; Vâ†’I is **not** credited. ic5/ic2 credited; ic1 saturation **not** applied.

**Shostakovich** â€” Passacaglia / cello-drone texture is valid. Extreme register spikes do not hard-fail Ïƒ. Non-resolving phrase endings are correct, not defects.

**Zimmer** â€” `ZIMMER_PASSACAGLIA_SUB_MODE` is documented on the profile (ground bass + progressive entry). Ïƒ soft ceiling extends to **32** in passacaglia context (hard ceiling remains 26 otherwise).

### Standalone VRB tests (not in smoke)

| Profile | Tests |
|---------|------:|
| glass | 22 |
| rota | 20 |
| ravel | 13 |
| badalamenti | 24 |
| morricone | 16 |
| goldsmith | 20 |
| williams | 15 |
| zimmer | 25 |
| herrmann | 14 |
| shostakovich | 23 |
| webern | 29 |
| joni_mitchell | 31 |
| **Total** | **252** |

Smoke allowlist (`npm run test:composer-smoke`): **248** passed / **0** failed â€” unchanged when only VRB standalone suites run outside smoke.

---

For version history after V8.0, see [CHANGELOG.md](./CHANGELOG.md). For pre-V8.0 detailed changelog entries, see [archive/composer-os/CHANGELOG_HISTORICAL.md](./archive/composer-os/CHANGELOG_HISTORICAL.md).
