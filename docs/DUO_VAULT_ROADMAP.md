# Duo Vault Roadmap

Canonical staged plan for wiring Tonality Vault into the `guitar_bass_duo` harmony path. Vault is the single harmonic authority. Each stage is independently shippable.

## Session close — 2026-06-30 (**CLOSED — scope frozen**)

**Status:** This session is **closed**. No new duo-vault work without an explicit restart prompt. Do not expand scope in drive-by commits.

| Area | Status |
|------|--------|
| **4b.1–4b.5** | **DONE.** Vault contour snap at `:4572` + survival telemetry + Type-1 lift fix (4b.3) + role-contrast fix (4b.4) + section-arch pool fallback (4b.5). Proof seeds **50021** / **50213** unchanged clean; **80001** / **80002** section-arch P1 goldens **PASS**. |
| **4a (Song Mode hook pool swap)** | Not advanced this session beyond prior plan text; duo baseline path (4b) is the shipped proof surface. |
| **Vault On/Off toggle + receipt badge** | Shipped in code; **bug found and fixed** (mosaic-blocks generate path omitted `duoVaultMotifEnabled`; badge treated missing manifest flag as on). **Needs app/API rebuild + manual A/B retest** before marking UI milestone done. |
| **4b.4 (50213 role-contrast debt)** | **DONE (2026-07-01).** Bass macro B-half routing + post-orchestration duplicate-pitch nudge. Seed **50213** **`roleContrast` 0.1174**, gp success; **50021** unchanged clean. See **§4b.4** below. |
| **4b.5 (section-arch golden — contour starvation, seed 80001)** | **DONE (2026-07-01).** Pool-only register fallback in **`resolveVaultContourPoolMidi`**; seed **80001** generates + P1 golden **PASS**. Residual: **`duoVaultContourNullReturns: 23`** on **80001** (soft degradation — notes clamp to pl, no crash); minor known behavior, **not** a new stage. See **§4b.5** below. |
| **4c — phrase tail + hook-return** | **DONE (2026-07-01).** Site 1: vault resolver at motif phrasetail (`generateGoldenPathDuoScore.ts` ~`:4759`). Site 2: vault **`rootPc`** for hook-return transposition via **`rootPcForDuoHarmonicTransposition`** (`motifShape.ts`, `songModeMotifEngineV2.ts`, `duoBarMathFinalize` bar 25); shape extraction aligned. Preset-scoped `isStandardGuitarBassDuo`; fallback → legacy inherited. |
| **4d.1 — phrase-end cadence** | **DONE (2026-07-01).** **`duoEnforcePhraseEndCadence`** uses **`phraseFillTonesFromVaultResolver`** on standard duo; skips pitch snap on 4b.3 vault-receipt / declined motif notes at phrase end. Proof: **50021** / **50213** baseline interval PASS; **80001** P1 golden PASS; **`duoIdentityV32`** cadence area PASS. |
| **4d.2 — orchestration snap** | **DONE (2026-07-01).** Shared **`snapGuitarPitchToChordWindow`**; **`snapGuitarToChord`** vault-aware on category-3 notes (no receipt/decline). **4b.3** receipt-skip + declined register-only **unchanged**. **Telemetry note (benign, not regression):** seed **50021** `vaultSnapFired` **28→21**, `duoVaultDeclinedNotes` **+7** — **`barPasses4b1MotifIntervalContract`** sim at `:4572` now matches vault orchestration snap; fewer interval-gate commits, **not** reduced orchestration vault reach. All regression suites **PASS**. |
| **4d.3+ — remaining legacy snap sites** | **NEXT.** Global leap repair (**`strictEnforceGlobalLeaps`**), hook pool (**4a**), identity/closing nudges. |
| **Stages 5–8** | Unchanged backlog. |

**Out of scope (explicit):** Reharm-style rich voicings (upper-structure / quadratonic chord stacks, dense colour voicings) are **OUT OF SCOPE** for the duo golden-path vault workstream. That belongs to the separate **Tonality Vault chart / Reharm** product (`generateReharmCandidates`, Chord Inspector, paste/iReal/PDF vault lane) and is **untouched** by this roadmap. Duo vault here = **motif pitch-class authority** via `resolveDuoHarmonyForSymbol` at `:4572`, not chart reharm voicing export.

