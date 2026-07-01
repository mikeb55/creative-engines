# Duo Vault Roadmap

Canonical staged plan for wiring Tonality Vault into the `guitar_bass_duo` harmony path. Vault is the single harmonic authority. Each stage is independently shippable.

## Session close — 2026-06-30 (**CLOSED — scope frozen**)

**Status:** This session is **closed**. No new duo-vault work without an explicit restart prompt. Do not expand scope in drive-by commits.

| Area | Status |
|------|--------|
| **4b.1–4b.3** | **DONE.** Vault contour snap at `:4572` + survival telemetry + Type-1 lift fix (receipt skip + declined register-only lift). Vault **survives orchestration lift** on `guitar_bass_duo`; proof seed **50021** (`KNOWN_VAULT_LIFT_BREAKS` empty, `roleContrast` 0.0929, gp success). |
| **4a (Song Mode hook pool swap)** | Not advanced this session beyond prior plan text; duo baseline path (4b) is the shipped proof surface. |
| **Vault On/Off toggle + receipt badge** | Shipped in code; **bug found and fixed** (mosaic-blocks generate path omitted `duoVaultMotifEnabled`; badge treated missing manifest flag as on). **Needs app/API rebuild + manual A/B retest** before marking UI milestone done. |
| **4b.4 (50213 role-contrast debt)** | **Logged, NOT started.** Easy effort next session. Seed **50213** — `roleContrastScore` below duoLock gate (`0.06`). See **§4b.4** below. |
| **4b.5 (section-arch golden — contour starvation, seed 80001)** | **Harness fixed (2026-07-01); musical debt open.** Smoke catches `DuoVaultMotifContourStarvationError` as FAIL row (no job-killing throw). Underlying vault pool starvation on bar 1 `Dm7` **not** fixed. See **§4b.5** below. |
| **4c, 4d** | **NOT started.** Not scoped further this session. |
| **Stages 5–8** | Unchanged backlog. |

**Out of scope (explicit):** Reharm-style rich voicings (upper-structure / quadratonic chord stacks, dense colour voicings) are **OUT OF SCOPE** for the duo golden-path vault workstream. That belongs to the separate **Tonality Vault chart / Reharm** product (`generateReharmCandidates`, Chord Inspector, paste/iReal/PDF vault lane) and is **untouched** by this roadmap. Duo vault here = **motif pitch-class authority** via `resolveDuoHarmonyForSymbol` at `:4572`, not chart reharm voicing export.

