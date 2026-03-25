# V2.0 - Composer OS

**Composer OS** is a unified generative composition system — not a collection of isolated engines. It provides a single, disciplined pipeline through which all musical output flows, with validation gates and readiness scoring before any export is marked shareable.

**Docs:** [USER_GUIDE](../../docs/composer-os/USER_GUIDE.md) | [CHANGELOG](../../docs/composer-os/CHANGELOG.md) | [DEV_NOTES](../../docs/composer-os/DEV_NOTES.md)  
**Style modules:** [Barry Harris](core/style-modules/barry-harris/README.md) | [Metheny](core/style-modules/metheny/README.md) | [Triad Pairs](core/style-modules/triad-pairs/README.md) | [Bacharach](core/style-modules/bacharach/README.md)

---

## Implemented Stages

- **Foundation** — Conductor, rhythm engine, primitives, score integrity, MusicXML export
- **Golden Path** — 8-bar guitar-bass duo end-to-end (LOCK: motif-first `duoLock`, `duoLockQuality` GCE ≥ 8.5 + rhythm anti-loop, interaction `bassForward` in B)
- **Stage 2** — Musical core (section roles, density, register maps, instrument behaviours)
- **Stage 3** — Motif tracker, Barry Harris module
- **Stage 4** — Style system: Metheny, Triad Pairs, weighted style stack
- **Stage 5** — Interaction layer: guitar-bass coupling, register separation
- **Stage 6** — Output & Control: export hardening, locks, performance pass

**Demo stack:** primary barry-harris, secondary metheny, colour triad-pairs. **Interaction:** A support, B call_response.

**Prompt 2/7 (V3 track):** Declarative **conductor alignment** metadata (`core/conductor-alignment/`), **module invocation** capabilities + `song_mode_scaffold` registry entry, and **Song Mode** scaffold (section kinds + metadata; no new musical runtime). ECM behaviour unchanged. See [CHANGELOG](../../docs/composer-os/CHANGELOG.md).

**Prompt 3/7 (V3 track):** **Song Mode** structural pipeline — `runSongMode` → compiled song + lead-sheet contract + validation; registry id `song_mode_compile`. No golden-path or ECM changes; no full lead-sheet MusicXML export yet. See [SONG_MODE_INTEGRATION_NOTES](../../docs/composer-os/SONG_MODE_INTEGRATION_NOTES.md).

**Prompt 6.5/7 (V3 track):** **Songwriting research → rules** — bundled `core/song-mode/data/Songwriting.md` (override with **`COMPOSER_OS_SONGWRITING_RESEARCH`**), `songwritingResearchParser.ts`, `songwriterRuleRegistry.ts`, `songwriterStyleProfiles` + `songwriterStyleResolver.ts`, `authorOverlayResolver.ts`, `hookPlanner.ts`, `chorusPlanner.ts`, `melodyBehaviourPlanner.ts`, `applySongwritingRules.ts`. `runSongMode` accepts optional **primary/secondary songwriter style**, **author** overlay (Webb / Pattison / Perricone), **classical** overlay (Schubert / Schumann / Fauré); default primary style **`beatles`**. Output adds `songwriting` on `CompiledSong` and optional `songwritingHints` on `LeadSheetContract`.

**Prompt B/3 (V3 track):** **Song Mode — lead melody + singer range + prosody** — `leadMelodyPlanner` / contour + phrase planners emit a **sparse top-line plan** (anchor notes per bar, cadences, hook return, chorus lift within singer limits). **`singerRangeProfiles`** + **`validateMelodyAgainstSingerRange`**; **`prosodyPlanner`** + **`lyricPlaceholderPlanner`** for syllable slots and stress placeholders (author-aware when overlay matches Pattison / Webb / Perricone). **No final lyrics** — structure slots only. **`LeadSheetContract`** carries melody events, **prosodySlots**, **voiceMetadata**.

**Prompt 4/7 (V3 track):** **Shared orchestration layer** — `core/orchestration/` (types, planners, ensemble family profiles, validation, duo/chamber plan builders, ECM + Song Mode compatibility mappers). Declarative metadata in `orchestrationLayerMetadata.ts` and handoff map; no runtime rerouting.

