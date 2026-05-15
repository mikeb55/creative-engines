# Composer OS — Architecture

## Overview

**Composer OS** (`engines/composer-os-v2/`) is a single generative pipeline for jazz/chamber-style outputs: preset → planning → score build → integrity → MusicXML export → validation → readiness. **Apps** (`apps/composer-os-app`, `apps/composer-os-desktop`) call the shared **app API** (`engines/composer-os-v2/app-api/`), not the engine core directly.

**Song Mode — Fripp / King Crimson (`fripp_king_crimson`):** optional **`GenerateRequest.asymmetricRhythm`** (preset id or validated custom **`CycleDefinition`**) and **`frippPolymeterSecondaryPresetId`** map to **`GenerationMetadata.asymmetricRhythmRequest`** / **`frippPolymeterSecondaryPresetId`**. **`precomputeFrippKingCrimsonEffectiveHarmonyBars`** (`core/song-mode/frippKingCrimsonSlice.ts`) applies a **uniform** **`barMeterMap`** from the **primary** cycle (odd meters such as **7/8**, **15/16**); optional **`frippKingCrimsonPolymeterReceipt`** records **LCM** alignment on a shared **16th** grid vs the secondary preset. Custom **`barMeterMap`** on the request is superseded when this writer is primary — use **`asymmetricRhythm`** for meter authority.

**Song Mode — Charles Mingus (`charles_mingus`):** **`SONGWRITER_CHORD_POOLS`** tiers **`mingus_blues`**, **`mingus_modal`**, **`mingus_chromatic`** (seed **`% 3`**). **`precomputeCharlesMingusEffectiveHarmonyBars`** (`core/song-mode/charlesMingusSlice.ts`) emits **`cm:*`** device receipts + **`charlesMingusEpisodePlan`** (texture archetypes **`dirge` / `riff_layer` / `collective_shout` / `pedal_modal`**, adjacent episodes differ in ≥2 of tempo / texture / harmonic family / improv density; shock-cut bar when form is long). **`VoiceRuleBundle`** **`charles_mingus`** carries research **`fingerprintReceipts`** on **`orchestrationPolicy`**. **`getChordForBar`** / spine treat **`charlesMingusEffectiveHarmonyBars`** as authoritative after precompute; duo golden path wires precompute + accumulate + finalize (`generateGoldenPathDuoScore.ts`). Big Band **`BIG_BAND_RULE_REGISTRY`** exposes **`charles_mingus`** and alias **`mingus`** with shared **`CHARLES_MINGUS_COMPOSER_RULES`**.

**Song Mode — Count Basie (`count_basie`):** **`SONGWRITER_CHORD_POOLS`** tiers **`basie_blues`** / **`basie_swing`** / **`basie_ballad`** (**`seed % 3`**). **`precomputeBasieEffectiveHarmonyBars`** (`core/song-mode/basieSlice.ts`) emits **`cb:*`** receipts, **`basieEpisodePlan`** (episodes **`riff_head`** / **`solo_background`** / **`shout`** / **`tag`**), optional **`basieTestamentMode`** (Old vs New Testament weighting on **`basieStyleProfile`**). **`GenerateRequest.basieTestamentMode`** → **`GenerationMetadata`** and **`OutputEntry`** manifest echo. **`VoiceRuleBundle`** **`count_basie`**; Big Band **`basie`** rule list (10). Locked harmony + duo golden path same wiring pattern as Thad/Mingus.

