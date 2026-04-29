# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Recent update (2026-04-29)

**Summary of work**

- **Registry / engine:** `bill_evans` is a first-class `SongwriterRuleId` (registry, style profile, comp profile, aliases). There is still no `billEvansSlice.ts` golden-path slice; generation uses the generic keys path until a slice exists.
- **Generate UI:** Songwriter and Arranger dropdowns use `<optgroup>` groupings; Song Mode has helper copy for arranger/era pairing. **Accessibility:** `label` `htmlFor` ↔ control `id`, `aria-describedby` to visually hidden optgroup context (and Song Mode Era → existing pairing paragraph `id`). Implemented in **`apps/composer-os-app/src/pages/HomeGenerate.tsx`** for Song Mode, Big Band, and String Quartet rows.
- **Docs:** Roadmap (ECM sweep note, Bacharach/Fagen product note, smoke checklist); **`docs/USER_GUIDE.md`** + **`UserGuide.tsx`** describe grouped dropdowns; **`docs/CHANGELOG.md`** — Composer OS entry dated **2026-04-29** (empty **`[Unreleased]`** until the next drop).

**Suggestions for developers today**

1. After UI changes under **`apps/composer-os-app/`**, run **`npm run build`** in that package (or **`npm run dev`** for manual QA).
2. Before merging engine/harness changes, run **`npm run test:composer-smoke`** and confirm the aggregate PASS count matches **`CLAUDE.md`** and **`docs/COMPOSER_OS_ROADMAP.md`** “Current” when you change **`engines/composer-os-v2/tests/runSmokeTests.ts`**.
3. New or moved songwriter rows in grouped dropdowns: keep **`SONGWRITER_GROUP_*` / `SONGWRITER_OPTIONS`** in sync and extend **a11y** copy in **`HomeGenerate.tsx`** if group labels or semantics change.
4. For a full slice (e.g. future `billEvansSlice`), follow **`brianWilsonPetSoundsSlice.ts`**, add smoke + eval script pattern, and log in **`CHANGELOG.md`**.

## Commands

### Testing

```bash
# Smoke tier (~5 min) — prints aggregate PASS count from engines/composer-os-v2/tests/runSmokeTests.ts (47 rows / 14 suites as of 2026-04-29; update CLAUDE + roadmap Current after allowlist edits)
npm run test:composer-smoke

# Fast tier (~15–20 min)
npm run test:composer-fast

# Full tier (~30–45 min, 4 sequential Node processes to manage heap)
npm run test:composer-full

# Run a single test file directly
npx ts-node --project tsconfig.json engines/composer-os-v2/tests/brianWilsonPetSoundsSliceSmoke.test.ts
```

### Evaluation (songwriter slice diagnostics)

```bash
npm run eval:brian_wilson   # outputs to /output/brian_wilson-eval/
npm run eval:stevie_wonder
npm run eval:radiohead
npm run eval:james_brown
npm run eval:joni_mitchell
npm run eval:sonic_youth
npm run eval:pat_metheny
```

### Dev servers

```bash
npm run dev              # React/Vite web app + Express API
npm run desktop:dev      # Electron desktop app (Windows)
npm run desktop:build    # Build desktop executable
npm run desktop:package  # Package NSIS + portable installers
```

## Architecture

### Primary engine: `engines/composer-os-v2/` (TypeScript)

The core of the project is a deterministic generative composition pipeline. A seeded request flows through:

```
app-api/generateComposition
  → runGoldenPath              # preset-specific path selection
  → buildScore                 # songwriter slice, duo, ECM, Big Band, String Quartet
  → C1–C7 Rhythm Overlays      # Song Mode only (soft rhythm → funk → ostinato → expression → space)
  → Phrase Engine (Stages 2–4) # sequencing → anticipation → motif rhythm → cadences
  → finalizeAndSeal            # bar math validation
  → exportMusicXML             # Sibelius-safe polyphonic MusicXML
  → readiness gates            # integrity checks
  → OutputManifest
```

Key files:
- `core/conductor/conductor.ts` — main pipeline orchestrator
- `core/goldenPath/generateGoldenPathDuoScore.ts` — duo guitar/bass entry point
- `core/song-mode/songModeBuilder.ts` — Song Mode request → score compilation
- `core/phrase/phraseBuilder.ts` — 4-stage phrase engine
- `core/export/scoreToMusicXml.ts` — MusicXML exporter
- `app-api/appApiServer.ts` — HTTP/IPC gateway (web + desktop share this)
- `core/compositionContext.ts` — central metadata + request typing

### Songwriter slices (`core/song-mode/`)

Each of the 7 writer slices (Brian Wilson, Stevie Wonder, Radiohead, James Brown, Joni Mitchell, Sonic Youth, Pat Metheny) follows the same pattern:
- 5 harmonic devices (`d1–d5`), each with eligibility gates + anti-elaboration guards
- `buildEffectiveHarmonyBars()` precomputes altered progressions
- Results routed through `customLockedHarmonyRouting` into MusicXML
- Evaluation harness: `eval:<name>` script, smoke: `*Slice.test.ts`

Use `core/song-mode/brianWilsonPetSoundsSlice.ts` as the canonical pattern when adding new writer slices.

### Apps

- `apps/composer-os-app/` — React 18 + Vite 5 web UI, Express 4 backend
- `apps/composer-os-desktop/` — Electron 28 desktop wrapper (Windows)

The Electron app and web app share the same `app-api/` backend; `app-api/appApiTypes.ts` defines the `GenerateRequest` / `OutputManifest` contract.

### Secondary engines

- `engines/wayne-shorter-engine/` — Python 3.11, composer IR for instrumental (non-songwriter) composition
- `engines/jimmy-wyble-engine/` — Guitar voice-2 polyphonic dynamics (Wyble layer)
- `engines/big-band-architecture-engine/`, `engines/ellington-orchestration-engine/` — ensemble scoring
- `engines/contemporary-counterpoint-engine/` — counterpoint rules

### Key design patterns

**Deterministic generation:** All generation is seeded (same `seed` → identical output). Never use `Math.random()` directly.

**Receipts/Diagnostics:** Every generation emits `GenerationMetadata` with `{*Receipt, *Diagnostics, *Devices}` — this is the primary debugging interface. Preserve this pattern when adding new pipeline stages.

**Preset-driven:** 40+ presets control ensemble type, scoring rules, rhythm style. New composition modes go through presets, not new code paths.

**Guard pattern:** Multi-pass validation; "guards" at each pipeline stage prevent invalid harmony transitions. Don't skip guards to get output — fix the guard or the input.

**Test harness heap management:** The full test suite runs as 4 sequential Node processes (`runAllTestsChunk1–4`) each with `--max-old-space-size=4096`. Don't add expensive suites to chunks that are already near the memory limit.

## Documentation

- `docs/COMPOSER_OS_ARCHITECTURE.md` — system design + phase labels (A/B/C/D)
- `docs/COMPOSER_OS_ROADMAP.md` — strategic vision + past/current/future roadmap (canonical roadmap source)
- `docs/CHANGELOG.md` — detailed feature history, searchable by date/feature
- `docs/TEST_DEBT_COMPOSER_OS_V2.md` — test tier structure + known gaps
- `.cursor/rules/composer-os-roadmap-request.mdc` — when generating roadmap content, use canonical title format from `docs/COMPOSER_OS_ROADMAP.md`

## CI

`.github/workflows/test.yml` runs on push/PR to `main`: Python 3.11 + pytest for the Wayne Shorter engine. TypeScript tests are not in CI — run `npm run test:composer-smoke` locally before merging.
