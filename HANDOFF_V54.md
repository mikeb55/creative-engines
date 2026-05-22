# HANDOFF V54

**Date:** 2026-05-17  
**Anchor commit:** `4a59eb02` (`feat(vrb): Webern VRB complete`)  
**Branch:** `main`  
**Supersedes:** `HANDOFF_V53.md` — **do not reopen the V53 thread.**

---

## WHAT IS COMPLETE SINCE V53

### Webern VRB — built and active

| Field | Value |
|-------|--------|
| **Profile file** | `engines/composer-os-v2/core/counterpoint/vrbProfiles/webernSqVrb.ts` |
| **σ ceiling** | **40** st per phrase (hard); soft warning above **45** |
| **independenceLevel** | `high` |
| **phraseArticulation** | `aphoristic_cell_silence_bounded` |
| **registerPolicy** | `extreme_pointillist_leaps_all_registers` |
| **phraseCellBars** | 1–3 (row completion = phrase boundary in serial context) |
| **authenticCadenceCredit** | none — no tonal gravity; cadential resolution not a valid phrase ending |
| **modalEndingsValid** | `false` |
| **BB pairing** | **brookmeyer** (primary) / **mingus** (secondary) |
| **Tests** | `webernSqVrb.test.ts` — **29/29** standalone, all passing |
| **Picker** | **enabled** (no longer greyed) |
| **Registry** | `sqVrbProfileRegistry.ts` → `webern` |
| **Bundles** | `voiceRuleBundles.ts` → `webern` / `anton_webern` via `applyWebernSqVrbProfile` |
| **GCE** | `gceAutoScorers.ts` — MI/PG/cadence/σ branches guarded by `vrbId === 'webern'` |

**Key implementation notes:**

- Silence **≥ 1 beat** = hard phrase boundary (primary structural articulator).
- Looping cell **penalized** (inverse of Glass); loop penalty threshold **0.78** (not 0.38 — was clamping ic1-saturated lines to 5.5).
- **1–2 voice** Klangfarbenmelodie texture: **not** penalized as sparse.
- **ic1/ic2** vertical saturation credited; isolated extreme-register tones credited (σ widening from pointillist leaps allowed).
- Row completion = valid phrase boundary in serial context.

**Commit:** `4a59eb02`

**Not in this commit (still untracked locally):** `HANDOFF_V53.md`, `docs/FILM_COMPOSER_GUIDE.md`, `docs/FILM_COMPOSER_GUIDE.docx`, `scripts/generateFilmComposerGuideDocx.mjs`

---

## SQ HARMONIC VOICE PICKER — CURRENT STATE

**12 active** (enabled in `SQ_TO_BB_SQ_COMPOSER_ENABLED` + UI):

| # | Composer | Notes |
|---|----------|--------|
| 1 | Bartók | Native SQ bundle; σ **24** default path; not in `sqVrbProfileRegistry` film-stub table |
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
| 12 | **Webern** | **NEW this handoff** |

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
| goldsmith | 24 | doubly_open_cell_development | schneider |
| **bartók** | **24** | strict imitation / quartet grammar (native bundle) | brookmeyer |
| williams | 26 | romantic_periodic_cadential | schneider |
| zimmer | 26 | repeating_ostinato_no_cadence | schneider |
| shostakovich | 28 | asymmetric_cell_non_resolving | mingus |
| herrmann | 36 | ostinato_cell_based | brookmeyer |
| **webern** | **40** | aphoristic_cell_silence_bounded | **brookmeyer** |

**Prior σ ceilings unchanged** by Webern ship (verified in `testPriorVrbsUnchanged`).

---

## STANDALONE TEST COUNTS

Film-stub / SQ profile tests (`run*FilmStubVrbTests` / `runRavelSqVrbTests` / `runShostakovichSqVrbTests` / `runWebernSqVrbTests`). Run per file:

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
| **Total** | **221** | **all passing** |

**NOT in smoke allowlist** — `engines/composer-os-v2/tests/runSmokeTests.ts` does not import these suites. Adding them would raise the aggregate PASS count above **248**.

---

## SMOKE BASELINE

```text
npm run test:composer-smoke
→ Passed: 248
→ Failed: 0
→ Suites: 63 (allowlist in runSmokeTests.ts)
```

Unchanged after Webern VRB (`4a59eb02`).

---

## ROADMAP (updated from V53)

