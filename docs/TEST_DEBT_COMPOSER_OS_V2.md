# Composer OS V2 — test debt baseline

**Date:** 2026-04-17  
**Scope:** `engines/composer-os-v2` only. This document is **test-debt triage / baselining**, not a claim that all failures are acceptable forever.

## How to use this doc

- **Known red (debt bucket):** `npm test` runs `tests/runAllTests.ts` — a large custom harness. As of this snapshot it still reports **individual `FAIL:` lines** in areas such as export / written-bar validation; treat **non-zero exit** here as **pre-existing debt** until the table below is refreshed after fixes.
- **Must stay green:** The **narrow** scripts below are the **regression bar** for duo / bass / Wyble-adjacent sweeps, counterpoint, ensemble regression, and vocal bridge. If any of these flip to **FAIL** on your branch, treat that as a **regression** unless you intentionally changed that subsystem.
- **New failures:** If `npm test` shows **new** `FAIL:` suites that are **not** listed in the debt notes, investigate before merging.

## Command status (snapshot 2026-04-17)

| Command | Status | Notes |
|--------|--------|--------|
| `npm run test:jest:counterpoint` | **PASS** | Jest — `voiceLeadingScorer` (counterpoint Phase 2). |
| `npm run test:duo` | **PASS** | ts-node — `duo-regression-sweep.ts` (32-bar duo / Wyble trace). |
| `npm run test:bass` | **PASS** | ts-node — `bass-phrase-sweep.ts` (18.2D bass phrase). |
| `npm run test:vocal` | **PASS** | ts-node — `test-vocal-lead-sheet.ts` (Song Mode vocal bridge). |
| `npm run test:composer-os-regression` | **PASS** | Jest — `phase191EnsembleRegression.test.ts` (Big Band / String Quartet metrics). |
| `npm test` | **FAIL (debt)** | `runAllTests.ts` — **many** suites pass; **at least** `FAIL:` seen in **Export** (e.g. plain major kind text) and **MusicXML written bar regression** in a partial run. **Do not use exit 0 as gate** until debt is cleared or subset is scripted. |

Run from **`engines/composer-os-v2`**:

```bash
cd engines/composer-os-v2
npm run test:duo
npm test
```

## Helper script (repo root)

From the **repository root**:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-baseline-composer-os-v2.ps1
```

Optional: `-IncludeRunAll` runs `npm test` as well (long). See script header.

## Next triage steps (not done in this pass)

1. Run `npm test` to completion; capture full **`FAIL:`** list into a dated subsection or log file.
2. Classify failures: export / golden path / song mode / app API / etc.
3. Fix or quarantine with **documented** skips (no silent deletion of tests).
4. Re-baseline this table when **must-stay-green** or **known-debt** sets change.

## Related

- [COMPOSER_OS_ROADMAP.md](COMPOSER_OS_ROADMAP.md) — product focus and test-debt note.
- [CHANGELOG.md](CHANGELOG.md) — triage changelog entries.