**Prompt C/3 (V3 track):** **Ensemble realisation** — `core/voicing/` (spread/cluster vs density); **`runBigBandRealisation`** / **`runQuartetRealisation`** produce **ScoreModel** + MusicXML via **`runEnsembleExportPipeline`** (same exporter and bar-math gates as duo). Registry: **`big_band_realise`**, **`string_quartet_realise`**. Behavioural scoring only — not full professional arranging or contrapuntal engines.

**Prompt 5/7 (V3 track):** **Big Band planning module** — `core/big-band/` (`runBigBandMode`, form/section/density planners, `buildBigBandOrchestrationPlan` on shared orchestration), preset `big_band` with planning metadata, registry `big_band_plan`. **Prompt C/3** adds **`runBigBandRealisation`** + `big_band_realise`. See [BIG_BAND_INTEGRATION_NOTES](../../docs/composer-os/BIG_BAND_INTEGRATION_NOTES.md).

**Prompt 5.6/7 (V3 track):** **Big Band research → rules** — bundled `core/big-band/data/BigBandResearch.md` (override with `COMPOSER_OS_BIG_BAND_RESEARCH` or folder **`COMPOSER_OS_RESEARCH_DIR`** + `BigBandResearch.md`), `bigBandResearchParser.ts`, `bigBandRuleRegistry.ts`, `bigBandEraResolver.ts`, `bebopLinePlanner.ts` (line behaviour metadata), `applyBigBandRules.ts`, `bigBandResearchDrivenValidation.ts`. Preset defaults: **era** `post_bop`, optional **composer** style (`ellington` | `basie` | `thad` | `schneider`). `runBigBandMode` flow: form → sections → density → parse research → resolve era/composer → apply rules → orchestration → validation. Still **no full score**; planning JSON includes `enhancedPlanning` + `bebopLineMetadata` when relevant.

**Prompt 1/2 (V3 track intelligence):** **`core/style-pairing/`** — optional **songwriter ↔ arranger** pairing (`songwriterStyle`, `arrangerStyle`, optional `era`): **confidence** + **experimental** flag; **never blocks**. **`runSongMode`** / **`buildCompiledSong`** attach **`stylePairingResolution`** on `compiledSong.songwriting`; **`runBigBandMode`** can take the same pairing input and returns **`stylePairingResolution`** + non-fatal validation warnings. Big Band rules in the registry include **`priority`** (1–100).

**Prompt 2/2 (V3 track control / UX):** **`core/variation/`** — **`variationId` → seed** for user-facing labels; **`core/creative-controls/`** — **stable** / **balanced** / **surprise** (seed-only mutations; form unchanged). **`GenerateRequest`** optional **`variationId`** + **`creativeControlLevel`**; **`runBigBandMode`** optional **`ensembleConfigId`** (`full_band` … `custom`) + ensemble apply + orchestration **part weights**; sessions **v4** + named preset optional defaults. **Stable default:** omitting new fields matches previous runs.

**Prompt 6/7 (V3 track):** **String Quartet planning module** — `core/string-quartet/` (`runStringQuartetMode`, form/texture/density planners, `buildQuartetOrchestrationPlan` on shared orchestration), preset `string_quartet`, registry `string_quartet_plan`. **Prompt C/3** adds **`runQuartetRealisation`** + `string_quartet_realise`. See [STRING_QUARTET_INTEGRATION_NOTES](../../docs/composer-os/STRING_QUARTET_INTEGRATION_NOTES.md).

**Prompt 7/7 (V3 track — V1 product baseline):** **Web app + app/API boundary** — UI talks to `app-api/composerOsApiCore.ts` only; `composerOsAppGeneration.ts` maps presets to `generateComposition`, `runSongMode`, or planning-only JSON for big band / string quartet. **V1 capabilities** (see `releaseMetadata.ts` and `/api/diagnostics`): Guitar–Bass Duo and ECM Chamber = MusicXML generation; Song Mode = structural JSON + lead-sheet contract (no MusicXML lead sheet in this build); Big Band and String Quartet = planning JSON only. **Desktop:** `apps/composer-os-desktop` (Electron). See [CHANGELOG](../../docs/composer-os/CHANGELOG.md) and [apps/composer-os-app README](../../apps/composer-os-app/README.md).