**Next session (when restarted):** (1) ~~Rebuild + retest vault toggle A/B on `guitar_bass_duo`~~ (done 2026-07-01 locally). (2) Optional **4b.4** on seed 50213 role contrast. (3) **4b.5** — fix underlying contour pool starvation on seed **80001** (smoke harness no longer crashes). (4) Do not start 4c/4d until 4b.4 / 4b.5 debt is accepted or deferred in writing.

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
    - **4b.3 — Type-1 vault-lift fix: receipt skip + declined register-only lift (done; `Stage 4b.3` commit).**
      - **Receipt-tagged motif notes:** `liftGuitarLowMidInA` / `liftGuitarRegisterInSectionB` skip legacy lift+snap when a committed `:4572` `duoVaultMotifSnapReceipt` exists (`buildVaultReceiptByEventIdx`).
      - **4b.2-declined motif notes (interval-guard reject, no receipt):** record `duoVaultDeclinedNotes` at placement; orchestration uses **`tryDeclinedRegisterOnlyLiftPitch`** — same-pitch-class register nudge via `registerOnlyLiftMidi`, **no** legacy root/3/5/7 snap; must pass **`motifBarPasses4b1AfterVaultOrchestration`** or fall back to pre-orchestration baseline (same emitted pitch as old full-skip).
      - **Bar baselines:** `duoVaultMotifBarBaselines` (`goldenMidis`, `preOrchestrationMidis`, effective register window) recorded at `:4572` for gate simulation.
      - **Proof seed 50021:** `KNOWN_VAULT_LIFT_BREAKS` **empty**; baseline interval test **PASS**; `roleContrast` **0.0929**; `runGoldenPathOnce` **success**; survival ratio **~0.64** (up from **~0.46** pre-4b.3).
      - **50213 interval test:** `KNOWN_VAULT_LIFT_BREAKS` **empty** (Type-1 resolved); register-clamp bars classified **`EXCLUDED_REGISTER_CLAMP`** — not lift debt.
      - **Note A (suppress vault where lift would break it)** — TEMPORARY guard-rail option only; explicitly **NOT** the definition of vault working.
    - **4b.4 — Declined-note register lift vs duoLock role contrast (KNOWN DEBT; seed 50213; NOT STARTED — easy effort).**
      - **Separate from Type-1 interval fix (4b.3).** Interval identity + Type-1 lift breaks are resolved on confidence seeds; **50213 `roleContrastScore` remains below the duoLock gate (`0.06`).**
      - **Observed:** pre-4b.3 marginal **0.0603** → post-4b.3 **0.0554** with `gp.success` **false** on seed **50213** — not a wiring bug.
      - **Diagnostic (read-only, seed 50213 declined bars 1/9/13/19/21/25/27):** `tryDeclinedRegisterOnlyLiftPitch` applied **zero** register nudges — A-section note0 candidates (+12) all **`motifBarPasses4b1AfterVaultOrchestration` reject** → baseline-clamped; bar **9** note0 blocked by outer A prob gate before `tryDeclined`; bar **19** declined notes blocked by outer B prob gate; bar **21** note2 candidate **79** → 4b1 reject. Register-only mode **equals full-skip for emitted pitches** on this seed → role contrast does not move.
      - **Scope for 4b.4:** reconcile declined-note register lift with **`roleContrastScore`** / duoLock quality on marginal baseline seeds — e.g. bar-level 4b1 model aligned with per-note apply, register-only tolerance carve-out, or orchestration register policy that restores contrast without re-opening Type-1 legacy snap. **Do not** widen interval test tolerance to mask this.
      - **Gate:** seed **50213** (and peer marginal duo baseline seeds) **`roleContrastScore ≥ 0.06`** with **`baselineMotifIntervalIdentity`** still honest (`KNOWN_VAULT_LIFT_BREAKS` stays empty on Type-1).
    - **4b.5 — Section-architecture golden: `DuoVaultMotifContourStarvationError` (KNOWN DEBT; seed 80001; harness done — musical fix NOT STARTED).**
      - **Separate from 4b.4 (50213 role contrast).** Different seed, path, and failure mode — do not conflate.
      - **Pre-existing; not part of the 2026-06-30 session close workstream.** Confirmed **not** caused by vault toggle/badge fix, `skipScoreMidiExport`, or docs-only pushes.
      - **Trigger:** **`sectionArchitectureP1Golden.test.ts`** — `testSongModeSyFiveSection80001` (seed **80001**, `presetId: guitar_bass_duo`, Song Mode SY five-section architecture golden). Error: `Stage 4b.2: vault contour pool starved on bar 1 chord=Dm7 noteIndex=0` (`duoVaultMotifContourSnap.ts` → `generateGoldenPathDuoScore.ts`).
      - **Harness (done 2026-07-01):** `tests/smokeRowSafe.ts` + `sectionArchitectureP1Golden.test.ts` + `runSmokeTests.ts` — `DuoVaultMotifContourStarvationError` becomes a counted **FAIL** smoke row instead of an uncaught abort. Production 4b.2 fail-loud policy unchanged.
      - **Musical debt (NOT STARTED — after 4b.4 optional):** vault register-complete pool still starves on locked `Dm7` bar 1 for this golden — fix pool coverage / section-arch + vault interaction, **or** gate vault contour snap off this golden until coverage is sufficient. **Do not** weaken 4b.2 fail-loud on production duo paths without an explicit decision.
      - **Gate:** seed **80001** section-arch P1 golden **PASS** (green row, not graceful FAIL); no `DuoVaultMotifContourStarvationError` on generate path for this fixture.
  - **4c — Phrase tail + hook-return (NOT STARTED; deferred).**
    - Files: `generateGoldenPathDuoScore.ts:4617–4627` (phrase-tail Wyble tone), `motifShape.ts:253–272` (hook-return realization).
    - Plan: point their chord-tone lookups at `resolveDuoHarmonyForSymbol` instead of legacy pools, gated `isStandardGuitarBassDuo`.
    - Gate: endings/returns take vault-compatible tones without breaking cadence clarity or section identity.
  - **4d — Vault single-authority everywhere (NOT STARTED; deferred).**
    - After **4b.3** (Type-1) + **4b.4** (role-contrast debt on declined register lift) are closed on baseline seeds, extend vault-aware tone sourcing to **all** remaining guitar v1 authorities — not only receipt-tagged / declined-motif bars.
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
- **Stage 7 — UI reachability (partial; toggle + badge wired, retest pending).**
  - **Done in code:** `duoVaultMotifEnabled` toggle (`guitar_bass_duo` only) gates `:4572`; receipt badge echoes `duoVaultMotifSurvivalTelemetry` when vault on.
  - **Pending:** Rebuild desktop/web API bundle; confirm toggle off → no vault receipts/telemetry and **Vault Off** badge (same seed A/B listen).
  - Original gate still applies: React Generate path must match harness — mosaic-blocks branch now passes toggle (bug fix).
- **Stage 8 — Regression + adoption.**
  - Re-run baseline GCE + V3 on the updated motif + phrase-fill integration; add listening checks on simple and medium progressions.
  - Adoption gate (**ALL** must hold): targeted GCE categories hold or improve; standing vault-fired test (Stage 5) passes; UI reachability (Stage 7) confirmed; motif identity preserved.
  - Once all pass, promote vault-backed duo path to default; update docs/tests; mark legacy path deprecated but available for rollback.
