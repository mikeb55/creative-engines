# HANDOFF V55

**Date:** 2026-05-17  
**Anchor commit:** `7397215a` (`feat(vrb): Joni Mitchell VRB complete`)  
**Branch:** `main`  
**Supersedes:** `HANDOFF_V54.md` — **do not reopen the V54 thread.**

---

## WHAT IS COMPLETE SINCE V54

### Joni Mitchell VRB — built and active

| Field | Value |
|-------|--------|
| **Profile file** | `engines/composer-os-v2/core/counterpoint/vrbProfiles/joniMitchellSqVrb.ts` |
| **σ ceiling** | **23** st per phrase (hard); soft warning above **27** |
| **independenceLevel** | `moderate` |
| **phraseArticulation** | `four_bar_periodic_suspended_non_resolving` |
| **registerPolicy** | `open_string_low_pedal_lyrical_soprano_arch` |
| **phraseCellBars** | 4 (base); 5-bar syllabic stretch valid |
| **authenticCadenceCredit** | none — sus2/sus4/maj7/maj9 endings valid; V→I not Mitchell language |
| **modalEndingsValid** | `true` (Mixolydian, Dorian, Aeolian) |
| **BB pairing** | **schneider** (primary + secondary) |
| **Tests** | `joniMitchellSqVrb.test.ts` — **31/31** standalone, all passing |
| **Picker** | **enabled** (13 active; nothing greyed) |
| **Registry** | `sqVrbProfileRegistry.ts` → `joni_mitchell` |
| **Bundles** | `voiceRuleBundles.ts` → `joni_mitchell` / `joni_mitchell_songwriter` via `applyJoniMitchellSqVrbProfile` |
| **GCE** | `gceAutoScorers.ts` — MI/PG/cadence/σ branches guarded by `vrbId === 'joni_mitchell'` |

**Key implementation notes:**

- **Three-tier texture** (idiomatic, not sparse): cello open-string pedal (C2–D3) / sustained quartal-sus inner (Vln II + Vla) / lyrical Vln I arc — **do not** penalize low inner-voice activity.
- **Phrase endings:** sus2 / sus4 / maj7 / maj9 **credited**; functional **V→I not credited**.
- **Phrase length:** 4-bar base; **5-bar** syllabic stretch **valid** (not penalized); 3-bar / 6-bar soft penalty.
- **Harmony:** **ic5** / **ic2** credited; **ic1 saturation not applied**; **tritone logic not applied**.
- **Loop MI penalty** only when `motifRecurrence > 0.85` **and** `intervalEconomy < 0.88` — quartal cells must not trigger Glass-style loop clamp.
- **Elision** (phrase end = phrase beginning / “hastening on”): idiomatic; do not flag overlapping phrase onsets.
- **Registral polarity** (low pedal + high melody) drives σ spread — not Webern pointillism.

**Commit:** `7397215a`

**Not in this commit (still untracked locally):** `HANDOFF_V53.md`, `HANDOFF_V54.md`, `docs/FILM_COMPOSER_GUIDE.md`, `docs/FILM_COMPOSER_GUIDE.docx`, `scripts/generateFilmComposerGuideDocx.mjs`

---

## SQ HARMONIC VOICE PICKER — CURRENT STATE

**13 active** (enabled in `SQ_TO_BB_SQ_COMPOSER_ENABLED` + UI):

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
| 12 | Webern | |
| 13 | **Joni Mitchell** | **NEW this handoff** |

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
| **joni_mitchell** | **23** | four_bar_periodic_suspended_non_resolving | **schneider** |
| goldsmith | 24 | doubly_open_cell_development | schneider |
| **bartók** | **24** | strict imitation / quartet grammar (native bundle) | brookmeyer |
| williams | 26 | romantic_periodic_cadential | schneider |
| zimmer | 26 | repeating_ostinato_no_cadence | schneider |
| shostakovich | 28 | asymmetric_cell_non_resolving | mingus |
| herrmann | 36 | ostinato_cell_based | brookmeyer |
| webern | 40 | aphoristic_cell_silence_bounded | brookmeyer |

**Prior σ ceilings unchanged** by Joni Mitchell ship (verified in `testPriorVrbsUnchanged`).

---

## STANDALONE TEST COUNTS

Film-stub / SQ profile tests (`run*FilmStubVrbTests` / `runRavelSqVrbTests` / `runShostakovichSqVrbTests` / `runWebernSqVrbTests` / `runJoniMitchellSqVrbTests`). Run per file:

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
| **Total** | **252** | **all passing** |

**NOT in smoke allowlist** — `engines/composer-os-v2/tests/runSmokeTests.ts` does not import these suites. Adding them would raise the aggregate PASS count above **248**.

---

## SMOKE BASELINE

```text
npm run test:composer-smoke
→ Passed: 248
→ Failed: 0
→ Suites: 63 (allowlist in runSmokeTests.ts)
```

Unchanged after Joni Mitchell VRB (`7397215a`).

---

## ROADMAP (updated from V54)

1. **Architecture doc update** — add **film stub VRB** section to `docs/COMPOSER_OS_ARCHITECTURE.md` (picker, registry, GCE branches, σ table; include `joni_mitchell`).
2. **Chord parser V2** — deferred from V50; still parked.

**Completed since V54 roadmap (for traceability):** Joni Mitchell SQ→BB Harmonic Voice (#1 on prior “next composer” lane).

---

## NEXT SESSION ENTRY POINT

**Architecture doc update** — add film stub VRB section to `docs/COMPOSER_OS_ARCHITECTURE.md`.

Suggested read order before editing:

1. `HANDOFF_V55.md` (this file) — σ table + picker state
2. `engines/composer-os-v2/core/counterpoint/vrbProfiles/joniMitchellSqVrb.ts` (latest film-stub pattern)
3. `engines/composer-os-v2/core/counterpoint/vrbProfiles/sqVrbProfileRegistry.ts`
4. `engines/composer-os-v2/core/gce/gceAutoScorers.ts` — search `sqVrbId ===` / `phraseGrammarMode` (document only; do not edit VRB branches unless fixing a doc/code mismatch)

---

## INVARIANTS (carry forward — anchor `7397215a`)

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
| webern | 40 |

Joni Mitchell **23** is additive; not a retune of the above.

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

- When adding a new VRB, add **additive blocks** only; do not edit existing `shostakovich` MI/PG/cadence logic unless fixing a Shostakovich-specific bug.

### 7. Webern GCE branch untouched

- Do not edit existing `webern` MI/PG/cadence logic unless fixing a Webern-specific bug.

### 8. Film-stub test discipline

- Each new VRB: standalone `*.test.ts`, **≥ 16** assertions, `testPriorVrbsUnchanged` (or equivalent σ table).
- Run smoke after each touched production file when building a new profile.

### 9. Registry hygiene

- **Add** new `sqVrbProfileRegistry` entries; do not reorder or edit existing profile constants unless fixing a bug.

### 10. Picker wiring

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
| Architecture (target doc) | `docs/COMPOSER_OS_ARCHITECTURE.md` |

---

## RECENT COMMITS (context)

| Commit | Summary |
|--------|---------|
| `7397215a` | Joni Mitchell VRB complete (this handoff) |
| `4a59eb02` | Webern VRB complete |
| `8fd95e4a` | Shostakovich VRB complete |
| `712ce167` | Wave 2 — Rota, Goldsmith, Glass, Zimmer, Badalamenti |

---

*End HANDOFF V55.*
