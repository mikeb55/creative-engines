# Composer OS — Architecture

## Overview

**Composer OS** (`engines/composer-os-v2/`) is a single generative pipeline for jazz/chamber-style outputs: preset → planning → score build → integrity → MusicXML export → validation → readiness. **Apps** (`apps/composer-os-app`, `apps/composer-os-desktop`) call the shared **app API** (`engines/composer-os-v2/app-api/`), not the engine core directly.

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
