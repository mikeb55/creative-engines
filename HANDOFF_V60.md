# HANDOFF V60

**Date:** 2026-05-18  
**Anchor commit:** `a27dac19` (`feat(rhythm): sq_swing engine — tempo-adaptive swing curve, Gershwin/Porter/Turtle Island wired`)  
**Branch:** `main`  
**Supersedes:** `HANDOFF_V59.md` — **do not reopen the V59 thread.**

---

## WHAT IS COMPLETE SINCE V59

### Smoke baselines (re-measured 2026-05-18)

| Tier | Command | Rows | Suites | Failed |
|------|---------|------|--------|--------|
| **full** (CI gate) | `npm run test:composer-smoke` | **279** | **65** | **0** |
| **fast** (local dev) | `npm run test:composer-smoke-fast` | **213** | **56** | **0** |

**Delta vs V59:** +20 rows, +1 suite (full); fast unchanged (new suite in `SMOKE_FAST_EXCLUDE`).

---

### SQ swing rhythm engine (`a27dac19`)

**What it does:** Applies tempo-adaptive swing displacement to off-beat notes in SQ→BB contrapuntal output. Based on Friberg–Sundström empirical model — swing ratio varies from ~3.5:1 at slow tempi to ~1:1 at fast tempi. Three swing styles: **jazz** (full), **concert** (Gershwin/Porter, slightly straighter), **folk_jazz** (lightest). Satie stays on grid. Anti-metric (Shostakovich/Ligeti) deferred to **sq_antimetric** engine.

#### New file

| File | Role |
|------|------|
| `engines/composer-os-v2/core/rhythm/sqSwingRhythmEngine.ts` | `swingRatio()`, `longNoteMs()`, `shortNoteMs()`, `SqSwingRhythmEnginePolicy`, `buildSwingPolicy()`, `applySwingTransform()`, `sqSwingRhythmEngineId()` |

#### VRB schema additions (`voiceRuleBundle.ts`)

- `swingStyle?: 'none' | 'jazz' | 'concert' | 'folk_jazz'`
- `swingIntensity?: number` (0.0–1.0)
- `sqRhythmEngineId?: string`
- Migration comment: ignore `swingStyle` / `swingIntensity` unless `sqRhythmEngineId === 'sq_swing'`

#### VRB rows updated (`voiceRuleBundles.ts`)

| Composer | swingStyle | swingIntensity |
|----------|------------|----------------|
| gershwin | concert | 0.65 |
| cole_porter | concert | 0.55 |
| turtle_island | jazz | 0.80 |
| satie | none | 0.0 |

#### Engine wired (`sqRhythmEngineId: 'sq_swing'`)

gershwin, cole_porter, turtle_island (not satie)

#### ContrapuntalLineEngine

Post-pass after `buildSwingChordLineSetForVrb`: `applySwingTransform()` when `bundle.sqRhythmEngineId === 'sq_swing'`. BPM from `styleOverrides.bpm` / `generationMetadata.bpm`, default **120**.

#### GCE extension (`gceAutoScorers.ts`)

- `RhythmExpectation` interface + optional 2nd param on `scoreRhythmicIdentity()`
- Blend: **0.8** generic + **0.2** style-conformance
- `rhythmExpectationForVrb()` presets:
  - gershwin / cole_porter / turtle_island → **swing**
  - satie / reich_glass → **grid**
  - shostakovich / ligeti → **anti_metric** (scorer ready; engine deferred)
  - all others → `undefined` (generic only)
- Wired in `sqToBbGceGates.ts` via `cp.sqVrbId`

#### Tests

- `engines/composer-os-v2/tests/sqSwingRhythm.test.ts` — **20 tests**, all PASS
- Registered in `runAllTestsChunk1.ts`
- Smoke label: `SQ swing rhythm engine (sq_swing)` (full tier only; fast exclude)

#### Shipped registry

`SHIPPED_SQ_RHYTHM_ENGINE_IDS` in `composerOsAppGeneration.ts` — **7** engines including `sq_swing`.

---

## SQ HARMONIC VOICE PICKER — CURRENT STATE

**17 composers** in registry; **13+** in SQ→BB UI (`SQ_TO_BB_SQ_COMPOSER_ENABLED`) including Satie, Cole Porter, Gershwin, Ligeti.

**UI field:** `sqToBbSqComposer` / `sectionVrbMap` → `sqLineVrbIdForSqToBb()` / per-section map → `context.voiceBundle`.

---

## VRB REGISTRY (σ ascending — all 17 composers)

Film-stub / SQ profiles in `sqVrbProfileRegistry.ts` + **bartók** native path:

| vrbId | σ ceiling | phraseArticulation (summary) | bestBbStyle |
|-------|-----------|------------------------------|-------------|
| glass | 18 | looping_cell_no_cadence | schneider |
| satie | 19 | aphoristic_cell_silence_bounded | schneider |
| rota | 19 | strict_periodic_tonal_cadence | schneider |
| ravel | 20 | periodic_cadential | schneider |
| badalamenti | 21 | through_composed_arch_no_cadence | schneider |
| morricone | 22 | folk_modal_suspended | schneider |
| joni_mitchell | 23 | four_bar_periodic_suspended_non_resolving | schneider |
| goldsmith | 24 | doubly_open_cell_development | schneider |
| **bartók** | **24** | strict imitation / quartet grammar (native) | brookmeyer |
| cole_porter | 25 | strict_periodic_tonal_cadence | schneider |
| williams | 26 | romantic_periodic_cadential | schneider |
| zimmer | 26 | repeating_ostinato_no_cadence | schneider |
| gershwin | 27 | romantic_periodic_cadential | schneider |
| shostakovich | 28 | asymmetric_cell_non_resolving | mingus |
| ligeti | 32 | micropolyphonic_stasis | schneider |
| herrmann | 36 | ostinato_cell_based | brookmeyer |
| webern | 40 | aphoristic_cell_silence_bounded | brookmeyer |

**Prior σ ceilings unchanged** except additive registry rows (satie, cole_porter, gershwin, ligeti).

---

## SMOKE BASELINE (full tier — CI gate)

```text
npm run test:composer-smoke
→ Passed: 279 rows (65 suites)
→ Failed: 0
```

---

## SMOKE FAST BASELINE (local dev)

```text
npm run test:composer-smoke-fast
→ Passed: 213 rows (56 suites)
→ Failed: 0
```

**Not in CI.** `SQ swing rhythm engine (sq_swing)` is in `SMOKE_FAST_EXCLUDE`.

---

## ROADMAP (updated from V59)

**COMPLETE since V59:**

- **sq_swing rhythm engine** (`a27dac19`)

**Next items (in order):**

1. **sq_antimetric engine** (Shostakovich + Ligeti)
2. **Wyble duo parity + BB Light Touch**
3. **ECM GCE orchestration**
4. **Melody V2 + cadenza**
5. **MIDI import**
6. **Pärt stub**
7. **3-way VRB blend** (within-section)
8. **Section boundary swing ramp**
9. **UI tooltips**
10. **Desktop rebuild**

**Deferred:** Ornette

---

## NEXT SESSION ENTRY POINT

**sq_antimetric engine recon** (read-only first — see session notes / agent report).

**Read first:**

1. `HANDOFF_V60.md` (this file)
2. `engines/composer-os-v2/core/rhythm/sqSwingRhythmEngine.ts` — pattern for post-pass engines
3. `engines/composer-os-v2/core/counterpoint/ContrapuntalLineEngine.ts` — `applySqSwingRhythmToLineSet` hook
4. `rhythmPolicy.antiMetric` / `phaseDisplacement` on Shostakovich + Ligeti VRB rows
5. `gceAutoScorers.ts` — `rhythmExpectationForVrb('shostakovich' | 'ligeti')` already returns `anti_metric`

---

## INVARIANTS (carry forward — anchor `a27dac19`)

These must hold on every SQ Harmonic Voice / film-stub / chord-parser / smoke change unless explicitly revising the contract.

### 1. Smoke aggregate (full tier)

```bash
npm run test:composer-smoke
```

- **279** rows passing, **65** suites, **0** failing (or higher only if new suites are added to `runSmokeTests.ts` full allowlist).

### 2. Smoke fast tier (local dev)

```bash
npm run test:composer-smoke-fast
```

- **213** rows passing, **56** suites, **0** failing.

### 3. Per-section VRB (V59)

- **`USE_PER_SECTION_VRB = true`** (feature live as of `100d7594`)
- **`hasExplicitPerSectionVrbAssignment()`** guards legacy single-VRB paths
- **Section labels:** canonical enum enforced at API boundary (`normalizeSectionVrbMap`)
- **Boundary seam:** max **2 semitones** per voice (`MAX_SEMITONES_PER_BAR_AT_SEAM`)
- **`perSectionVrb.test.ts`:** **29** tests passing (includes Glass→Shostakovich live fixture)

### 4. sq_swing engine (V60)

