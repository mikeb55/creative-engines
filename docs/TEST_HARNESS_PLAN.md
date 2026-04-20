# Composer OS V2 — test harness plan

**Scope:** `engines/composer-os-v2` only. **Goal:** predictable **fast** vs **full** entrypoints, per-suite timing, and a maintainable quarantine list — not to hide debt silently.

## Entrypoints

| Command | Behaviour |
|---------|-----------|
| `npm test` | **Full** harness (same as `npm run test:full`). Exit **1** if any case fails — debt remains visible. |
| `npm run test:full` | Explicit full `tests/runAllTests.ts` (mode `full`). |
| `npm run test:fast` | Subset: drops suites listed in `tests/harness/fastExcludeSuites.ts` (heavy / golden-path / debt-heavy). **Target:** exit **0** on a clean tree; refresh exclusions when fixing failures. |

**Environment (optional):**

- `COMPOSER_OS_TEST_MODE=fast|full` — same as argv `fast` / `full` if argv not passed.
- `COMPOSER_OS_SKIP_STAGE_EXIT_GATES=1` — skips **Stage Exit Gates** only (retro aggregate; noisy when upstream gates fail). TODO: fold back into full once retro green.
- `COMPOSER_OS_TEST_EXCLUDE_SUBSTR=a,b` — comma-separated **substring** match on suite names (extra quarantine for local bisect).

**Repo root (orchestration only):**

- `npm run test:composer-fast` → `npm --prefix engines/composer-os-v2 run test:fast`
- `npm run test:composer-full` → `npm --prefix engines/composer-os-v2 run test:full`

## Heap / OOM

Full harness uses `node --max-old-space-size=4096`. If OOM returns (ECM 32-bar, multi-preset), see **docs/COMPOSER_OS_ROADMAP.md** known issues and **docs/TEST_DEBT_COMPOSER_OS_V2.md** — prefer raising heap in the npm script or splitting processes; **fast** mode avoids the heaviest golden-path suites.

## Future (not required for this pass)

- Optional **tag** env e.g. `COMPOSER_OS_TEST_TAGS=ecm,bigband` to run slices (needs suite metadata).
- CI matrix: **fast** on every PR, **full** nightly.
