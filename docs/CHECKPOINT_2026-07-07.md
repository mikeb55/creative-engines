# Checkpoint — 2026-07-07 (priority 1a — golden drift consolidation)

Follows [CHECKPOINT_2026-07-06.md](./CHECKPOINT_2026-07-06.md). GCE + LOCK side-by-side comparison complete (golden fixture vs current engine). **Priority 1a substantially complete** — see DONE / REMAINING below.

## Prior work (unchanged)

- **Bucket B (DCR commit)** — `67ef7fce` — smoke/registry wiring drift fixed.
- **LF-normalize golden compare (DCR refine)** — `6ada6683` — shared `goldenFixtureCompare.ts`; premium-melody golden tests normalize committed `.musicxml` fixtures before byte-exact compare (cleared Bill Evans MusicXML row).
- **GCE + LOCK drift analysis (pre-regen)** — side-by-side via `runLeadSheetGceLockEval` on golden fixture vs current engine (`engines/composer-os-v2/scripts/_goldenGceCompare.ts`, scratch runner). Confirmed BH / Wayne / Hendrix GCE-positive drift with LOCK pass and no hard-gate violations; Bartok CLE harness mismatch documented below.

---

## DONE (priority 1a — 2026-07-07)

- **BH / Wayne / Hendrix goldens regenerated and committed** — `f8c17335` on `main`
  - Seeds: **88109** (BH) · **90217** (Wayne) · **90303** (Hendrix)
  - Pre-overwrite gates: pipeline-truth `input=pass score=pass export=pass`; `evaluateLock()` clean; no GCE hard-gate violations
  - Fixtures: 6 files under `engines/composer-os-v2/tests/golden/` (commit diff: 3 MusicXML files; JSON already matched HEAD byte-for-byte)
  - Smoke: **unexpected fail 9 → 3** (`npm run test:composer-smoke` full tier)
  - Fixed rows: `bhGoldenMaster` ×2 · `wayneGoldenMaster` ×2 · `jhGoldenMaster` ×2 (all PASS)

---

## REMAINING (2 items — out of scope for 1a, tracked separately)

1. **`bartokCleGoldenMaster`** — lineSet + trace JSON (seed **61234**) ×2 smoke rows
   - Known **harness mismatch**: leadsheet `runLeadSheetGceLockEval` does not apply to AbstractLineSet golden path
   - Needs **correct eval harness assigned** before any regen decision
   - Do not regen until harness task completes (separate scoped work)

2. **`beGoldenMaster`** — JSON byte-exact seed **90301** ×1 smoke row
   - **NEW** — not in the original 9-fail set; not covered by BH/Wayne/Hendrix regen pass
   - Backlog item pending triage: stale-fixture drift (bucket A) vs other cause
   - **Do not investigate root cause yet** — log only; separate scoped triage before action

---

## CONFIRMED FINDINGS (pre-regen analysis — reference)

Side-by-side eval on **golden fixture** vs **current engine output** at time of analysis:

| Golden | Seed | Old GCE | New GCE | LOCK (new) | Drift character | Outcome |
|--------|------|---------|---------|------------|-----------------|---------|
| **bhGoldenMaster** | 88109 | 5.4 | 7.1 | **pass** | Melody/bass pitch spelling | **Regenerated** `f8c17335` |
| **wayneGoldenMaster** | 90217 | 5.6 | 7.1 | **pass** | Voicing | **Regenerated** `f8c17335` |
| **jhGoldenMaster** | 90303 | 5.2 | 5.7 | **pass** | Inner-voice pitch | **Regenerated** `f8c17335` |
| **bartokCleGoldenMaster** | 61234 | 5.0 | 5.0 | harness "fail" | lineSet + trace JSON byte drift only | **Open** — harness task |

### bartokCleGoldenMaster (still open)

- GCE **5.0 → 5.0** (unchanged); no hard-gate flip.
- LOCK **"fail"** is **harness / eval-path mismatch**, not engine regression:
  - Bartok CLE golden = **AbstractLineSet JSON** byte-exact test (`bartokClePitchScoringGoldenMaster.test.ts`). **Never used leadsheet LOCK eval at fixture creation.**
  - GCE comparison imports lineSet → synthetic guitar+bass `ScoreModel`; `evaluateLock` fails **`rhythmAntiLoop`** only (`swingGridAlignment = 1.0` — perfect grid from import path).
  - **Old frozen fixture and new engine output fail identically** — not a new break.
- **Do not use leadsheet LOCK eval for Bartok CLE regen decisions going forward.**

**Caveat:** Old-side GCE scores on fixture→`ScoreModel` import may be depressed vs native engine path; treat category deltas as directional, not absolute.

---

## Smoke status (post BH/Wayne/Hendrix regen)

- **Unexpected fail count: 3** (was 9 pre-regen)
- **Known fail count: 5** (unchanged)
- Unexpected fails:
  - `bartokCleGoldenMaster` — lineSet + trace JSON (61234) ×2
  - `beGoldenMaster` — JSON byte-exact (90301) ×1

---

## STATUS

**Priority 1a substantially complete** — **6/8** confirmed premium-melody fixture rows fixed with GCE/LOCK validation and regen (`f8c17335`).

**2 items remain**, both require **separate scoped work** before closing 1a fully:

- Bartok CLE: correct eval harness, then regen decision
- Bill Evans (`beGoldenMaster` 90301): triage only — backlog, no investigation yet

No genuine engine regressions found in the 1a golden-drift sweep.

---

## NEXT

1. **Bartok CLE:** Assign correct LOCK / eval harness (not leadsheet `runLeadSheetGceLockEval` on synthetic lineSet import) — then decide regen.
2. **beGoldenMaster (90301):** Schedule triage — bucket A stale fixture vs other; no root-cause dive until scoped.
3. **Close 1a fully** only after both remaining items have scoped outcomes (harness + triage decision).

---

## Resume pointers

- Scratch (do not commit): `_goldenGceCompare.ts`, `_golden_musical_review.ts`, smoke logs under repo root (`_smoke_*`)
- Committed smoke baseline: `6ada6683` (LF normalize); golden regen: `f8c17335`

---

## PRIORITY 1a — CLOSED

- **Smoke:** 9 → 0 unexpected fails (all resolved)
- **BH/Wayne/Hendrix goldens regenerated** (`f8c17335`) — GCE improved, LOCK pass, no hard-gate violations
- **Bartok CLE + Bill Evans JSON** — LF-normalize fixes only (`3e7bce39`), no regen needed, 0 event diffs on authoritative path
- **Bill Evans MI 5.5 hard-gate fail confirmed STABLE** (not a regression, not new) — pre-existing weak motif recurrence in this style's native output. Logged as separate future item, not blocking.

### NEW BACKLOG ITEM (from this investigation)

- **Bill Evans style:** melodicIdentity hard-gate fail (5.5, motif recurrence 0.19) on authoritative native ScoreModel path. Needs its own DCR cycle if improving this style's motif recurrence is desired. Not urgent — pre-existing, LOCK passes, GCE overall 6.5 acceptable band.

### STATUS

**Priority 1a fully closed.** Full smoke tier green (0 unexpected fails). Next up: **priority 1a-audit** (generalize harmonic-voice fix pattern across ~80 styles per Perplexity-guided strategy) or **two-guitar interplay module**, per roadmap priority order.
