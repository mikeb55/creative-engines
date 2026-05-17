# HANDOFF V56

**Date:** 2026-05-17  
**Anchor commit:** `86b43051` (`feat(chord-parser): V2 — beat-level slash, comma delimiter, stretch/compress mismatch resolution`)  
**Branch:** `main`  
**Supersedes:** `HANDOFF_V55.md` — **do not reopen the V55 thread.**

---

## WHAT IS COMPLETE SINCE V55

### Workstream 1 — Architecture doc update

| Field | Value |
|-------|--------|
| **Commit** | `babb0c9e` — `docs(architecture): add SQ Harmonic Voice VRB registry section` |
| **File** | `docs/COMPOSER_OS_ARCHITECTURE.md` only |
| **Section added** | **SQ Harmonic Voice — VRB Registry** |

**Contents shipped:**

- One-paragraph VRB definition (σ, independence, register, phrase articulation, cadence / interval credits, picker wiring).
- **13-row σ table** (glass → webern + joni_mitchell; Bartók noted as native bundle, not in `sqVrbProfileRegistry`).
- **GCE branch structure** — isolated `vrbId` branches in `gceAutoScorers.ts`; strictly additive.
- **Five per-VRB differentiator callouts:** Glass, Webern, Joni Mitchell, Shostakovich, Zimmer.
- **Standalone test table** — 252 VRB tests; smoke baseline **248/0** documented.

**No code changes** in this workstream.

---

### Workstream 2 — Chord parser V2

| Field | Value |
|-------|--------|
| **Commit** | `86b43051` — `feat(chord-parser): V2 — beat-level slash, comma delimiter, stretch/compress mismatch resolution` |
| **Core** | `engines/composer-os-v2/core/counterpoint/parseUserChordInput.ts` |
| **Tests** | `parseUserChordInput.test.ts` — **23/23** (11 v1 + 12 V2), all passing |
| **UI types** | `apps/composer-os-app/src/types/sqToBbWorkflowUi.ts` — `SqToBbChordMismatchResolution` extended with `stretch` \| `compress` |

**V2 features:**

1. **Beat-level slash continuation** — `Dm7 / G7` in one `\|…\|` cell → **1 bar**, **2** `beatLevelChords` (beat **0** + beat **2**, `beatDuration` **0.5** each). **`G/F`** (no spaces around `/`) remains **slash bass** — unchanged.
2. **Comma as bar delimiter** — `,` treated like `\|` for bar splitting; mixed `,` + `\|` valid; **`xN`** and **`N.C.`** still work after comma.
3. **Stretch / compress mismatch resolution (opt-in)** — `stretch`: **N < M** → proportional distribution across bars; `compress`: **N > M** → adjacent same-chord merge then truncate with warning. **v1 hard block** preserved when `mismatchResolution` unset.

**Untouched (invariant):** `chordProgressionParser.ts`, `chordInputParser.ts`, `chordInputAdapter.ts`.

**Harness:** `runAllTestsChunk1.ts` — suite **SQ→BB parseUserChordInput**; **not** in smoke allowlist.

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

**Prior σ ceilings unchanged** by V55/V56 work (no VRB profile or GCE edits in these commits).

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

**NOT in smoke allowlist** — `runSmokeTests.ts` does not import VRB standalone suites. Adding them would raise PASS above **248**.

### Chord parser (SQ→BB)

| Suite | Tests | Harness | Smoke |
|-------|-------|---------|-------|
| `parseUserChordInput.test.ts` | **23** (11 v1 + 12 V2) | `runAllTestsChunk1.ts` | **not** in allowlist |

```bash
cd engines/composer-os-v2
npx tsx -e "import { runParseUserChordInputTests } from './core/counterpoint/parseUserChordInput.test.ts'; const r=runParseUserChordInputTests(); console.log(r.filter(x=>!x.ok).map(x=>x.name)); process.exit(r.some(x=>!x.ok)?1:0);"
```

---

## SMOKE BASELINE

```text
npm run test:composer-smoke
→ Passed: 248
→ Failed: 0
→ Suites: 63 (allowlist in runSmokeTests.ts)
```

Unchanged after architecture doc (`babb0c9e`) and chord parser V2 (`86b43051`).

---

## ROADMAP (updated from V55)

