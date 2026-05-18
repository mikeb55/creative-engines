# HANDOFF V57

**Date:** 2026-05-17  
**Anchor commit:** `b5ccebb4` (`feat(test): smoke fast tier — COMPOSER_OS_SMOKE_TIER=fast gate`)  
**Branch:** `main`  
**Supersedes:** `HANDOFF_V56.md` — **do not reopen the V56 thread.**

---

## WHAT IS COMPLETE SINCE V56

### Smoke fast tier — built and wired

| Field | Value |
|-------|--------|
| **Commit** | `b5ccebb4` — `feat(test): smoke fast tier — COMPOSER_OS_SMOKE_TIER=fast gate` |
| **Core** | `engines/composer-os-v2/tests/runSmokeTests.ts` |
| **Env gate** | `COMPOSER_OS_SMOKE_TIER=fast` \| `full` (unset → **full**, backward compatible) |

**`SMOKE_FAST_EXCLUDE`** — 7 heaviest suites omitted from fast tier (typical per-suite `run()` time on dev machine):

| Suite label | ~ms |
|-------------|-----|
| App API boundary | 3574 |
| Frank Zappa songwriter slice | 801 |
| SD3 drum guide export (MIDI + JSON sidecar) | 726 |
| Import harmony ensemble (Big Band / String Quartet) | 707 |
| Phase 6+7 — instrumentGroup MusicXML (quartet + guitar TAB) | 660 |
| Indie guitar_2 Song Mode comp (ChordEvent quality) | 601 |
| Charlie Parker songwriter slice | 449 |

**Runner UX:**

- Header: `[smoke] Composer OS v2 — tier=fast` or `tier=full`
- Summary: `Passed: N rows (M suites)`

**New scripts:**

| Scope | Script |
|-------|--------|
| Engine | `npm run test:smoke-fast` (`engines/composer-os-v2/package.json`) |
| Repo root | `npm run test:composer-smoke-fast` |

**CI:** `.github/workflows/smoke.yml` unchanged — **`test:composer-smoke`** remains the gate (full tier). Comment added: `# fast tier: test:composer-smoke-fast (local dev only — not wired to CI)`.

**Measured baselines (local, 2026-05-17):**

| Tier | Rows | Suites | Failed | Wall clock |
|------|------|--------|--------|------------|
| **full** (`test:composer-smoke`) | **248** | **63** | **0** | **~20.7 s** |
| **fast** (`test:composer-smoke-fast`) | **213** | **56** | **0** | **~13.7 s** |

**Delta:** ~**7.0 s** faster (~**34%** wall-clock reduction); **35** fewer PASS rows; **7** suites skipped.

**Files touched:** `runSmokeTests.ts`, `engines/composer-os-v2/package.json`, root `package.json`, `smoke.yml` (comment only).

**Untouched (invariant):** `runAllTests.ts`, `runAllTestsChunk*.ts`, `tests/harness/fastExcludeSuites.ts`.

---

## SQ HARMONIC VOICE PICKER — CURRENT STATE

**13 active** (enabled in `SQ_TO_BB_SQ_COMPOSER_ENABLED` + UI):

| # | Composer | Notes |
|---|----------|--------|
| 1 | Bartók | Native SQ bundle; σ **24**; not in `sqVrbProfileRegistry` film-stub table |
| 2 | Ravel | |
| 3 | Herrmann | |
| 4 | Morricone | |
| 5 | Williams | |
| 6 | Rota | |
| 7 | Goldsmith | |
| 8 | Glass | |
| 9 | Zimmer | |
| 10 | Badalamenti | |
| 11 | Shostakovich | |
| 12 | Webern | |
| 13 | Joni Mitchell | |

**Greyed:** none — all SQ Harmonic Voice slots built.

**UI source:** `apps/composer-os-app/src/types/sqToBbWorkflowUi.ts`  
**Engine source:** `engines/composer-os-v2/core/counterpoint/sqToBbWorkflowTypes.ts`

---

## VRB REGISTRY (σ ascending)

Film-stub / SQ Harmonic Voice profiles in `sqVrbProfileRegistry.ts` (+ Bartók native path):

| vrbId | σ ceiling | phraseArticulation (summary) | bestBbStyle |
|-------|-----------|------------------------------|-------------|
| glass | 18 | looping_cell_no_cadence | schneider |
| rota | 19 | strict_periodic_tonal_cadence | schneider |
| ravel | 20 | periodic_cadential | schneider |
| badalamenti | 21 | through_composed_arch_no_cadence | schneider |
| morricone | 22 | folk_modal_suspended | schneider |
| joni_mitchell | 23 | four_bar_periodic_suspended_non_resolving | schneider |
| goldsmith | 24 | doubly_open_cell_development | schneider |
| **bartók** | **24** | strict imitation / quartet grammar (native bundle) | brookmeyer |
| williams | 26 | romantic_periodic_cadential | schneider |
| zimmer | 26 | repeating_ostinato_no_cadence | schneider |
| shostakovich | 28 | asymmetric_cell_non_resolving | mingus |
| herrmann | 36 | ostinato_cell_based | brookmeyer |
| webern | 40 | aphoristic_cell_silence_bounded | brookmeyer |