**Song Mode — Bob Brookmeyer (`bob_brookmeyer`):** stub pools **`brookmeyer_quartal`** / **`brookmeyer_linear`** / **`brookmeyer_cluster`** (**`seed % 3`**); planner tags **`line_first:true`**. **`precomputeBobBrookmeyerEffectiveHarmonyBars`** (`core/song-mode/bobBrookmeyerSlice.ts`) → **`bobBrookmeyerEffectiveHarmonyBars`** (**`brk:*`** receipts), **3-note `activePitchModule`**, episode plan + solo gate, **`brookmeyerPeriodMode`** (**`early_brookmeyer`** vs **`late_brookmeyer`**). **`lineFirstHierarchy`** on **`GenerationMetadata`** drives **`voiceLeadingSolver`** (harmony yields to melody). **`GenerateRequest.brookmeyerPeriodMode`** + diagnostics echo on **`OutputEntry`**. **`VoiceRuleBundle`** **`bob_brookmeyer`** (12 **`fingerprintReceipts`**).

**Song Mode — Oliver Nelson (`oliver_nelson`):** stub pools **`nelson_minor_modal`** / **`nelson_minor_blues`** / **`nelson_orchestral`**; planner tags **`pedalBased` / `bluesModalHybrid` / `twoLayerForm`**. **`precomputeOliverNelsonEffectiveHarmonyBars`** (`core/song-mode/oliverNelsonSlice.ts`) → **`oliverNelsonEffectiveHarmonyBars`** (**`on:*`** receipts), **`buildNelsonEpisodePlan`** (pedal · modal head · orchestral wedge · turnaround · 12-bar minor blues), **`NelsonPeriodMode`**, **`NelsonBluesFormVariant`**, **`activePedal`**, **`upperModalChords`**. **`GenerateRequest.nelsonPeriodMode` / `nelsonBluesFormVariant`** + manifest echo. **`VoiceRuleBundle`** **`oliver_nelson`** (12 **`fingerprintReceipts`**).

## Song Mode — cross-cutting patterns (metadata / solver)

- **`lineFirstHierarchy`** — Declared on **`VoiceRuleBundle`** (Bob Brookmeyer). When true, **`voiceLeadingSolver`** resolves pitch-module / melody-first priority over chord-tone filling so **composed line** wins conflicts (**`voiceRuleBundle.ts`**, **`voiceLeadingSolver.ts`**).
- **`pedalBased` / `bluesModalHybrid` / `twoLayerForm`** — Chord-plan tags for Oliver Nelson in **`songModeBuilder.ts`**; **`nelsonEpisodeTypes.ts`** / **`oliverNelsonSlice.ts`** swap **modal-head** vs **minor-blues solo** harmonic environments within one chart.
- **`messiaenPeriodMode`** + **`colourTag`** — **`GenerateRequest`** / **`GenerationMetadata`** carry Messiaen era posture and stub colour label from limited-transposition mode; **`messiaenSlice.ts`** holds spine **≥2** bars per chord and removes bare functional **V→I** from the locked rail.

## GCE structural memory (Phase 1)

Lightweight **JSON fingerprints** (no ML, no new scoring engine) under **`engines/composer-os-v2/gce-memory/fingerprints/`**.

- **Core:** **`core/gce/gceStructuralMemory.ts`** — `StructuralFingerprint`, **`extractFingerprint`**, **`validateAgainstFingerprint`**, **`saveFingerprint` / `loadFingerprint`**, **`parseComposerOsBigBandMusicXml`** (Composer OS BB part ids `bb_*`), **`extractFingerprintFromMusicXmlFile`** for seeding from exported MusicXML.
- **Registry:** **`core/gce/gceMemoryRegistry.ts`** — **`formatGateOverrides`** (hint floors per ensemble format) and **`bestFingerprintIdByFormatSongwriter`** (`big_band:bill_evans` → **`orbit_v6_64`**, `big_band:donald_fagen` → **`steely_orbit_v1_7`**).
- **Critical guard:** melodic parts must not reach **three consecutive bars** with identical voice-1 pitch-sequence signatures outside intro bars **1–4** (targets stuck repetition such as bars **17–24**).
- **Steely Orbit script:** **`scripts/generateSteelyOrbitV1.ts`** (npm **`orbit:steely-v2`**) — loads **`steely_orbit_target`** ( **`gce-memory/fingerprints/steely_orbit_target.json`** — V6-compatible density through bar **56**, bars **57–64** thinned for Steely handoff; **`gceScore`** tracks V2.1 baseline **7.42**) and runs **`validateSteelyOrbitV2FingerprintGate`** before combined GCE ( **`STEELY_ORBIT_V2_FINGERPRINT_RULE_COUNT`** = **5** ). **Density:** global 8-bar mean abs **≤ 0.4** (**`STEELY_V2_DENSITY_EIGHT_MAX`**); windows overlapping **57–64** use **`STEELY_V2_DENSITY_ZONE_MAX`** (default **0.65**) via **`DensityEightBarTransitionZone`**. Drum / section / melody-streak env as before. No export if combined **< `STEELY_GCE_GATE`** (default **7.3** empirical BB gate).
- **Maintenance:** **`npm run gce:seed-structural-fingerprints`** in **`engines/composer-os-v2`** regenerates JSON from **`projects/Orbit/V6.0 orbit - BB.musicxml`** and **`projects/Orbit/Steely Orbit - 1st 64 bars/V1.7-Steely-Orbit.musicxml`**.