1. **Smoke fast tier** — wire fast-tier gate in `runSmokeTests.ts`.
2. **Export-truth consolidation**
3. **Multi-chorus quality** — solo session (high blast radius)
4. **Lead-sheet MusicXML import phase 3+**
5. **Composer depth** — Ligeti Song Mode slice; slice eval for Pärt / Satie / Ornette / Gershwin / Porter

**Completed since V55 roadmap (for traceability):**

- Architecture doc — film stub VRB section in `docs/COMPOSER_OS_ARCHITECTURE.md` (`babb0c9e`).
- Chord parser V2 — beat-level slash, comma delimiter, stretch/compress (`86b43051`).

---

## NEXT SESSION ENTRY POINT

**Smoke fast tier** — read `engines/composer-os-v2/tests/runSmokeTests.ts` first, then write Cursor prompt.

Suggested read order:

1. `HANDOFF_V56.md` (this file) — smoke / parser / doc state
2. `engines/composer-os-v2/tests/runSmokeTests.ts` — current allowlist + suite comments
3. `docs/COMPOSER_OS_ROADMAP.md` — § smoke tier maintenance checklist (if present)
4. `CLAUDE.md` — aggregate **248** / **63** suites baseline

---

## INVARIANTS (carry forward — anchor `86b43051`)

These must hold on every SQ Harmonic Voice / film-stub / chord-parser change unless explicitly revising the contract.

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
| joni_mitchell | 23 |
| goldsmith | 24 |
| bartók | 24 |
| williams | 26 |
| zimmer | 26 |
| shostakovich | 28 |
| herrmann | 36 |
| webern | 40 |

### 3. Non-SQ paths unchanged

Song Mode slices, duo golden path, legacy `getIntervalTarget` defaults, and non-contrapuntal GCE paths must not regress when adding film-stub branches or chord-parser features.

### 4. Chord parser path isolation

- **SQ→BB user chords:** `parseUserChordInput.ts` only.
- Do **not** change `chordProgressionParser.ts`, `chordInputParser.ts`, or `chordInputAdapter.ts` for SQ→BB V2 work unless explicitly scoped.

### 5. Gate A — Bartók seed 50021

```bash
cd engines/composer-os-v2
npx ts-node --project ../../tsconfig.json scripts/gateASqBbGceVerify.ts
```

- **BARTOK_50021_MI_PG_RAW_GATE2** must pass.
- Gate 2 overall **≥ 8.5 / 10**.

### 6. Bartók GCE branch untouched

- Do **not** modify Bartók-specific logic in `gceAutoScorers.ts` (no `sqVrbId === 'bartok'` film-stub branch; keep native bundle path).

### 7. Shostakovich GCE branch untouched

- Additive blocks only when adding VRBs; do not edit existing `shostakovich` MI/PG/cadence logic unless fixing a Shostakovich-specific bug.

### 8. Webern GCE branch untouched

- Do not edit existing `webern` MI/PG/cadence logic unless fixing a Webern-specific bug.

### 9. Film-stub test discipline

- Each new VRB: standalone `*.test.ts`, **≥ 16** assertions, `testPriorVrbsUnchanged` (or equivalent σ table).
- Run smoke after each touched production file when building a new profile.

### 10. Registry hygiene

- **Add** new `sqVrbProfileRegistry` entries; do not reorder or edit existing profile constants unless fixing a bug.

### 11. Picker wiring

- Enable in **both** `SQ_TO_BB_SQ_COMPOSER_ENABLED` and `SQ_TO_BB_SQ_COMPOSER_OPTIONS` (`enabled: true`).
- Add `sqLineVrbIdForSqToBb` branch.

### 12. Chord parser v1 contract

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
| Chunk1 harness | `engines/composer-os-v2/tests/runAllTestsChunk1.ts` |
| Gate A | `engines/composer-os-v2/scripts/gateASqBbGceVerify.ts` |
| Contrapuntal invariants | `engines/composer-os-v2/core/counterpoint/INVARIANTS.md` |
| Architecture (VRB section) | `docs/COMPOSER_OS_ARCHITECTURE.md` |

---

## RECENT COMMITS (context)

| Commit | Summary |
|--------|---------|
| `86b43051` | Chord parser V2 — beat-level slash, comma, stretch/compress (this handoff anchor) |
| `babb0c9e` | Architecture doc — SQ Harmonic Voice VRB registry section |
| `7397215a` | Joni Mitchell VRB complete |
| `4a59eb02` | Webern VRB complete |
| `8fd95e4a` | Shostakovich VRB complete |

---

*End HANDOFF V56.*
