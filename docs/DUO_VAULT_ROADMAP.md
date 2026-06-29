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
    - **FIRST STEP IS A READ-ONLY DESIGN PASS, not wiring:** design the contour-snap rule before touching code — how to snap landing PCs to vault `melodyPcs` while preserving the motif's interval shape (snap-at-emission vs re-realize-from-interval-pattern via vault pool walk). Decide the snap strength deliberately.
    - **HARD GATE — MOTIF IDENTITY PRESERVATION:** the snapped motif must remain recognizably the **SAME** motif (interval contour intact), **NOT** flattened into vault triads. This is the central failure mode of this stage — over-snapping destroys motif identity, under-snapping makes vault inaudible. The design must state how it balances the two, and the gate must verify motif contour similarity holds (not just that PCs are vault-legal).
    - Gate: baseline seeds (e.g. 50021) show audible vault color on ~87% of bars; GCE melodic identity + tension/release hold; motif contour recognizably preserved; V3 still PASS.
  - **4c — Phrase tail + hook-return (smaller chord-tone touches).**
    - Files: `generateGoldenPathDuoScore.ts:4617–4627` (phrase-tail Wyble tone), `motifShape.ts:253–272` (hook-return realization).
    - Plan: point their chord-tone lookups at `resolveDuoHarmonyForSymbol` instead of legacy pools, gated `isStandardGuitarBassDuo`.
    - Gate: endings/returns take vault-compatible tones without breaking cadence clarity or section identity.
  - **4d — Downstream single-authority completion (vault becomes SOLE authority on guitar v1).**
    - After motif tone sourcing (4a/4b/4c) is in place, verify which downstream steps still independently re-derive or overwrite guitar v1 tones on the duo path. **Read-only verification comes first:** identify **WHICH** of the candidates below actually fire on baseline duo seeds once motif owns the bars; **redirect only** steps that still overwrite vault-backed guitar v1 output. Goal is not just "vault audible," but **no surviving parallel chord-tone hierarchy for guitar v1**.
    - Candidates to check:
      - `duoEnforcePhraseEndCadence` (`generateGoldenPathDuoScore.ts:2349`) — cadence snap / final-note overwrite
      - `emitGuitarDuoIdentityBar7` (`guitarPhraseAuthority.ts:182`) — bar-7 identity gesture
      - `snapGuitarToChord` (`duoOrchestrationPass.ts:59`) — orchestration snap
      - `chordTonePitchesInRange` / `strictEnforceGlobalLeaps` (`ecmShapingPass.ts`) — leap-repair pool
      - `applyLateClosingGuitarContourNudge` (`generateGoldenPathDuoScore.ts:6660`) — closing contour nudge
      - `nudgeDuoGuitarPhraseEndsForVariety` (`generateGoldenPathDuoScore.ts:6714`) — bar-5 ending rewrite
    - Also note any canonical rewrite issues on this path (for example unwanted `G7` → `G13` style rewrites) that would undermine a single-authority vault story.
    - Gate:
      - No downstream step on `guitar_bass_duo` re-derives guitar v1 tones from `chordTonesFromSymbol`, `guitarChordTonesInRange`, or another parallel heuristic hierarchy where vault should be authoritative.
      - Cadence, identity, closing, and repair bars either consume vault-backed output or are explicitly verified harmless / moot on the duo path.
      - Vault is the **sole authority** for the duo guitar v1 line.
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