1. **Joni Mitchell VRB** — next after this handoff.
2. **Architecture doc update** — add **film stub VRB** section to `docs/COMPOSER_OS_ARCHITECTURE.md` (picker, registry, GCE branches, σ table).
3. **Chord parser V2** — deferred from V50; still parked.

**Completed since V53 roadmap (for traceability):** Webern SQ→BB Harmonic Voice (#1 on prior “next composer” lane).

---

## NEXT SESSION ENTRY POINT

**Joni Mitchell** — write **Perplexity research prompt** first (same workflow as Morricone/Williams/Goldsmith/Zimmer/Badalamenti/Shostakovich/Webern film-stub builds).

Suggested read order before coding:

1. `engines/composer-os-v2/core/counterpoint/vrbProfiles/webernSqVrb.ts` (latest film-stub pattern)
2. `engines/composer-os-v2/core/counterpoint/vrbProfiles/webernSqVrb.test.ts`
3. `engines/composer-os-v2/core/gce/gceAutoScorers.ts` — search `webern` (add Joni Mitchell branches only; do not edit Shostakovich, Bartók, or other vrbId blocks)
4. `sqVrbProfileRegistry.ts`, `sqToBbWorkflowTypes.ts`, `sqToBbWorkflowUi.ts`

---

## INVARIANTS (carry forward — anchor `4a59eb02`)

These must hold on every SQ Harmonic Voice / film-stub change unless explicitly revising the contract.

### 1. Smoke aggregate

```bash
npm run test:composer-smoke
```

- **248** passing, **0** failing (or higher only if new suites are added to `runSmokeTests.ts`).

### 2. Prior VRB σ ceilings (hard)

Do not change existing `registerCohesionStdevCeilingSt` in profile rows or GCE branches:

| vrbId | σ |
|-------|---|
| glass | 18 |
| rota | 19 |
| ravel | 20 |
| badalamenti | 21 |
| morricone | 22 |
| goldsmith | 24 |
| bartók | 24 |
| williams | 26 |
| zimmer | 26 |
| shostakovich | 28 |
| herrmann | 36 |

Webern **40** is additive; not a retune of the above.

### 3. Non-SQ paths unchanged

Song Mode slices, duo golden path, legacy `getIntervalTarget` defaults, and non-contrapuntal GCE paths must not regress when adding film-stub branches.

### 4. Gate A — Bartók seed 50021

```bash
cd engines/composer-os-v2
npx ts-node --project ../../tsconfig.json scripts/gateASqBbGceVerify.ts
```

- **BARTOK_50021_MI_PG_RAW_GATE2** must pass.
- Gate 2 overall **≥ 8.5 / 10**.

### 5. Bartók GCE branch untouched

- Do **not** modify Bartók-specific logic in `gceAutoScorers.ts` (there is no `sqVrbId === 'bartok'` film-stub branch today; keep it that way).
- Bartók quartet behaviour stays on the native `VoiceRuleBundle` + `ContrapuntalLineEngine.buildBartokLineSet` path.

### 6. Shostakovich GCE branch untouched

- When adding a new VRB, add **Webern-style additive blocks** only; do not edit existing `shostakovich` MI/PG/cadence logic unless fixing a Shostakovich-specific bug.

### 7. Film-stub test discipline

- Each new VRB: standalone `*.test.ts`, **≥ 16** assertions, `testPriorVrbsUnchanged` (or equivalent σ table).
- Run smoke after each touched production file when building a new profile.

### 8. Registry hygiene

- **Add** new `sqVrbProfileRegistry` entries; do not reorder or edit existing profile constants unless fixing a bug.

### 9. Picker wiring

- Enable in **both** `SQ_TO_BB_SQ_COMPOSER_ENABLED` and `SQ_TO_BB_SQ_COMPOSER_OPTIONS` (`enabled: true`).
- Add `sqLineVrbIdForSqToBb` branch.

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
| Smoke allowlist | `engines/composer-os-v2/tests/runSmokeTests.ts` |
| Gate A | `engines/composer-os-v2/scripts/gateASqBbGceVerify.ts` |
| Contrapuntal invariants | `engines/composer-os-v2/core/counterpoint/INVARIANTS.md` |

---

## RECENT COMMITS (context)

| Commit | Summary |
|--------|---------|
| `4a59eb02` | Webern VRB complete (this handoff) |
| `8fd95e4a` | Shostakovich VRB complete |
| `712ce167` | Wave 2 — Rota, Goldsmith, Glass, Zimmer, Badalamenti |
| `dd9490a2` | Morricone + Williams film stub VRBs |

---

*End HANDOFF V54.*