**Easy wins + workflow power pack (usability):** **`core/presets-plus/`** — named aliases (incl. `songwriter_modern`, `chamber_development`, plus earlier eight) over existing base presets + optional `densityBias` hints + merge helpers. **`core/sessions/`** — JSON session save/load (`sessionStore.ts`), format **v1/v2/v3** with optional project memory (candidates, continuation ref) + **reference/import** metadata when used. **`core/candidates/`** — lightweight multi-seed `generateComposition` candidates + rank (best / second). **`core/diagnostics/`** — `buildDiagnosticsBundle` for short UI messages. **`core/lead-sheet/`** — `UniversalLeadSheet` + builders; `generateComposition` adds optional `universalLeadSheet`; `runSongMode` returns `universalLeadSheet`; **`runBigBandMode`** / **`runStringQuartetMode`** attach planning-level universal lead sheets (`N.C.` placeholders per section). **`core/chord-input/`** — forgiving text → `ChordSymbolPlan` scaffold. **`core/motif-plus/`** — extract / library / reuse suggestions. **`core/continuation/`** — validated continuation metadata. **`core/regeneration/`** — section regen gates + lock awareness. **`core/style-stack-presets/`** — reusable stacks (separate from named mode presets). **`core/performance-plus/`** — density bias + humanisation **metadata only** (no pitch edits).

**Reference / import intelligence (V3 Prompt A/3):** **`core/reference-import/`** — shared **`ReferencePiece`** contract; light **MusicXML** + **MIDI** + **lead-sheet text** parsers; **`referencePieceFromCompositionContext`** for internal outputs; **`extractReferenceBehaviour`** → **`ReferenceBehaviourProfile`**; **`applyReferenceInfluence`** produces **behavioural guidance only** (no note cloning). Optional fields on **sessions** and **run manifests** for reference source + influence summary.

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

The **golden path** implements: preset → feel → section roles → density curve → register map → motif → style modules → interaction planning → instrument behaviours → score construction → **performance pass** → export → integrity gate → behaviour gates → MusicXML export → MX validation → run manifest.

### Stage 2 — Musical Core

Adds section roles (statement, development, contrast, return), section-aware register maps, density curves, guitar/bass behaviour planners, and deepened rhythm engine (offbeat tendency, sustain tendency, attack density). New behaviour validation gates: rhythm identity, guitar texture integrity, bass harmonic integrity, section contrast.

### Stage 3 — First Intelligence

Adds motif tracker (generate, vary, place across A/B) and first style module (Barry Harris). Motif-driven melody; bass echoes motif fragments. Barry Harris: movement over static chords, guide-tone emphasis, stepwise voice-leading. Validation: motif integrity, style conformance.

### Stage 4 — Style System

Adds Metheny (lyrical, intervallic, longer arcs, reduced density) and Triad Pairs (Bergonzi/Klemons guitar-aware triad cells). Style stack: primary, secondary, colour with normalized weights. Validation: style blend integrity, triad pair integrity, Metheny conformance.

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

- Additional style modules (Bacharach, etc.)
- Deeper music generation (phrase, counterpoint from context)
- Launcher integration
- Full big band instrumentation

### Running the Golden Path Demo

```bash
npx ts-node --project tsconfig.json engines/composer-os-v2/scripts/runGoldenPathDemo.ts
```

Output is written to `outputs/composer-os-v2/golden_path_demo.musicxml`.

---

## What Is Intentionally Not Built Yet

- UI/launcher integration
- Full big band instrumentation
- Orchestration modules

The golden path proves the core system works; future modules plug in cleanly without architectural drift.

---

## Running Tests

```bash
npm run test --prefix engines/composer-os-v2
```

Retro self-test suite (stage regression + negative tests):

```bash
npm run test:retro --prefix engines/composer-os-v2
```

Or from the repo root:

```bash
npx ts-node --project tsconfig.json engines/composer-os-v2/tests/runAllTests.ts
```

**Rule:** No future stage is complete unless new tests are added, retro tests pass, and stage exit gates pass before commit/push.

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
    style-modules/       # Registry; barry-harris, metheny, triad-pairs
    interaction/         # Interaction planner, validation
    control/             # Lock system
    performance/         # Performance pass (articulation, no pitch change)
    score-model/         # Score types, event builder, validation
    score-integrity/     # Pre-export gates, behaviour gates
    export/              # MusicXML exporter, validation, Sibelius-safe
    readiness/           # RRG + MX readiness scoring
    run-ledger/          # Run manifest for replay/debug
    goldenPath/          # Golden path generator and runner

  presets/               # guitarBassDuo, ecmChamber, bigBand
  tests/                 # Conductor, rhythm, instruments, integrity, readiness, export, scoreModel, goldenPath
```
