# Duo Vault Roadmap

Canonical staged plan for wiring Tonality Vault into the `guitar_bass_duo` harmony path. Vault is the single harmonic authority. Each stage is independently shippable.

## Stages

- **Stage 0 — Audit (done).** Repo read, over-architected design shrunk to a thin first slice (pure resolver + tests); vault confirmed as single harmonic authority.
- **Stage 1 — Resolver (done).** `resolveDuoHarmonyForSymbol` with slash, alt, fallback; smoke tests for key symbols; musical PCs verified; committed as a clean reversible slice.
- **Stage 2 — Baseline capture (done).** Formal GCE + V3 gate on 5 representative duo progressions, vault not wired; scores + inputs stored as regression yardstick. See `DUO_VAULT_BASELINE.md`.
- **Stage 3 — Phrase-fill swap (done; verified safe, currently dormant).** Vault swap at `emitGuitarPhraseBar` (`guitarPhraseAuthority.ts:261`), gated to `presetId === 'guitar_bass_duo'` (`isStandardGuitarBassDuo`). Verified: resolver returns `source=vault` for all baseline symbols, tone pools genuinely differ from heuristic, swap is harmless and preset-scoped. **KNOWN LIMIT:** on the Stage 2 baseline seeds (esp. 50021), guitar v1 is ~87% motif-driven and motif bars bypass `emitGuitarPhraseBar` — so line 261 never fires and the swap is **DORMANT**. Stage 3 does **NOT** prove "vault live in duo melody"; it prepares the phrase-fill path for bars/seeds that route through it.
- **Stage 4 — Motif tone sourcing (core musical design; motif is contour-based, NOT a simple pool swap).** **CORRECTION:** `motifShape.ts:140` is shape **EXTRACTION** (interval/contour relative to chord), not pitch emission. Real emission site is `generateGoldenPathDuoScore.ts:4572–4607` (per-bar motif write), seeded by `motifGenerator.ts:62–68` and `motifTracker.ts:8–9`. Baseline guitar v1 motif is pure contour/interval + register + blind semitone transpose with **NO** per-bar chord lookup — so vault integration must be **contour-SNAP**, not a Stage 3 pool-pick. Sequence the three motif paths easiest-to-hardest:
  - **4a — Song Mode hook path (easiest: already pool-based).**
    - File/site: `songModeMotifEngineV2.ts`, `pickPitchesForContour` (~line 505), currently walks a `guitarChordTonesInRange` pool with contour.
    - Plan: Stage-3-style pool swap — feed `pickPitchesForContour` from `resolveDuoHarmonyForSymbol` (vault pool) instead of `guitarChordTonesInRange`, gated `isStandardGuitarBassDuo`.
    - Gate: hook melody stays idiomatic; vault color audible; GCE pillars stable on Song Mode hook tests.
  - **4b — Baseline duoLock contour path (high-value, ~87% of bars — where the baseline finally MOVES).**
    - Files: `motifGenerator.ts` (seed), `motifTracker.ts` (transpose), `generateGoldenPathDuoScore.ts:4572–4607` (emission).
    - **4b.1 — Interval identity baseline (done; `7f2968c7`).** Scoped test on generic `guitar_bass_duo` proves ~8–9/32 motif bars preserve strict 3-note interval identity from `pl.notes` through register clamp + orchestration lift + legacy `snapGuitarToChord` — **NOT** vault pitch-class survival. Establishes tolerance stack and clean-bar list for downstream vault work.
    - **4b.2 — Vault placement + survival telemetry (done; measurement milestone).**
      - Place vault contour tones at `generateGoldenPathDuoScore.ts:4572` on baseline motif bars, gated `isStandardGuitarBassDuo`. Attach per-note receipts (`bar`, note index, chosen vault pc, resolver `source`, `plPitch`) to metadata.
      - Read survival **AFTER** `applyDuoOrchestrationPass` (`:7777`): `vaultPcSurvived`, `vaultPcLostToLegacySnap`, `vaultSourceFallback`, `contourNullReturns`. Headline metric = `vaultPcSurvived / vaultSnapFired`.
      - **DONE** = placement fires on motif bars **AND** survival vs loss is quantified at the final-score seam **AND** `KNOWN_VAULT_LIFT_BREAKS` in `baselineMotifIntervalIdentity.test.ts` tracks lift-debt bars explicitly (test green, honest). Confidence seeds: fired=28/26, survived/fired≈0.46/0.54.
      - Fail loud: resolver `source === 'fallback'` on a snap bar, or contour starvation — never silent legacy revert.
      - Gate: non-debt PASS bars stay green; unlisted interval breaks still FAIL; known-break bars shrink when debt is resolved.
    - **4b.3 — Lift respects vault on tagged motif notes (NARROW; first audible vault fix).**
      - Teach the lift/snap layer (`liftGuitarLowMidInA`, `liftGuitarRegisterInSectionB`, `snapGuitarToChord` in `duoOrchestrationPass.ts`) to recognise notes carrying a `vaultSnapReceipt` and **PRESERVE** their vault pitch class instead of re-snapping to legacy root/3/5/7.
      - Scope = receipt-tagged motif notes ONLY, not global orchestration. Non-motif/cadence/phrase-fill lift stays for 4d.
      - Success = `KNOWN_VAULT_LIFT_BREAKS` shrinks toward empty and `survived/fired` rises, with the interval test still honest (no tolerance widening).
      - **Note A (suppress vault where lift would break it)** — TEMPORARY guard-rail option only; explicitly **NOT** the definition of vault working.
      - Gate: `vaultPcSurvived / vaultSnapFired` rises materially on baseline seeds; 4b.2 non-debt PASS bars stay green.
  - **4c — Phrase tail + hook-return (smaller chord-tone touches).**
    - Files: `generateGoldenPathDuoScore.ts:4617–4627` (phrase-tail Wyble tone), `motifShape.ts:253–272` (hook-return realization).
    - Plan: point their chord-tone lookups at `resolveDuoHarmonyForSymbol` instead of legacy pools, gated `isStandardGuitarBassDuo`.
    - Gate: endings/returns take vault-compatible tones without breaking cadence clarity or section identity.
  - **4d — Vault single-authority everywhere (full pass, later).**
    - After 4b.3 proves audible vault on tagged motif notes, extend vault-aware tone sourcing to **all** remaining guitar v1 authorities — not only receipt-tagged motif bars.
    - Scope: vault-aware phrase fill (beyond Stage 3 dormancy), leap repair (`ecmShapingPass.ts` / `strictEnforceGlobalLeaps`), cadence (`duoEnforcePhraseEndCadence`), non-motif bars, identity gestures (`emitGuitarDuoIdentityBar7`), closing nudges (`applyLateClosingGuitarContourNudge`, `nudgeDuoGuitarPhraseEndsForVariety`).
    - Removes all remaining legacy chord-tone hierarchies (`chordTonesFromSymbol`, `guitarChordTonesInRange`) where vault should be authoritative on `guitar_bass_duo`.
    - Gate: Stage 5 vault-fired regression passes at final score seam; no downstream step re-derives guitar v1 from parallel heuristics; vault is **sole authority** for the duo guitar v1 line.
  - All Stage 4 work gated `isStandardGuitarBassDuo(context.presetId)` (`guitar_bass_duo` only). ECM, `song_mode*`, `single_line` stay legacy unless explicitly extended.