- **`sqSwingRhythm.test.ts`:** **20** tests passing
- **`swingStyle` / `swingIntensity` / `sqRhythmEngineId`** on `VoiceRuleBundle` (optional fields)
- **`sq_swing`** in `SHIPPED_SQ_RHYTHM_ENGINE_IDS` (engine #7)
- **Non-SQ `scoreRhythmicIdentity`:** unchanged when expectation omitted (no 2nd arg)

### 5. Prior VRB σ ceilings (hard)

Do not change existing `registerCohesionStdevCeilingSt` in profile rows or GCE branches:

| vrbId | σ |
|-------|---|
| glass | 18 |
| satie | 19 |
| rota | 19 |
| ravel | 20 |
| badalamenti | 21 |
| morricone | 22 |
| joni_mitchell | 23 |
| goldsmith | 24 |
| bartók | 24 |
| cole_porter | 25 |
| williams | 26 |
| zimmer | 26 |
| gershwin | 27 |
| shostakovich | 28 |
| ligeti | 32 |
| herrmann | 36 |
| webern | 40 |

### 6. Non-SQ paths unchanged

Song Mode slices, duo golden path, legacy `getIntervalTarget` defaults, and non-contrapuntal GCE paths must not regress when adding film-stub branches, chord-parser features, or smoke-tier filters.

### 7. Chord parser path isolation

- **SQ→BB user chords:** `parseUserChordInput.ts` only.
- Do **not** change `chordProgressionParser.ts`, `chordInputParser.ts`, or `chordInputAdapter.ts` unless explicitly scoped.

### 8. Smoke harness isolation

- **Fast tier** filters only inside `runSmokeTests.ts` via `SMOKE_FAST_EXCLUDE` — do **not** remove suites from the full allowlist.
- **`runAllTests.ts` / chunks / `fastExcludeSuites.ts`** — separate harness; leave unchanged unless doing full-harness work.

### 9. Gate A — Bartók seed 50021

```bash
cd engines/composer-os-v2
npx ts-node --project ../../tsconfig.json scripts/gateASqBbGceVerify.ts
```

- **BARTOK_50021_MI_PG_RAW_GATE2** must pass.
- Gate 2 overall **≥ 8.5 / 10**.

### 10. Bartók GCE branch untouched

- Do **not** modify Bartók-specific logic in `gceAutoScorers.ts` (no `sqVrbId === 'bartok'` film-stub branch; keep native bundle path).

### 11. Shostakovich GCE branch untouched

- Additive blocks only when adding VRBs; do not edit existing `shostakovich` MI/PG/cadence logic unless fixing a Shostakovich-specific bug.

### 12. Webern GCE branch untouched

- Do not edit existing `webern` MI/PG/cadence logic unless fixing a Webern-specific bug.

### 13. Film-stub test discipline

- Each new VRB: standalone `*.test.ts`, **≥ 16** assertions, `testPriorVrbsUnchanged` (or equivalent σ table).
- Run **full** smoke after each touched production file when building a new profile.

### 14. Registry hygiene

- **Add** new `sqVrbProfileRegistry` entries; do not reorder or edit existing profile constants unless fixing a bug.

### 15. Picker wiring

- Enable in **both** `SQ_TO_BB_SQ_COMPOSER_ENABLED` and `SQ_TO_BB_SQ_COMPOSER_OPTIONS` (`enabled: true`).
- Add `sqLineVrbIdForSqToBb` branch.

### 16. Chord parser v1 contract

- When `mismatchResolution` is **unset**: **N > M** and **N < M** remain **hard block** (v1 UX).
- **`stretch`** / **`compress`** are **opt-in** only.

### 17. Export truth

- **`assertExportTruth`** must remain on export paths touched by golden path / SQ→BB (`3b8db553`).

---

## KEY PATHS (quick reference)

| Area | Path |
|------|------|
| Swing engine | `engines/composer-os-v2/core/rhythm/sqSwingRhythmEngine.ts` |
| Swing tests | `engines/composer-os-v2/tests/sqSwingRhythm.test.ts` |
| Line engine hook | `engines/composer-os-v2/core/counterpoint/ContrapuntalLineEngine.ts` |
| Shipped rhythm ids | `engines/composer-os-v2/app-api/composerOsAppGeneration.ts` |
| VRB profiles | `engines/composer-os-v2/core/counterpoint/vrbProfiles/` |
| Per-section map | `engines/composer-os-v2/core/counterpoint/vrbProfiles/vrbContextMap.ts` |
| Resolver | `engines/composer-os-v2/core/counterpoint/vrbProfiles/vrbContextResolver.ts` |
| GCE | `engines/composer-os-v2/core/gce/gceAutoScorers.ts` |
| SQ→BB GCE gates | `engines/composer-os-v2/core/counterpoint/sqToBbGceGates.ts` |
| Smoke allowlist | `engines/composer-os-v2/tests/runSmokeTests.ts` |

---

## RECENT COMMITS (context)

| Commit | Summary |
|--------|---------|
| `a27dac19` | sq_swing rhythm engine + GCE rhythm expectation (V60 anchor) |
| `d00bace3` | Voicing-distance `computeTransitionBars` (V59 anchor) |
| `100d7594` | `USE_PER_SECTION_VRB = true` |
| `f79c20c3` | Per-section VRB types + labels |
| `0e2dfe0e` | Gershwin SQ VRB (V58 anchor) |

---

*End HANDOFF V60.*