**Next session (when restarted):** (1) ~~Rebuild + retest vault toggle A/B on `guitar_bass_duo`~~ (done 2026-07-01 locally). (2) ~~**4b.4** on seed 50213 role contrast~~ (done 2026-07-01). (3) ~~**4b.5** section-arch pool fallback on seed **80001**~~ (done 2026-07-01). (4) ~~**4c** phrase tail + hook-return~~ (done 2026-07-01). (5) ~~**4d.1** phrase-end cadence~~ (done 2026-07-01). (6) ~~**4d.2** orchestration snap~~ (done 2026-07-01). (7) **4d.3** global leaps (`strictEnforceGlobalLeaps`), or Stage 5+ only with explicit scope prompt.

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
    - **4b.4 — duoLock role contrast on baseline confidence seeds (done; 2026-07-01).**
      - **Separate from Type-1 interval fix (4b.3).** Register-only / 4b1-gate paths do **not** move `roleContrastScore` (activity = attacks + offbeats only). Investigation showed deficit in **bar 5 bass syncopation** (macro) and **bar 2 guitar duplicate pitch tie** (micro, post-orchestration lift/snap).
      - **Shipped:** **`buildBassPart`** — bars **5–7** when guitar not hot: `simplifyForDuo = false` + **`forceGuitarEcho`** on **`emitMelodicBassBar`** (syncopated A′ echo bass vs quarter-stride/pedal). **`generateGoldenPathDuoScore`** — **`nudgeMeasureConsecutiveDuplicateV1Pitches`** on guitar bars **1–8** after **`applyDuoOrchestrationPass`** (nearest distinct chord tone; vault/declined paths untouched).
      - **Proof:** seed **50213** **`roleContrast` 0.1174** (was **0.0554**), bar 2 **gAct 4.0** (was **2.5**), bar 5 **bAct 5.0** (was **2.5**), gp **success**; **`baselineMotifIntervalIdentity`** PASS, **`KNOWN_VAULT_LIFT_BREAKS`** empty. Seed **50021** **`roleContrast` 0.1125**, interval PASS.
      - **Gate met:** confidence seeds **`roleContrastScore ≥ 0.06`** with honest interval test.
    - **4b.5 — Section-architecture golden: vault pool fallback (done; 2026-07-01).**
      - **Separate from 4b.4 (50213 role contrast).** Different seed, path, and failure mode — do not conflate.
      - **Root cause:** section-arch Intro **`registerCeiling: 58`** vs duo **`effectiveBase: 60`** + global arc → emission window **`[57, 58]`** on bar 1; **`Dm7`** vault min9 PCs left **zero** midis in pool → hard **`DuoVaultMotifContourStarvationError`** at noteIndex **0**.
      - **Shipped:** **`duoVaultMotifContourSnap.ts`** — **`resolveVaultContourPoolMidi`**: when emission window yields **< 2** vault candidates, widen **pool-only** register (+12 semitone steps, max 48, then full **`[28, 96]`** band). Emission **`effectiveLow` / `effectiveHigh`** unchanged elsewhere; fail-loud throw preserved if pool still **< 2** after full widen.
      - **Harness (2026-07-01):** `tests/smokeRowSafe.ts` — starvation → counted FAIL row (no job-killing throw); still relevant for any future genuine starvation.
      - **Proof:** seed **80001** generates clean; **`sectionArchitectureP1Golden.test.ts`** **80001** + **80002** **PASS**; smoke-fast **V65 P1** row green; **50021** / **50213** baseline motif identity **PASS**.
      - **Residual (minor known behavior — not new debt / no stage):** seed **80001** may still report **`duoVaultContourNullReturns: 23`** — per-note contour starvation callbacks on narrow intro windows; notes **clamp to pl** rather than crash. Acceptable soft degradation on 16-bar section-arch Song Mode path; production **32-bar** baselines unaffected.
      - **Gate met:** seed **80001** section-arch P1 golden **PASS**; no **`DuoVaultMotifContourStarvationError`** on generate path for this fixture.
  - **4c — Phrase tail + hook-return (DONE; 2026-07-01).**
    - **4c.1 — Site 1: motif phrase tail (DONE).**
      - File/site: `generateGoldenPathDuoScore.ts` ~`:4759–4771` (motif-bar v2 phrasetail `endTone` before Wyble strip/re-inject).
      - Shipped: export **`phraseFillTonesFromVaultResolver`** from **`guitarPhraseAuthority.ts`**; **`duoChordTonesWithOptionalTuningMap(..., useVaultPhraseTones)`** uses vault base when `isStandardGuitarBassDuo(context.presetId)` — no **`duoVaultMotifEnabled`** gate (Stage 3 precedent); alternate-tuning voicing map overlay unchanged; resolver **`source === 'fallback'`** → legacy base automatically.
      - Proof: **`baselineMotifIntervalIdentity.test.ts`** seeds **50021** / **50213** PASS; **`assertPhraseTailVaultPcSeed50213`** replays production path on motif bars (28 bars, 20 vault chords) — final score lacks **`debugSource: 'phrasetail'`** because Wyble strips/re-injects v2.
      - Gate met: baseline interval identity unchanged; phrasetail **`endTone`** on vault-resolved chords lands on vault pitch class.
    - **4c.2 — Site 2: hook-return (DONE).**
      - Files: **`motifShape.ts`** (`rootPcForDuoHarmonicTransposition`, `realizeReturnMidiFromMotifShape`, `extractMotifShapeFromStatement`), **`songModeMotifEngineV2.ts`** (`hookFirstReturnPitchesFromShape`), **`duoBarMathFinalize.ts`** (`restoreGuitarBar25HookPitchesFromBar1` + **`finalizeAndSealDuoScoreBarMath(score, presetId)`**).
      - Shipped: vault **`rootPc`** (via **`resolveDuoHarmonyForSymbol`**) replaces legacy **`chordTonesForSymbol`** root for harmonic transposition delta on standard duo; same helper used in shape extraction (`startRelativePc` / `peakRelativePc`) to prevent vault/legacy root drift; fallback → legacy inherited.
      - Proof: **`songModeRegressionBaseline.test.ts`** seed **50021** (bar 1/25 shape + contour) **PASS**; Bacharach / Fagen / Wayne slice smokes with hook **PASS**; seed **80001** section-arch P1 golden **PASS** (16-bar, unaffected).
      - Gate met: existing hook identity guards green (`similarityMotifShapePitchStructure ≥ 0.7`, contour, **`validateSongModeHookIdentity`**).
  - **4d — Vault single-authority everywhere (IN PROGRESS).**
    - After **4b.3** (Type-1) + **4b.4** (role-contrast on baseline seeds) are closed, extend vault-aware tone sourcing to **all** remaining guitar v1 authorities — not only receipt-tagged / declined-motif bars.
    - **4d.1 — Phrase-end cadence (DONE; 2026-07-01).**
      - File/site: **`generateGoldenPathDuoScore.ts`** **`duoEnforcePhraseEndCadence`** (~`:2409`).
      - Shipped: on **`isStandardGuitarBassDuo`**, cadence snap candidates from **`phraseFillTonesFromVaultResolver`** (same resolver as **4c** phrasetail); resolver **`source === 'fallback'`** → legacy inherited; no **`duoVaultMotifEnabled`** gate. **Guard:** skip pitch snap when phrase-end v1 note is vault-receipt-tagged or vault-declined (4b.3 metadata) — pass in-loop **`duoVaultMotifSnapReceipts`** + **`duoVaultDeclinedNotes`** on context.
      - Proof: **`baselineMotifIntervalIdentity.test.ts`** seeds **50021** / **50213** PASS (hook off); **`assertPhraseTailVaultPcSeed50213`** still green; **`songModeRegressionBaseline`** **50021** PASS; **`duoIdentityV32`** cadence bars 6–7 PASS; **`sectionArchitectureP1Golden`** **80001** PASS.
      - Gate met: baseline interval identity unchanged; cadence bars still classified **`EXCLUDED_CADENCE`** in interval test (by design).
    - **4d.2 — Orchestration snap (DONE; 2026-07-01).**
      - Files: **`guitarPhraseAuthority.ts`** **`snapGuitarPitchToChordWindow`** (shared); **`duoOrchestrationPass.ts`** **`snapGuitarToChord`** (~`:161`); **`duoVaultMotifContourSnap.ts`** orchestration sim aligned (`snapGuitarToChordOrchestration` + **`liftLowMidDelta`** / **`liftSectionBDelta`** / **`barPasses4b1MotifIntervalContract`**).
      - Shipped: on **`isStandardGuitarBassDuo`**, category-3 notes (no vault receipt, not declined) snap to vault **`melodyPcs`** within ±2 semitones before legacy fallback; resolver **`source === 'fallback'`** → legacy root/3/5/7 unchanged. **4b.3** receipt-skip + **`tryDeclinedRegisterOnlyLiftPitch`** paths **untouched**.
      - **Telemetry shift (documented, benign — simulation accuracy, not regression):** aligning `:4572` interval-gate sim with vault orchestration snap changes **`vaultSnapFired`** / **`duoVaultDeclinedNotes`** counts at commit time — e.g. seed **50021** fired **28→21**, declined **31→38** — because **`barPasses4b1MotifIntervalContract`** now predicts vault-accurate post-lift landing. Orchestration vault snap **scope unchanged** (still every non-receipt non-declined lift-path note). **`lostLegacySnap`** unchanged on confidence seeds (**50021: 0**, **50213: 1**).
      - Proof: **`baselineMotifIntervalIdentity`** **50021** / **50213** PASS; **`songModeRegressionBaseline`** **50021** PASS; **`duoIdentityV32`** PASS; **`sectionArchitectureP1Golden`** **80001** PASS; **`duoVaultHarmony.smoke`** PASS.
    - **4d.3 — Global leap repair (NEXT).**
      - File/site: **`ecmShapingPass.ts`** **`strictEnforceGlobalLeaps`** via **`enforceDuoVoiceLeadingPostOrchestration`**.
    - Remaining scope: hook pool (**4a** / **`pickPitchesForContour`**), non-motif bars, identity gestures (`emitGuitarDuoIdentityBar7`), closing nudges (`applyLateClosingGuitarContourNudge`, `nudgeDuoGuitarPhraseEndsForVariety`).
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