- **Stage 5 — Standing "vault-fired" regression test (NEW; catches inert swaps).**
  - CI-level test asserting that on a representative `guitar_bass_duo` baseline seed, vault-derived pitch classes **APPEAR IN THE FINAL SCORED** guitar v1 notes — checked at the emitted-score seam, **AFTER** all downstream re-computers (cadence snap, orchestration, leap-repair), not merely that `resolveDuoHarmonyForSymbol` was called.
  - **FAILS if:** the vault branch never executes, **OR** vault tones are computed but overwritten before final emission (the exact Stage 3 dormancy case GCE + smoke tests did **NOT** catch).
  - Coverage: both motif emission (4b) and phrase-fill site (`emitGuitarPhraseBar` line 261).
- **Stage 6 — Advanced chords + fallback policy.**
  - Extend vault handling to maj7#11, altered dominants, dense color chords.
  - Define explicit fallback policy for symbols with no clean mapping (phantom sevenths, odd add9s from Stage 1): vault either constrains to a safe reduced set or declines with a bounded, documented fallback.
  - Gate: advanced chords sound better; GCE harmony & language + cadential clarity hold or improve; fallbacks documented and predictable.
- **Stage 7 — UI reachability (NEW; engine → user).**
  - Confirm the vault-backed duo path used in tests is the **SAME** path React "Generate" invokes for `guitar_bass_duo` — not only the `runGoldenPathOnce` harness.
  - If there's a gap (CLI harness vs UI codepath), wire the UI to the vault-integrated path.
  - Gate: pressing Generate on the duo preset in the real UI produces vault-backed harmony end-to-end, proven — not harness-only.
- **Stage 8 — Regression + adoption.**
  - Re-run baseline GCE + V3 on the updated motif + phrase-fill integration; add listening checks on simple and medium progressions.
  - Adoption gate (**ALL** must hold): targeted GCE categories hold or improve; standing vault-fired test (Stage 5) passes; UI reachability (Stage 7) confirmed; motif identity preserved.
  - Once all pass, promote vault-backed duo path to default; update docs/tests; mark legacy path deprecated but available for rollback.
