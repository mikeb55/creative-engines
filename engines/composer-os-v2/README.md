# V2.0 - Composer OS

**Composer OS** is a unified generative composition system — not a collection of isolated engines. It provides a single, disciplined pipeline through which all musical output flows, with validation gates and readiness scoring before any export is marked shareable.

---

## What Composer OS Is

Composer OS is the core architecture for generative composition in the creative-engines project. It coordinates:

- **Form** → **Feel** (Rhythm Engine) → **Harmony** → **Instrument behaviour** → **Counterpoint / texture** → **Score integrity** → **MusicXML export** → **MX validation** → **Readiness scoring** → **Release gate**

Every composition passes through this pipeline. Style modules and future musical modules plug in as **modifiers** to the shared `CompositionContext`, not as independent generators.

---

## Architectural Principles

### Modular Monolith

Composer OS is implemented as a **modular monolith**. Hard separation of concerns:

| Component | Responsibility |
|-----------|----------------|
| **Conductor** | Pipeline coordinator only |
| **Rhythm Engine** | Feel, syncopation, subdivision logic — returns constraints, not notes |
| **Primitives** | Shared data model only (motif, phrase, harmony, register, density) |
| **Style Modules** | Modifiers only — no independent generation pipelines |
| **Instrument Profiles** | Register, texture, MIDI identity, behaviour constraints |
| **Score Integrity** | Pre-export structural checks (release-blocking) |
| **Export** | MusicXML output only |
| **Readiness** | Scoring + release gating |
| **Run Ledger** | Manifest for replay/debug |

**No duplicated mini-pipelines.** One pipeline, many modifiers.

### Why Modules Are Modifiers, Not Engines

Style modules (e.g. future Metheny, Bacharach, Barry Harris, Triad Pairs) do **not** run their own pipelines. They receive a `CompositionContext` and return a modified context. The Conductor owns the pipeline; modules influence it. This prevents architectural drift and ensures validation and integrity gates always run.

### Why Score Integrity and Validation Come First

Nothing is exported or marked shareable until:

1. **Score Integrity Gate** passes (bar math, register, chord symbols, rehearsal marks)
2. **MusicXML validation** passes
3. **Readiness thresholds** pass (Release Readiness Gate + MX Readiness Score)

Validation gates are **release-blocking**. Musical expansion happens only within a valid, gated pipeline.

---

## Pipeline Overview

```
form
  → feel (Rhythm Engine)
  → harmony
  → instrument behaviour
  → counterpoint / texture
  → score integrity
  → MusicXML export
  → MX validation
  → readiness scoring
  → release gate
```

At this stage, the pipeline is implemented as types and stub logic. Deep music generation is intentionally deferred; the skeleton prioritises architecture, contracts, validation, and anti-drift design.

---

## CompositionContext

Every core system and future style module uses the shared **CompositionContext** type. It includes:

- `systemVersion`, `presetId`, `seed`
- `form`, `feel`, `harmony`, `motif`, `phrase`, `register`, `density`
- `instrumentProfiles`, `chordSymbolPlan`, `rehearsalMarkPlan`
- `generationMetadata`, `validation`, `readiness`

This is the **non-negotiable shared contract**. No module may bypass it.

---

## Instrument Profiles

Default assumptions:

- **Guitar** = Clean Electric Guitar (never acoustic guitar)
- **Bass** = Acoustic / Upright Bass (never vocal bass)

Profiles define hard ranges, preferred zones, danger zones, texture requirements (guitar), and harmonic anchor requirements (bass). Validation fails if tessitura drifts outside acceptable zones or required behaviour is missing.

---

## Presets

First-pass presets:

1. **guitarBassDuoPreset** — Clean Electric Guitar + Acoustic/Upright Bass, chord symbols and rehearsal marks enabled
2. **ecmChamberPreset** — ECM-style chamber configuration
3. **bigBandPreset** — Big band placeholder (minimal instrument set)

---

## What Is Intentionally Not Built Yet

- Composer-specific style modules (Metheny, Bacharach, Barry Harris, Triad Pairs)
- Deep music generation (motif generation, phrase generation, counterpoint)
- UI/launcher integration
- Full MusicXML rendering (stub only)
- Full big band instrumentation

This first build is the **skeleton**. Future modules plug in cleanly without architectural drift.

---

## Running Tests

```bash
npm run test --prefix engines/composer-os-v2
```

Or from the repo root:

```bash
npx ts-node --project tsconfig.json engines/composer-os-v2/tests/runAllTests.ts
```

---

## Directory Structure

```
engines/composer-os-v2/
  README.md
  package.json

  core/
    conductor/           # Pipeline coordinator
    rhythm-engine/       # Feel, syncopation, subdivision
    primitives/          # Shared data model
    instrument-profiles/ # Guitar, bass profiles
    style-modules/       # Registry for modifiers
    score-integrity/     # Pre-export gates
    export/              # MusicXML exporter, validation, Sibelius-safe
    readiness/           # RRG + MX readiness scoring
    run-ledger/          # Run manifest for replay/debug

  presets/               # guitarBassDuo, ecmChamber, bigBand
  tests/                 # Conductor, rhythm, instruments, integrity, readiness, export
```
