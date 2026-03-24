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

The **golden path** implements: preset → feel → section roles → density curve → register map → instrument behaviours → score construction → integrity gate → behaviour gates → MusicXML export → MX validation → run manifest.

### Stage 2 — Musical Core

Adds section roles (statement, development, contrast, return), section-aware register maps, density curves, guitar/bass behaviour planners, and deepened rhythm engine (offbeat tendency, sustain tendency, attack density). New behaviour validation gates: rhythm identity, guitar texture integrity, bass harmonic integrity, section contrast.

### Stage 3 — First Intelligence

Adds motif tracker (generate, vary, place across A/B) and first style module (Barry Harris). Motif-driven melody; bass echoes motif fragments. Barry Harris: movement over static chords, guide-tone emphasis, stepwise voice-leading. Validation: motif integrity (recurrence, variation), style conformance.

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

## Golden Path Demo

The **first golden path** proves that Composer OS can generate one correct score end-to-end through the full pipeline.

### What It Does

- Generates an 8-bar guitar-bass duo score (Clean Electric Guitar + Acoustic/Upright Bass)
- Sections A (bars 1–4) and B (bars 5–8) with rehearsal marks at bars 1 and 5
- Chord symbols: Dmin9, G13, Cmaj9, A7alt (2 bars each)
- Sparse guitar melody/dyads in mid register; walking-style bass in upright bass register
- Passes Score Integrity Gate, MusicXML validation, and Sibelius-safe checks
- Produces a valid MusicXML file and run manifest

### Why It Is Intentionally Simple

This is a **correctness-first pass**, not a high-art composition pass. The goal is to prove the system can:

1. Build a real score from the score model
2. Validate it through the integrity gate
3. Export to MusicXML
4. Pass MX validation and readiness thresholds

### What It Proves

- The score model is the single source of truth for export
- No direct-to-MusicXML hacks; everything flows through the core pipeline
- Instrument identities, register discipline, and measure math are enforced
- Chord symbols and rehearsal marks are structurally complete

### What Remains to Be Built Next

- Composer-specific style modules (Metheny, Bacharach, Barry Harris, Triad Pairs)
- Deeper music generation (motif, phrase, counterpoint from context)
- Launcher integration
- Full big band instrumentation

### Running the Golden Path Demo

```bash
npx ts-node --project tsconfig.json engines/composer-os-v2/scripts/runGoldenPathDemo.ts
```

Output is written to `outputs/composer-os-v2/golden_path_demo.musicxml`.

---

## What Is Intentionally Not Built Yet

- Composer-specific style modules (Metheny, Bacharach, Barry Harris, Triad Pairs)
- Deep music generation (motif generation, phrase generation, counterpoint)
- UI/launcher integration
- Full big band instrumentation

The golden path proves the core system works; future modules plug in cleanly without architectural drift.

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
    motif/               # Motif generator, tracker, validation
    section-roles/       # Section role planner and validation
    register-map/        # Section-aware register planning
    density/             # Density curve planner
    instrument-behaviours/ # Guitar/bass behaviour planners
    primitives/          # Shared data model
    instrument-profiles/ # Guitar, bass profiles
    style-modules/       # Registry; barry-harris module
    score-model/         # Score types, event builder, validation
    score-integrity/     # Pre-export gates, behaviour gates
    export/              # MusicXML exporter, validation, Sibelius-safe
    readiness/           # RRG + MX readiness scoring
    run-ledger/          # Run manifest for replay/debug
    goldenPath/          # Golden path generator and runner

  presets/               # guitarBassDuo, ecmChamber, bigBand
  tests/                 # Conductor, rhythm, instruments, integrity, readiness, export, scoreModel, goldenPath
```