## HTTP API — `POST /api/melodic-variation-pack`

Local dev server: **`scripts/startComposerOsAppApi.ts`** (default **`http://127.0.0.1:3001`**). **Desktop:** same payload via IPC **`composer-os-api:melodic-variation-pack`**.

**Request (JSON)**

| Field | Type | Notes |
|--------|------|--------|
| `melody` | `{ pitch: number, duration: number }[]` | Pitch = MIDI; `duration` = quarter-note units. Contract name **NoteEvent** in product docs = this minimal shape (not full score `NoteEvent`). |
| `chords` | `string[]` | Lead-sheet symbols per bar or harmonic span (e.g. **`Cmaj7`**, **`Am9`**); length drives default GCE section span when `sections` omitted. |
| `variationCount` | `number` | Clamped **3–5** server-side. |
| `songwriterId` | `string` | Canonical or alias (**`normalizeSongwriterStyleKey`**); unknown → **400**. |
| `sections` | optional | Override GCE Structure & Form (`label`, `barStart`, `barEnd`, optional `role`). |

**Response (success)**

| Field | Type | Notes |
|--------|------|--------|
| `success` | `true` | |
| `scoringMode` | `"melody-only"` | Stub duo score for GCE; arrangement pillar reflects placeholder bass part. |
| `melody` | same as request | Echoed. |
| `variations` | array | Length ≤ `variationCount`; sorted by **`gceScore`** descending. Each item: **`melody`**, **`gceScore`** (0–10 overall), **`transform`** (`MotifTransform` — which mutation produced the row). |

**Response (error)** — `{ "success": false, "error": string }` with HTTP **400** for validation failures when using the HTTP route.

## V9.0 baseline (chords & export)

