# HANDOFF V59

**Date:** 2026-05-18  
**Anchor commit:** `d00bace3` (`fix(vrb): replace σ-delta approximation with actual voicing distance in computeTransitionBars`)  
**Branch:** `main`  
**Supersedes:** `HANDOFF_V58.md` — **do not reopen the V58 thread.**

---

## WHAT IS COMPLETE SINCE V58

### Smoke baselines (re-measured 2026-05-18)

| Tier | Command | Rows | Suites | Failed |
|------|---------|------|--------|--------|
| **full** (CI gate) | `npm run test:composer-smoke` | **259** | **64** | **0** |
| **fast** (local dev) | `npm run test:composer-smoke-fast` | **213** | **56** | **0** |

**Delta vs V58:** unchanged (259/64/0 full, 213/56/0 fast).

---

### Per-section VRB assignment (`f79c20c3` → `d00bace3`)

**What it does:** User assigns a different composer style profile (VRB) to each named section of an SQ→BB composition. Example: `opening=glass`, `development=shostakovich`, `reprise=ravel`, `coda=glass`. Each section generates harmony spine, contrapuntal lines, and GCE scoring under its own profile. Legacy single-VRB path unchanged and backwards compatible.

| Commit | Summary |
|--------|---------|
| `f79c20c3` | Types, mode-based section labels, UI picker (Ligeti/Satie/Porter/Gershwin) |
| `331e33f8` | API normalizer, section scaffold, UI per-section pickers |
| `6ed83ea9` | `vrbContextResolver`, feature-flagged call-site migration |
| `32937e0a` | Section-aware spine, boundary resolver, GCE per-section scoring |
| `19bf5740` | `globalFallback` vrbId mismatch fix (`sqLineVrbId` into normalizer) |
| `100d7594` | **`USE_PER_SECTION_VRB = true`** — feature live |
| `d00bace3` | **Commit 7:** `computeTransitionBarsFromVoicing` (voicing distance vs register centre) |

#### New files

| File | Role |
|------|------|
| `vrbContextMap.ts` | `VrbWeight`, `SectionVrbContext`, `VrbContextMap`, `dominantVrb()`, `buildGlobalVrbContextMap()`, `validateVrbWeights()`, `USE_PER_SECTION_VRB` |
| `sqToBbSectionLabels.ts` | `SqToBbSectionLabelMode` (`song` \| `instrumental`), canonical labels, `getSectionLabelsForMode()`, `isValidSectionLabel()` — default **`instrumental`** |
| `vrbContextResolver.ts` | `BarSectionContext`, `resolveVrbForBar()`, `hasExplicitPerSectionVrbAssignment()` |
| `normalizeSectionVrbMap.ts` | API ingestion, validation, `buildSqToBbFormSections()`, `assertSectionBarRanges()` |
| `harmonySpineSectionLoop.ts` | Section-aware spine loop, `isPhraseBoundary` tagging |
| `sectionBoundaryResolver.ts` | `SectionJoin`, `computeTransitionBarsFromVoicing()`, `computeTransitionBarsFromSigma()` (fallback), `resolveSectionBoundary()`, `joinConstraint()`, `MAX_SEMITONES_PER_BAR_AT_SEAM = 2` |
| `sqVrbGcePerBar.ts` | Per-bar GCE resolution, boundary merge (`max` / OR) |

#### Song / instrumental section labels

- **Song (6):** intro, verse, chorus, bridge, outro, sq_bb  
- **Instrumental (8):** opening, statement, transition, development, contrast, reprise, coda, sq_bb  

#### Files modified

- `sqToBbWorkflowApp.ts` — `normalizeSectionVrbMap` at ingest; `sqLineVrbId` passed as fallback  
- `appApiTypes.ts` — `sectionVrbMap?`, `sectionLabelMode?`  
- `SqToBbWorkflowPanel.tsx` — Song/Instrumental toggle, per-section VRB rows, lock with sketch phase  
- `harmonySpineProvider.ts` — `isPhraseBoundary` on `ResolvedHarmonyBar`  
- `harmonyResolution.ts` — per-bar VRB via resolver (explicit map only)  
- `gceAutoScorers.ts` — `sqGceAdjustmentsOverride` per-section (MI ~1134, PG ~1946)  
- `sqToBbGceGates.ts` — `resolveSqGceForBar` wired  
- `ContrapuntalLineEngine.ts` — `contextMap` + `sections` in constructor  
- `bigBandSectionPlanRenderer.ts` — explicit VRB param (not singleton)  
- `compositionContext.ts` — `sqToBbVrbContextBySection` threaded through  

