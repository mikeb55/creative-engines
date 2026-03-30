# Composer OS — Architecture

## Overview

**Composer OS** (`engines/composer-os-v2/`) is a single generative pipeline for jazz/chamber-style outputs: preset → planning → score build → integrity → MusicXML export → validation → readiness. **Apps** (`apps/composer-os-app`, `apps/composer-os-desktop`) call the shared **app API** (`engines/composer-os-v2/app-api/`), not the engine core directly.

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
5. **C5** — `songModeControlC5`: **control layer** — primary/secondary stack roles, caps, gentle velocity contrast; ties layers using resolved strength.
6. **C6** — `songModeExpressionC6`: expression (guitar velocity + articulation), yields to C5.
7. **C7** — `songModeSpaceC7`: space / rest operations within caps, yields to C5/C6.

**Central rule (D1):** Raw **rhythm intent** from the request is resolved **once** into per-phrase records (`rhythmIntentResolve` + metadata). Downstream passes read **effective strength** via `getEffectiveRhythmStrength` (from **resolved** weights + surprise), not raw UI fields. **UI → `GenerateRequest.intent` → `runGoldenPath` → resolution before overlays → C4–C7.**

## D-phase status

| Item | Status |
|------|--------|
| **D1** | **Complete** — `RhythmIntentControl` types, optional `intent` on generate path, resolution into metadata, groove/space-aware effective strength for C4–C7 when intent is present; legacy path unchanged when `intent` is omitted. |
| **D2** | **In progress** — Song Mode UI sliders (Groove, Space, Expression, Surprise) feeding `GenerateRequest.intent`; pattern fixed at 0.5 in the wire contract unless extended later. |
| **D3** | **Upcoming** — not defined in code; reserved for future control work. |

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