**Unified chord semantics (#19)** — Done: normalization before parsing, shared parser/validator behaviour, standard jazz symbols accepted without hard failure (see guarantee in [CHANGELOG.md](./CHANGELOG.md) V9.0 section).

**MusicXML export stability** — Sibelius-safe rhythm encoding; undotted decomposition (no reliance on dotted-beat fractional tokens such as `1.5` / `0.75` in the export path); multi-voice export kept clean. Details: [CHANGELOG.md](./CHANGELOG.md) — *MusicXML Export (Stability)* and the Composer OS section in the [repo README](../README.md).

**Roadmap:** **#16 Chord Handling Robustness** is **DONE** — MusicXML export stabilised; GP8 is primary detailed chord-validation target; Sibelius accepted as simplification-prone fallback. Further UX around chord input may continue incrementally.

**#17 Diagnostics / Receipt Clarity** is **DONE** — Generation receipt now surfaces chord export diagnostics including parsed chord count, fallback count, Sibelius simplification flags, and slash-bass preservation. See [docs/generation-receipts-and-diagnostics.md](./generation-receipts-and-diagnostics.md).

## Guitar polyphony (Phase 18.2)

| Milestone | Status |
|-----------|--------|
| **18.2A** — Polyphony export / Sibelius-safe proof | **COMPLETE** |
| **18.2B** — Voice-2 behaviour (Wyble layer) | **IN PROGRESS** |

**Achieved so far:** dual voices stable in Sibelius and Guitar Pro 8; continuity layer working; internal motion partially working. **Open work** is phrase-level musical refinement (intention / direction), not export or score structure.

**Phase 18.2B.1 — Voice 2 diagnostics:** read-only metrics for Guitar/Bass Duo (bar coverage, density, rest gaps, activity runs, strong-beat vs offbeat entries) are emitted to console and the Generation Receipt UI; they do not change generation output.

**Phase 18.2B.2 — Voice 2 rhythm footprint:** the Wyble inner-voice inject path plans **one bar-level rhythm shape per active bar** (sustained bar, two slabs, offbeat hold, or rest fallback), with coverage targeting and gap limits — see root [CHANGELOG.md](../CHANGELOG.md).

## Phase labels (A / B / C / D)

These labels are used in product and handoff docs; boundaries are conceptual, not separate runtimes.

| Track | Meaning (typical) |
|--------|-------------------|
| **A** | Foundations: conductor, rhythm engine, score model, export, gates |
| **B** | Musical core: sections, density, register, behaviours, interaction |
| **C** | **Song Mode rhythm stack** — passes C1–C7 on the guitar–bass duo **32-bar Song Mode** path (hook-first identity, phrase engine, then overlays). |
| **D** | **Intent & control** — user-facing rhythm intent and resolution before downstream passes |

## Song Mode rhythm stack (C1–C7)

Order for the duo **32-bar** Song Mode golden path (after core duo build, before final bar-math seal):

### ContrapuntalLineEngine (duo golden path, pre-harmony-bar precompute)

On **`generateGoldenPathDuoScore`**, when **`isDuoGoldenPath`**, **`precomputeContrapuntalLines`** runs **before** every songwriter **`precompute*EffectiveHarmonyBars`** call (including Basie). For VRB ids **`bob_brookmeyer`** and **`bartok`** with **`contrapuntalLinePolicy.enabled`**, **`GenerationMetadata.contrapuntalLineSet`** receives an **`AbstractLineSet`** from **`ContrapuntalLineEngine`**. **`lineFirstHierarchy`** in **`voiceLeadingSolver.ts`** is **not** fed the line set; Brookmeyer’s harmony precompute may still set that flag separately. **Pass 3 scope:** metadata + smoke musical gate; MusicXML / part writers do not yet consume **`contrapuntalLineSet`**.

### Phrase Engine V2 (pre-C1 pass)

On the **guitar–bass duo** golden path, when **`songModeHookFirstIdentity`** is on and the preset is in the **guitar–bass duo family** with **32 bars**, **`generateGoldenPathDuoScore`** runs **Phrase Engine V2** immediately **before C1**: **`buildMotifPool`** on the working score, optional **`seedPoolFromHookIdentity`** when **`songModeHookIdentity`** is present on metadata, then **`applyPhraseEngineV2`** on the guitar part and **`applyBassMotifEcho`** on the bass part (same motif pool), replacing those parts on the score before the C1–C7 overlay chain.

1. **C1** — `songModeRhythmOverlayC1`: soft rhythm overlay on guitar (phrase-level overlays + note-level bias); preserves structure.
2. **C2** — Phrase rhythm intent is *derived inside C1/C2 layer* (phrase intent summaries, mode-scaled strength). Documented with C1 in code as the phrase-intent layer.
3. **C3** — `jamesBrownFunkOverlay` (optional James Brown funk overlay when enabled).
4. **C4** — `songModeOstinatoC4`: ostinato / hook bias (phrase-level, safety-first).
5. **C5 (two passes)** — **`songModeOstinatoC5`**: blend / feel interpolation + optional structural density (`applyC5DensityLayer`, `blendStrength`); then **`songModeControlC5`**: control layer — primary/secondary stack roles, caps, gentle velocity contrast; ties layers using resolved strength. A post–bar-math density pass may apply in `generateGoldenPathDuoScore` after `finalizeAndSealDuoScoreBarMath` (see CHANGELOG).
6. **C6** — `songModeExpressionC6`: expression (guitar velocity + articulation), yields to C5.
7. **C7** — `songModeSpaceC7`: space / rest operations within caps, yields to C5/C6.

**Central rule (D1):** Raw **rhythm intent** from the request is resolved **once** into per-phrase records (`rhythmIntentResolve` + metadata). Downstream passes read **effective strength** via `getEffectiveRhythmStrength` (from **resolved** weights + surprise), not raw UI fields. **UI → `GenerateRequest.intent` → `runGoldenPath` → resolution before overlays → C4–C7.**

## Songwriter id → chord tones (Wayne Shorter mode)

When Song Mode supplies a **primary songwriter** style, `runGoldenPath` resolves profiles via `resolveSongwritingStyles` and writes **`songwriterStyleId`** (and weight fields) onto **`generationMetadata`**. **`chordTonesForChordSymbolWithContext`** (`harmony/harmonyChordTonePolicy.ts`) forwards **`shorterMode: true`** into **`chordTonesForChordSymbol`** when the id is **`wayne_shorter`**. In **`chordSymbolAnalysis.ts`**, `shorterMode` rewires the heuristic `ChordToneSet` returned from symbol parsing to emphasise upper-extension pitch classes (post-bop, non-functional line flavour) instead of the default root–third–fifth–seventh mapping. Other profiles leave `shorterMode` off.

## D-phase status

| Item | Status |
|------|--------|
| **D1** | **Complete** — `RhythmIntentControl` types, optional `intent` on generate path, resolution into metadata, groove/space-aware effective strength for C4–C7 when intent is present; legacy path unchanged when `intent` is omitted. |
| **D2** | **In progress** — Song Mode UI sliders (Groove, Space, Expression, Surprise) feeding `GenerateRequest.intent`; pattern fixed at 0.5 in the wire contract unless extended later. |
| **D3** | **Upcoming** — not defined in code; reserved for future control work. |

## C-module status

- C4: done — UI control wired end-to-end; c4Strength reaches generationMetadata via Song Mode request path
- C5: done — `applySongModeOstinatoC5` + `applySongModeControlC5`; blendStrength + structural density layer (see CHANGELOG); control caps/velocity contrast
- C6: done — expression pass fully built and firing; velocity shaping, articulation, phrase emphasis, fail-safe restore
- C7: done — space pass fully built and firing; note-to-rest and merge ops, density caps, anti-oversparsity guard, fail-safe restore

## Text pipeline (high level)

```
User / API
  → GenerateRequest (optional intent)
  → runGoldenPath / runAppGeneration
  → build score (duo / ECM / Song Mode compile, etc.)
  → Song Mode 32: ensure rhythm intent resolved into metadata
  → C1 → C3 (optional) → C4 → C5 → C6 → C7
  → finalize bar math → export MusicXML → gates → manifest
```

## Current system status

- **Guitar–Bass Duo** and **ECM Chamber**: full MusicXML golden path; optional **32-bar** long-form for duo.
- **Song Mode**: compile + planning + duo MusicXML generation path via app API; rhythm intent applies on the **Song Mode duo MusicXML** path when `intent` is sent.
- **Big Band / String Quartet**: planning and/or realisation paths per preset (see engine README for module ids).

For version history after V8.0, see [CHANGELOG.md](./CHANGELOG.md). For pre-V8.0 detailed changelog entries, see [archive/composer-os/CHANGELOG_HISTORICAL.md](./archive/composer-os/CHANGELOG_HISTORICAL.md).