#### UI picker fix (Commit 1)

Ligeti, Satie, Cole Porter, Gershwin added to SQ Harmonic Voice dropdown (were in registry but missing from UI).

#### Key design decisions

- **`hasExplicitPerSectionVrbAssignment()`** guards legacy paths — single-VRB compositions unaffected  
- **Boundary resolver:** max **2 semitones** per voice at seam  
- **`transitionBars`:** from **actual voicing distance** vs target register centre (`d00bace3`); σ-delta retained as `computeTransitionBarsFromSigma` fallback  
- **GCE boundary bars:** `max(A, B)` not average for numeric thresholds; OR for booleans  
- **Section labels:** canonical enum at API boundary — free-form keys throw  

#### Tests

- `perSectionVrb.test.ts` — **29 tests**, all passing  
- Glass→Shostakovich seam: all 4 assertions passing **without** `COMPOSER_OS_TEST_PER_SECTION_VRB=1`  

---

## SQ HARMONIC VOICE PICKER — CURRENT STATE

**17 composers** in registry; **13+** in SQ→BB UI (`SQ_TO_BB_SQ_COMPOSER_ENABLED`) including Satie, Cole Porter, Gershwin, Ligeti (Commit 1 picker fix).

**UI field:** `sqToBbSqComposer` / `sectionVrbMap` on generate payload → `sqLineVrbIdForSqToBb()` / per-section map → `context.voiceBundle`.

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
→ Passed: 259 rows (64 suites)
→ Failed: 0
```

---

## SMOKE FAST BASELINE (local dev)

```text
npm run test:composer-smoke-fast
→ Passed: 213 rows (56 suites)
→ Failed: 0
```

**Not in CI.** Use for iteration; run full smoke before merge.

---

## ROADMAP (updated from V58)

**COMPLETE since V58:**

- **Per-section VRB assignment** (Commits 1–7, `f79c20c3` → `d00bace3`)

**Next items (in order):**

1. **sq_swing rhythm engine**
2. **Wyble duo parity + BB Light Touch**
3. **ECM GCE orchestration**
4. **Melody V2 + cadenza**
5. **MIDI import**
6. **Pärt stub**
7. **3-way VRB blend** (within-section)
8. **UI tooltips**
9. **Desktop rebuild**

**Deferred:** Ornette  

**Resolved in V59:** `sectionBoundaryResolver.ts` σ-delta TODO → `computeTransitionBarsFromVoicing` (`d00bace3`)

---

## NEXT SESSION ENTRY POINT

**sq_swing rhythm engine — read-only recon first**

Ask Cursor to find all swing/rhythm policy files and report current state before writing any prompt.

**Read first:**

1. `HANDOFF_V59.md` (this file)
2. Swing/rhythm policy grep across `engines/composer-os-v2/`
3. `engines/composer-os-v2/core/composer/voiceRuleBundle.ts` — rhythmic fields

---

## INVARIANTS (carry forward — anchor `d00bace3`)

These must hold on every SQ Harmonic Voice / film-stub / chord-parser / smoke change unless explicitly revising the contract.

### 1. Smoke aggregate (full tier)

```bash
npm run test:composer-smoke
```

- **259** rows passing, **64** suites, **0** failing (or higher only if new suites are added to `runSmokeTests.ts` full allowlist).

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

### 4. Prior VRB σ ceilings (hard)

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

### 5. Non-SQ paths unchanged

Song Mode slices, duo golden path, legacy `getIntervalTarget` defaults, and non-contrapuntal GCE paths must not regress when adding film-stub branches, chord-parser features, or smoke-tier filters.

### 6. Chord parser path isolation

- **SQ→BB user chords:** `parseUserChordInput.ts` only.
- Do **not** change `chordProgressionParser.ts`, `chordInputParser.ts`, or `chordInputAdapter.ts` unless explicitly scoped.

### 7. Smoke harness isolation

- **Fast tier** filters only inside `runSmokeTests.ts` via `SMOKE_FAST_EXCLUDE` — do **not** remove suites from the full allowlist.
- **`runAllTests.ts` / chunks / `fastExcludeSuites.ts`** — separate harness; leave unchanged unless doing full-harness work.

### 8. Gate A — Bartók seed 50021

```bash
cd engines/composer-os-v2
npx ts-node --project ../../tsconfig.json scripts/gateASqBbGceVerify.ts
```

- **BARTOK_50021_MI_PG_RAW_GATE2** must pass.
- Gate 2 overall **≥ 8.5 / 10**.

### 9. Bartók GCE branch untouched

- Do **not** modify Bartók-specific logic in `gceAutoScorers.ts` (no `sqVrbId === 'bartok'` film-stub branch; keep native bundle path).

### 10. Shostakovich GCE branch untouched

- Additive blocks only when adding VRBs; do not edit existing `shostakovich` MI/PG/cadence logic unless fixing a Shostakovich-specific bug.

### 11. Webern GCE branch untouched

- Do not edit existing `webern` MI/PG/cadence logic unless fixing a Webern-specific bug.

### 12. Film-stub test discipline

- Each new VRB: standalone `*.test.ts`, **≥ 16** assertions, `testPriorVrbsUnchanged` (or equivalent σ table).
- Run **full** smoke after each touched production file when building a new profile.

### 13. Registry hygiene

- **Add** new `sqVrbProfileRegistry` entries; do not reorder or edit existing profile constants unless fixing a bug.

### 14. Picker wiring

- Enable in **both** `SQ_TO_BB_SQ_COMPOSER_ENABLED` and `SQ_TO_BB_SQ_COMPOSER_OPTIONS` (`enabled: true`).
- Add `sqLineVrbIdForSqToBb` branch.

### 15. Chord parser v1 contract

- When `mismatchResolution` is **unset**: **N > M** and **N < M** remain **hard block** (v1 UX).
- **`stretch`** / **`compress`** are **opt-in** only.

### 16. Export truth

- **`assertExportTruth`** must remain on export paths touched by golden path / SQ→BB (`3b8db553`).

---

## KEY PATHS (quick reference)

| Area | Path |
|------|------|
| VRB profiles | `engines/composer-os-v2/core/counterpoint/vrbProfiles/` |
| Per-section map | `engines/composer-os-v2/core/counterpoint/vrbProfiles/vrbContextMap.ts` |
| Resolver | `engines/composer-os-v2/core/counterpoint/vrbProfiles/vrbContextResolver.ts` |
| Section labels | `engines/composer-os-v2/core/counterpoint/vrbProfiles/sqToBbSectionLabels.ts` |
| Normalizer | `engines/composer-os-v2/app-api/normalizeSectionVrbMap.ts` |
| Boundary resolver | `engines/composer-os-v2/core/harmony/sectionBoundaryResolver.ts` |
| Section spine | `engines/composer-os-v2/core/harmony/harmonySpineSectionLoop.ts` |
| Registry | `engines/composer-os-v2/core/counterpoint/vrbProfiles/sqVrbProfileRegistry.ts` |
| GCE | `engines/composer-os-v2/core/gce/gceAutoScorers.ts` |
| Per-bar GCE | `engines/composer-os-v2/core/gce/sqVrbGcePerBar.ts` |
| SQ→BB app | `engines/composer-os-v2/app-api/sqToBbWorkflowApp.ts` |
| SQ→BB panel | `apps/composer-os-app/src/components/SqToBbWorkflowPanel.tsx` |
| Per-section tests | `engines/composer-os-v2/tests/perSectionVrb.test.ts` |
| Smoke allowlist | `engines/composer-os-v2/tests/runSmokeTests.ts` |

---

## RECENT COMMITS (context)

| Commit | Summary |
|--------|---------|
| `d00bace3` | Voicing-distance `computeTransitionBars` (V59 anchor) |
| `100d7594` | `USE_PER_SECTION_VRB = true` |
| `19bf5740` | globalFallback vrbId fix |
| `32937e0a` | Section spine + boundary + GCE per-section |
| `6ed83ea9` | vrbContextResolver + flag migration |
| `331e33f8` | API normalizer + UI pickers |
| `f79c20c3` | Per-section VRB types + labels |
| `0e2dfe0e` | Gershwin SQ VRB (V58 anchor) |

---

*End HANDOFF V59.*
