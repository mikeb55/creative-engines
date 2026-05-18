# HANDOFF V58

**Date:** 2026-05-18  
**Anchor commit:** `0e2dfe0e` (`feat(vrb): Gershwin VRB slice — σ=27, jazz-concert profile, 35+ receipts, 28 tests`)  
**Branch:** `main`  
**Supersedes:** `HANDOFF_V57.md` — **do not reopen the V57 thread.**

---

## WHAT IS COMPLETE SINCE V57

### Smoke baselines (re-measured 2026-05-18)

| Tier | Command | Rows | Suites | Failed |
|------|---------|------|--------|--------|
| **full** (CI gate) | `npm run test:composer-smoke` | **259** | **64** | **0** |
| **fast** (local dev) | `npm run test:composer-smoke-fast` | **213** | **56** | **0** |

**Delta vs V57:** **+11** PASS rows, **+1** suite (output validation layer in smoke allowlist — `d1295eca`). Fast tier unchanged.

---

### Shipped commits (V57 anchor `b5ccebb4` → V58 anchor `0e2dfe0e`)

| Commit | Summary |
|--------|---------|
| `3b8db553` | **Export-truth consolidation** — `assertExportTruth.ts`, `exportTruthAudit.ts`, golden-path + app-api wiring |
| `08e6fc42` | **Contrapuntal Pass 4** — `contrapuntalPass4MusicXmlMerge.ts`; SQ/BB MusicXML from `contrapuntalLineSet` |
| `3ff45cb1` | **Ligeti SQ VRB slice** — σ=32, micropolyphonic profile, `ligetiSqVrb.ts`, 24 tests |
| `38b62184` | **Long forms 40–64 bars** — duo/song full product quality (`songFormBarCounts`, modulation, pipeline truth) |
| `f7efda22` | **Film-stub VRBs → full receipts** — Herrmann, Morricone, Williams, Rota, Goldsmith, Glass, Zimmer, Badalamenti |
| `e1f583b7` | **Lead-sheet MusicXML import phase 3+** — writer parity, anchor expansion, `ParsedChart` handoff |
| `9ae35110` | **Satie + Cole Porter SQ VRB slices** — σ=19 / σ=25, registry + standalone tests |
| `d1295eca` | **Output validation layer** — MIDI + MusicXML + audio; MusicXML 4.0 XSD; smoke suite; CI workflow touch |
| `77ba9463` | **GM string playback** — `stringVoices.ts` (Tone.Sampler + FluidR3_GM); SQ→BB panel lane strips |
| `0e2dfe0e` | **Gershwin SQ VRB slice** — σ=27, jazz-concert profile, 28 tests |

---

## SQ HARMONIC VOICE PICKER — CURRENT STATE

**13 active** in SQ→BB UI (`SQ_TO_BB_SQ_COMPOSER_ENABLED`):

Bartók · Ravel · Herrmann · Morricone · Williams · Rota · Goldsmith · Glass · Zimmer · Badalamenti · Shostakovich · Webern · Joni Mitchell

**In registry but not SQ→BB picker yet:** Satie · Cole Porter · Gershwin · Ligeti (bundles + GCE σ wired; enable in picker = Commit 1 follow-up).

**UI field:** `sqToBbSqComposer` on generate payload → `sqLineVrbIdForSqToBb()` → `context.voiceBundle`.

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

**Prior σ ceilings unchanged** except **additive** rows (satie, cole_porter, gershwin, ligeti registry GCE).

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

## ROADMAP (updated from V57)

**IN PROGRESS:**

1. **Per-section VRB assignment (SQ→BB)** — `VrbWeight`, `SectionVrbContext`, `VrbContextMap`, `dominantVrb()`; per-section Harmonic Voice UI; backwards-compat single-entry map.

**COMPLETE since V57 (do not reschedule):**

- Export-truth consolidation (`3b8db553`)
- Contrapuntal Pass 4 MusicXML merge (`08e6fc42`)
- Long forms >32 bars / 40–64 product quality (`38b62184`)
- Film-stub VRBs full receipts (`f7efda22`)
- Lead-sheet import phase 3+ (`e1f583b7`)
- Output validation layer (`d1295eca`)
- Satie / Porter / Ligeti / Gershwin SQ VRB slices (`9ae35110`, `3ff45cb1`, `0e2dfe0e`)
- GM string playback on SQ→BB panel (`77ba9463`)

**Still open (unchanged priority):**

- Multi-chorus quality
- Duo golden-path depth (velocity balance deferred)
- Ligeti Song Mode slice (optional; SQ VRB ships)

---

## NEXT SESSION ENTRY POINT

**Per-section VRB assignment — Commit 1**

1. Await **Perplexity** advice on boundary resolver + blend semantics.
2. Implement **types** (`VrbWeight`, `SectionVrbContext`, `VrbContextMap`, `dominantVrb()`).
3. **UI:** per-section Harmonic Voice picker; wire `sqToBbSqComposer` → map (or successor field) on API payload.
4. Engine: default single-entry map when unset (current `sqLineVrbId` behaviour).

**Read first:**

1. `HANDOFF_V58.md` (this file)
2. Per-section VRB recon (session notes / `HANDOFF_V58` roadmap block)
3. `engines/composer-os-v2/core/counterpoint/sqToBbWorkflowTypes.ts`
4. `engines/composer-os-v2/app-api/sqToBbWorkflowApp.ts` — `buildSqToBbContext`, `sqLineVrbId`