**Prior σ ceilings unchanged** by V56/V57 work (no VRB profile or GCE edits).

---

## STANDALONE TEST COUNTS

### VRB profiles

Film-stub / SQ profile tests. Run per file:

```bash
cd engines/composer-os-v2
npx ts-node --project ../../tsconfig.json core/counterpoint/vrbProfiles/<name>.test.ts
```

| vrbId | Tests | Status |
|-------|-------|--------|
| glass | 22 | pass |
| rota | 20 | pass |
| ravel | 13 | pass |
| badalamenti | 24 | pass |
| morricone | 16 | pass |
| goldsmith | 20 | pass |
| williams | 15 | pass |
| zimmer | 25 | pass |
| herrmann | 14 | pass |
| shostakovich | 23 | pass |
| webern | 29 | pass |
| joni_mitchell | 31 | pass |
| **VRB total** | **252** | **all passing** |

**NOT in smoke allowlist** — VRB standalone suites do not run in `runSmokeTests.ts`. Adding them would raise full-tier PASS above **248**.

### Chord parser (SQ→BB)

| Suite | Tests | Harness | Smoke |
|-------|-------|---------|-------|
| `parseUserChordInput.test.ts` | **23** (11 v1 + 12 V2) | `runAllTestsChunk1.ts` | **not** in allowlist |

---

## SMOKE BASELINE (full tier — CI gate)

```text
npm run test:composer-smoke
→ Passed: 248 rows (63 suites)
→ Failed: 0
```

Unchanged contract after smoke fast tier ship (`b5ccebb4`) — all **63** suites still run when tier is full (default).

---

## SMOKE FAST BASELINE (local dev)

```text
npm run test:composer-smoke-fast
→ Passed: 213 rows (56 suites)
→ Failed: 0
→ Wall clock: ~13.7 s (typical dev machine; ~34% faster than full)
```

**Not in CI.** Use for iteration; run full smoke before merge.

---

## ROADMAP (updated from V56)

1. **Export-truth consolidation**
2. **Multi-chorus quality** — solo session (high blast radius)
3. **Lead-sheet MusicXML import phase 3+**
4. **Composer depth** — Ligeti Song Mode slice; slice eval for Pärt / Satie / Ornette / Gershwin / Porter

**Completed since V56 roadmap (for traceability):**

- Smoke fast tier — `COMPOSER_OS_SMOKE_TIER` gate + `test:composer-smoke-fast` (`b5ccebb4`).

---

## NEXT SESSION ENTRY POINT

**Export-truth consolidation** — read-only recon first.

Ask Cursor to read the export layer and report current state (harmony/manifest/fingerprint chain, LOCK checks, known drift) **before** writing an implementation prompt.

Suggested read order:

1. `HANDOFF_V57.md` (this file) — smoke tiers + baselines
2. `docs/COMPOSER_OS_ROADMAP.md` — § export-truth / manifest items
3. `engines/composer-os-v2/core/export/` — entry points and diagnostics
4. `docs/generation-receipts-and-diagnostics.md` — receipt fields for export truth

---

## INVARIANTS (carry forward — anchor `b5ccebb4`)

These must hold on every SQ Harmonic Voice / film-stub / chord-parser / smoke change unless explicitly revising the contract.

### 1. Smoke aggregate (full tier)

```bash
npm run test:composer-smoke
```

- **248** rows passing, **63** suites, **0** failing (or higher only if new suites are added to `runSmokeTests.ts` full allowlist).

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
| rota | 19 |
| ravel | 20 |
| badalamenti | 21 |
| morricone | 22 |
| joni_mitchell | 23 |
| goldsmith | 24 |
| bartók | 24 |
| williams | 26 |
| zimmer | 26 |
| shostakovich | 28 |
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
| SQ→BB chord parser | `engines/composer-os-v2/core/counterpoint/parseUserChordInput.ts` |
| Chord parser tests | `engines/composer-os-v2/core/counterpoint/parseUserChordInput.test.ts` |
| Smoke allowlist | `engines/composer-os-v2/tests/runSmokeTests.ts` |
| Smoke fast script | `npm run test:composer-smoke-fast` |
| Full harness (chunks) | `engines/composer-os-v2/tests/runAllTests.ts` |
| Fast exclude (harness) | `engines/composer-os-v2/tests/harness/fastExcludeSuites.ts` |
| CI smoke workflow | `.github/workflows/smoke.yml` |
| Gate A | `engines/composer-os-v2/scripts/gateASqBbGceVerify.ts` |
| Export layer | `engines/composer-os-v2/core/export/` |
| Architecture (VRB section) | `docs/COMPOSER_OS_ARCHITECTURE.md` |

---

## RECENT COMMITS (context)

| Commit | Summary |
|--------|---------|
| `b5ccebb4` | Smoke fast tier — `COMPOSER_OS_SMOKE_TIER` gate (this handoff anchor) |
| `6917adf3` | HANDOFF V56 (docs) |
| `86b43051` | Chord parser V2 |
| `babb0c9e` | Architecture doc — SQ Harmonic Voice VRB registry |
| `7397215a` | Joni Mitchell VRB complete |

---

*End HANDOFF V57.*
