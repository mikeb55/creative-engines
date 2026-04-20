# Composer OS V2 — test debt baseline

**Date:** 2026-04-21 (harness refresh); prior notes from 2026-04-17 below.  
**Scope:** `engines/composer-os-v2` only. This document is **test-debt triage / baselining**, not a claim that all failures are acceptable forever.

## How to use this doc

- **Known red (full harness):** `npm test` and `npm run test:full` run `tests/runAllTests.ts` in **full** mode. Expect **exit 1** with many `FAIL:` lines until debt is cleared — treat as **pre-existing debt**, not an unexplained hang.
- **PR-friendly green:** `npm run test:fast` skips suites listed in `tests/harness/fastExcludeSuites.ts` (names that failed in a 2026-04-21 full triage). **Use this as the frequent local / CI smoke gate**; shrink the exclusion list as suites go green.
- **Must stay green:** The **narrow** scripts in the table below are the **regression bar** for duo / bass / Wyble-adjacent sweeps, counterpoint, ensemble regression, and vocal bridge. If any flip to **FAIL**, treat that as a **regression** unless you intentionally changed that subsystem.
- **New failures:** If `npm run test:full` shows **new** `FAIL:` suites outside known buckets, investigate before merging.

See **[TEST_HARNESS_PLAN.md](TEST_HARNESS_PLAN.md)** (fast vs full, env flags, root aliases).

## Command status (snapshot 2026-04-21)

| Command | Status | Notes |
|--------|--------|--------|
| `npm run test:jest:counterpoint` | **PASS** | Jest — `voiceLeadingScorer` (counterpoint Phase 2). |
| `npm run test:duo` | **PASS** | ts-node — `duo-regression-sweep.ts` (32-bar duo / Wyble trace). |
| `npm run test:bass` | **PASS** | ts-node — `bass-phrase-sweep.ts` (18.2D bass phrase). |
| `npm run test:vocal` | **PASS** | ts-node — `test-vocal-lead-sheet.ts` (Song Mode vocal bridge). |
| `npm run test:composer-os-regression` | **PASS** | Jest — `phase191EnsembleRegression.test.ts` (Big Band / String Quartet metrics). |
| `npm run test:fast` | **PASS** | `runAllTests.ts fast` — ~20s locally; **intended Composer OS v2 smoke gate**. |
| `npm test` / `npm run test:full` | **FAIL (debt)** | Full harness — e.g. **~40s**, **603 pass / 72 fail** on 2026-04-21 (4GB heap); no OOM in that run. Exit 1 until failures are fixed. |

**Repo root:** `npm run test:composer-fast`, `npm run test:composer-full`.

Run from **`engines/composer-os-v2`**:

```bash
cd engines/composer-os-v2
npm run test:duo
npm run test:fast
npm run test:full
```

## Helper script (repo root)

From the **repository root**:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-baseline-composer-os-v2.ps1
```

Optional: `-IncludeRunAll` runs `npm test` as well (long). See script header.

## Next triage steps

1. Drive **`FAIL:`** count down in **full** mode; remove suite names from `FAST_EXCLUDED_SUITE_NAMES` as they go green.
2. Classify failures: export / golden path / song mode / app API / duo / retro / GCE, etc.
3. Fix or quarantine with **documented** skips (no silent deletion of tests).
4. Re-baseline this table when **must-stay-green** or **known-debt** sets change.

## Related

- [TEST_HARNESS_PLAN.md](TEST_HARNESS_PLAN.md) — fast vs full, env hooks, npm script map.
- [COMPOSER_OS_ROADMAP.md](COMPOSER_OS_ROADMAP.md) — product focus and test-debt note.
- [CHANGELOG.md](CHANGELOG.md) — triage changelog entries.

## Dated notes (must-stay-green unchanged)

- **2026-04-21 — Harness (fast vs full, timings):** `tests/runAllTests.ts` logs per-suite timings and slowest 20 at end. **`test:fast`** excludes debt-heavy suite names in `tests/harness/fastExcludeSuites.ts`. Optional **`COMPOSER_OS_SKIP_STAGE_EXIT_GATES=1`** and **`COMPOSER_OS_TEST_EXCLUDE_SUBSTR`** documented in [TEST_HARNESS_PLAN.md](TEST_HARNESS_PLAN.md).

- **2026-04-17 — Heap / full-suite OOM (historical):** Earlier report: heap at 8192MB could still OOM; full suite was hard to trust in one process. **Current** full run at **4096MB** completed in ~40s without OOM on 2026-04-21 — if OOM returns (e.g. ECM long-form growth), prefer subprocess isolation or raising heap in the npm script; see roadmap / harness plan.

- **2026-04-17 — Song Mode Groove/Soul + Donald Fagen surfaces:** Optional Jest: `tests/songModeGrooveSoulSurface.test.ts`, `tests/songModeDonaldFagenSurface.test.ts` — not part of the five must-stay-green scripts; run when touching `songModeStyleSurface.ts` or Song Mode metadata wiring. The five baseline commands were re-run after the change and remained **PASS**; **`npm test`** debt bucket unchanged.
- **2026-04-17 — Wyble single-line parity (small patch):** After `runGoldenPath` duo-family sweep + `guitarVoice2WybleLayer` clarifications, the five **must-stay-green** commands above were re-run and remained **PASS**; **`npm test`** debt bucket unchanged (still not a merge gate).
- **2026-04-17 — Wyble “realized” normalization (tiny refinement):** After **`shouldApplyRealizedVoice2Normalization`** / Phase A probe tweaks, the five **must-stay-green** commands were re-run and remained **PASS**; **`npm test`** status unchanged.