---

## INVARIANTS (carry forward — anchor `0e2dfe0e`)

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

- **213** rows passing, **56** suites, **0** failing (subset; row count may shift if excluded suites change).

### 3. Prior VRB σ ceilings (hard)

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

### 4. Non-SQ paths unchanged

Song Mode slices, duo golden path, legacy `getIntervalTarget` defaults, and non-contrapuntal GCE paths must not regress when adding film-stub branches, chord-parser features, or smoke-tier filters.

### 5. Chord parser path isolation

- **SQ→BB user chords:** `parseUserChordInput.ts` only.
- Do **not** change `chordProgressionParser.ts`, `chordInputParser.ts`, or `chordInputAdapter.ts` unless explicitly scoped.

### 6. Smoke harness isolation

- **Fast tier** filters only inside `runSmokeTests.ts` via `SMOKE_FAST_EXCLUDE` — do **not** remove suites from the full allowlist.
- **`runAllTests.ts` / chunks / `fastExcludeSuites.ts`** — separate harness; leave unchanged unless doing full-harness work.

### 7. Gate A — Bartók seed 50021

```bash
cd engines/composer-os-v2
npx ts-node --project ../../tsconfig.json scripts/gateASqBbGceVerify.ts
```

- **BARTOK_50021_MI_PG_RAW_GATE2** must pass.
- Gate 2 overall **≥ 8.5 / 10**.

### 8. Bartók GCE branch untouched

- Do **not** modify Bartók-specific logic in `gceAutoScorers.ts` (no `sqVrbId === 'bartok'` film-stub branch; keep native bundle path).

### 9. Shostakovich GCE branch untouched

- Additive blocks only when adding VRBs; do not edit existing `shostakovich` MI/PG/cadence logic unless fixing a Shostakovich-specific bug.

### 10. Webern GCE branch untouched

- Do not edit existing `webern` MI/PG/cadence logic unless fixing a Webern-specific bug.

### 11. Film-stub test discipline

- Each new VRB: standalone `*.test.ts`, **≥ 16** assertions, `testPriorVrbsUnchanged` (or equivalent σ table).
- Run **full** smoke after each touched production file when building a new profile.

### 12. Registry hygiene

- **Add** new `sqVrbProfileRegistry` entries; do not reorder or edit existing profile constants unless fixing a bug.

### 13. Picker wiring

- Enable in **both** `SQ_TO_BB_SQ_COMPOSER_ENABLED` and `SQ_TO_BB_SQ_COMPOSER_OPTIONS` (`enabled: true`).
- Add `sqLineVrbIdForSqToBb` branch.

### 14. Chord parser v1 contract

- When `mismatchResolution` is **unset**: **N > M** and **N < M** remain **hard block** (v1 UX).
- **`stretch`** / **`compress`** are **opt-in** only.

### 15. Export truth

- **`assertExportTruth`** must remain on export paths touched by golden path / SQ→BB (`3b8db553`).

---

## KEY PATHS (quick reference)

| Area | Path |
|------|------|
| VRB profiles | `engines/composer-os-v2/core/counterpoint/vrbProfiles/` |
| Registry | `engines/composer-os-v2/core/counterpoint/vrbProfiles/sqVrbProfileRegistry.ts` |
| Types | `engines/composer-os-v2/core/counterpoint/vrbProfiles/sqVrbProfileTypes.ts` |
| GCE | `engines/composer-os-v2/core/gce/gceAutoScorers.ts` |
| Bundles | `engines/composer-os-v2/core/composer/voiceRuleBundles.ts` |
| Picker (engine) | `engines/composer-os-v2/core/counterpoint/sqToBbWorkflowTypes.ts` |
| Picker (UI) | `apps/composer-os-app/src/types/sqToBbWorkflowUi.ts` |
| SQ→BB app | `engines/composer-os-v2/app-api/sqToBbWorkflowApp.ts` |
| SQ→BB panel | `apps/composer-os-app/src/components/SqToBbWorkflowPanel.tsx` |
| String playback | `apps/composer-os-app/src/playback/stringVoices.ts` |
| Export truth | `engines/composer-os-v2/core/export/assertExportTruth.ts` |
| Output validation | `engines/composer-os-v2/tests/outputValidation/` |
| Smoke allowlist | `engines/composer-os-v2/tests/runSmokeTests.ts` |
| CI smoke workflow | `.github/workflows/smoke.yml` |
| Gate A | `engines/composer-os-v2/scripts/gateASqBbGceVerify.ts` |

---

## RECENT COMMITS (context)

| Commit | Summary |
|--------|---------|
| `0e2dfe0e` | Gershwin SQ VRB σ=27 (V58 anchor) |
| `77ba9463` | GM string playback (SQ→BB panel) |
| `d1295eca` | Output validation layer + smoke |
| `9ae35110` | Satie + Porter SQ VRB slices |
| `e1f583b7` | Lead-sheet phase 3+ |
| `f7efda22` | Film-stub VRBs full receipts |
| `38b62184` | Long forms 40–64 bars |
| `3ff45cb1` | Ligeti SQ VRB σ=32 |
| `08e6fc42` | Contrapuntal Pass 4 MusicXML |
| `3b8db553` | Export-truth consolidation |
| `b5ccebb4` | Smoke fast tier (V57 anchor) |

---

*End HANDOFF V58.*
