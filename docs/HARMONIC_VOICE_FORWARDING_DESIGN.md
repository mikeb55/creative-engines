# harmonicVoice forwarding — design spec (priority 1a-continued)

**Date:** 2026-07-07
**Status:** design only — no implementation

**Related:** [COMPOSER_OS_ROADMAP.md](./COMPOSER_OS_ROADMAP.md) § Priority 1a-continued · [AUDIT_SEAM_EXTRACT_2026-07-07.md](./AUDIT_SEAM_EXTRACT_2026-07-07.md) (entry-point map and seam inventory)

**Confirmed:** only guitar_bass_duo full generate and ecm_chamber full generate forward harmonicVoice end-to-end today. Six user-facing paths silently drop it despite UI payload (see roadmap fragmentation map).

---

## Per-path forwarding fixes and acceptance (forwarding layer)

Apply these **per path** when that path's fix lands. They verify the field reaches the engine ? not full composer behaviour.

### Song Mode (full generate + section regeneration)

**Seams:** `runSongMode` call ? `songModeGoldenPathOptions` / `songModeGoldenPathOptionsForRun` ? `runSongModeSectionRegeneration` base options spread.

**Acceptance (forwarding):**
- `req.harmonicVoice` passed into `runSongMode` input when set on `GenerateRequest`.
- `harmonicVoice` present on `RunGoldenPathOptions` used by Song Mode golden-path run (including section regen fragment opts).
- `generationMetadata.harmonicVoice` (or equivalent VRB attach receipt) echoes requested id on successful generate.

### GBD section regeneration

**Seam:** `duoRunGoldenPathOptionsFromGenerateRequest` in `runDuoSectionRegeneration.ts`.

**Acceptance (forwarding):**
- `req.harmonicVoice` copied into fragment `RunGoldenPathOptions` the same way as `generateComposition` full-generate path (`generateComposition.ts` L420?422).

### ECM section regeneration

**Seam:** same as GBD ? `duoRunGoldenPathOptionsFromGenerateRequest` (ECM shares duo section-regen helper).

**Acceptance (forwarding):**
- Same contract as GBD section regen; preset id remains `ecm_chamber` on fragment opts.

### Big Band (full generate, mosaic dispatch, section regeneration)

**Seams:** `runBigBandPlanning` / `runBigBandRealisation` input ? `mosaicContextFromGenerateRequest` ? `ensembleSlonimskySongwriterIdFromRequest` (must not silently substitute for `harmonicVoice`) ? mosaic per-section `getDispatchEntry` context.

**Acceptance (forwarding):**
- `req.harmonicVoice` reaches BB planning/realisation metadata (or documented explicit mapping) when UI sends it.
- Mosaic context carries harmonic-voice identity where section dispatch expects VRB/harmony authority ? without overriding `songwriterStyleId` per-section routing unless product-intentional.
- BB section regen pipeline preserves forwarded `harmonicVoice` on fragment realisation input.

### String Quartet (full generate + section regeneration)

**Seams:** `buildStringQuartetGenerationMetadata` ? `runStringQuartetPlanning` / `runQuartetRealisation` ? `runStringQuartetSectionRegenerationPipeline` fragment metadata builder.

**Acceptance (forwarding):**
- `req.harmonicVoice` reaches SQ generation metadata (or documented mapping) when set ? not only `stylePairing.songwriterStyle` / `primarySongwriterStyle`.
- SQ section regen fragment metadata includes forwarded harmonic voice.

### Riff Generator

**Status (Phase A honesty, 2026-07-15):** COMPLETE — not a BB/SQ-style HV wall. Pattern authority stays **`riffVrbId`** (`parseRiffVrbId`). UI greys Harmonic Voice with explanatory note; generate does not forward `harmonicVoice`; receipt `harmonicVoiceIgnoredOnRiffPreset: true`. Soft-link / Phase B chord colour deferred. See `docs/RIFF_GENERATOR_HARMONIC_VOICE_DECISION.md`.

**Seams:** `parseRiffVrbId` (reads `riffVrbId` only) — HV is intentionally ignored for pattern.

**Acceptance (Phase A):**
- UI does not imply HV selects riff pattern.
- Receipt `harmonicVoiceIgnoredOnRiffPreset: true` on riff_generator results/manifests.
- `harmonicVoice` alone never selects an artist riff bundle.

---

## Acceptance Checks

**Applies per path** as each forwarding fix above lands — **in addition to**, not instead of, the per-path forwarding acceptance bullets in this doc.

For each fixed path (**Song Mode**, **GBD section regen**, **ECM section regen**, **Big Band**, **String Quartet**, **Riff Generator**):

1. Run **GCE evaluator + LOCK gate check** twice:
   - **baseline:** primary style, no `harmonicVoice` set
   - **test:** same primary style + **Verlaine** `harmonicVoice` set
2. Confirm **no unintended PASS→HARD FAIL or FAIL→PASS flip** on GCE **hard gates** between baseline and test runs.
3. Confirm **Verlaine-specific relaxes** (e.g. `duoMelodyIdentityV3` leap relax via `isVerlaineHarmonicPath`) apply correctly once `harmonicVoice` reaches that path.
4. Confirm any **existing special routing** (ECM/Zappa preset handling, Big Band mosaic dispatch, SQ ensemble routing) still behaves correctly with `harmonicVoice` now forwarded — i.e. the fix does not silently override intended preset-specific behaviour.
5. If any **GCE threshold or gate behaviour** is intentionally expected to change as a result of the fix, **state that explicitly in this design doc** (path subsection or changelog note) rather than treating it as a side effect.

---

## Sprint Plan (Perplexity-guided, 2026-07-07)

**Approach:** small shared forwarding helper (transport only, not semantics) + one parameterized regression test + one batch GCE/LOCK verification matrix. Explicitly NOT building the full 80-style "active as primary OR harmonicVoice" abstraction ? that stays deferred.

**Build once (before any path fix):**
1. Tiny shared helper ? e.g. `forwardHarmonicVoice(req, opts)` ? for plumbing only, used at each path's option-builder call site
2. One parameterized metadata-continuity test: for each entry point, assert "if caller sets harmonicVoice=X, final engine-bound options still contain harmonicVoice=X" (or explicitly documented as unsupported/mapped-differently) ? not a musical-output test
3. One batch GCE/LOCK verification matrix runner: rows = fixed paths, columns = baseline vs Verlaine-HV request, checks = HV survived / generation success / LOCK pass-fail / GCE score+gates / delta vs baseline

**Fix order:**
1. GBD section regen + ECM section regen (mirror already-working full-gen pattern ? lowest risk)
2. Song Mode full gen + section regen (higher impact, first path needing real LOCK/truth verification ? run matrix immediately after)
3. Big Band + String Quartet (more moving parts, do after harness exists)
4. Riff Generator — Phase A honesty **COMPLETE (2026-07-15)** (`docs/RIFF_GENERATOR_HARMONIC_VOICE_DECISION.md`). Not a forwarding wall; pattern = `riffVrbId`. Soft-link / Phase B chord colour still open.

**New guardrail:** add a per-entry-point "supportsHarmonicVoice: forward | mapped | unsupported" status so future new paths can't silently reintroduce this ambiguity.

**Phasing per path:** Phase 1 (preserve field to engine entry) before Phase 2 (confirm path's semantics actually use it) before Phase 3 (align authority/registry/validator behavior if needed) ? don't mix plumbing fix with deeper style-system work.

---

## Known issues surfaced by Fix #1

Status: documented during Fix #1 (GBD + ECM section-regen forwarding, 2026-07-08). Not fixed in that commit.

### 1. ECM `custom_locked` harness bug (pre-existing)

- **Surface:** matrix row `ecm_section_regen` (8-bar `custom_locked` fragment through `duoRunGoldenPathOptionsFromGenerateRequest` ? `runGoldenPathOnce`).
- **Failure:** hard throw from `assertCustomLockedBeforeScoreGeneration` (`customLockedHarmonyRouting.ts:329`):
  *custom_locked requires matching allowed song-form bar counts in both context.lockedHarmonyBarsRaw and options.*
- **Cause:** `buildContextForGoldenPath` for `presetId === 'ecm_chamber'` uses `buildEcmChamberContext`, which does **not** install matching `lockedHarmonyBarsRaw` / `customHarmonyLocked` for fragment custom_locked injects. Duo family branch wires this; ECM does not.
- **Relation to Fix #1:** unrelated. Baseline (`harmonicVoice` unset) fails the same way; `mergeHarmonicVoiceFromRequest` is a no-op when the field is absent.
- **Matrix handling:** row marked `KNOWN_HARNESS_ISSUE` (visible, not silently PASS, not a commit gate).
- **Follow-up:** separate scoped item ? wire ECM custom_locked into `buildEcmChamberContext` (or shared locked-harmony install helper). Do **not** fold into harmonicVoice forwarding commits.

### 2. Verlaine vs locked-harmony authority (open design question)

- **Surface:** GBD section-regen with `custom_locked` + `harmonicVoice: verlaine` (seed 50021, 8-bar locked strip).
- **Observation:** `mergeHarmonicVoiceFromRequest` correctly forwards Verlaine; Verlaine then rewrites locked bars (e.g. `Dm7` ? `Esus4/D`). `lockPass` (exportIntegrity + hard gates) can stay true while `result.success` is false because `errors` still carry pipeline-truth score mismatch.
- **Open question (not decided):** should `harmonicVoice` ever override locked / custom truth bars? Needs its own DCR design cycle ? not answered by Fix #1.
- **Final-bar fBT vs duo expected (CLOSED 2026-07-15):** Duo `pipelineTruthGates` score/XML expected now uses `resolveEffectiveHarmonyTruth` (fall back to locked/parsed only when no full-length effective). Closes HV/8-bar `forceFinal` vs submitted collision. beatles / `gil_evans` fixtures kept.
- **`bill_evans` HV score≠effective final (CLOSED 2026-07-15):** Dual-surface — expected/mosaic held fBT `Cmaj9`, score stayed locked `G13` because `getChordForBar` was primary-only. Gate now `isBillEvansHarmonicPath`.
- **`duke_ellington` HV mid score≠effective (CLOSED 2026-07-15):** Same primary-only `getChordForBar` gap; mid `#11` colour on effective/expected while score stayed locked. Gate now `isDukeEllingtonHarmonicPath`.
- **`cole_porter` HV input≠plan (CLOSED 2026-07-15):** Class C — full `syncColePorterAuthorityBars` rewrote plan/receipt off wire; skip sync on custom (effective authority via getChordForBar).
- **`bacharach` HV input≠plan + truthReport skip (CLOSED 2026-07-15):** Class C cousin — `syncBacharachFinalBarAuthority` rewrote final plan/receipt off wire (bar 8 `Cmaj9`≠`G13`); skip sync on custom. Plus `ExportTruthPipelineError` so duo gate fail does not leave `truthReport` skip/skip/skip. **Bass-identity rhythm-cell CLOSED (2026-07-15):** shared with `oliver_nelson` — line-first abstract bass early-continue skipped rhythm-triple break; narrow diversify in `buildBassPart` for those two VRB ids only. **Still open:** Verlaine locked-authority question above.
- **Matrix handling for Fix #1:** `gbd_section_regen` verlaine row uses a **non-locked** long-form fixture (pinned seed **50022**, 32-bar; 50021 Verlaine fails behaviour gates on this path) so the row tests *forwarding + effect* without conflating the locked-truth authority question.

## Big Band — Phase 2 consumption (Fix #3A transport + Batch 1 Slonimsky + Batch 4 FZ HV)

`harmonicVoice` reaches `context.generationMetadata` at the Big Band planning seam (`bigBandContextFromGenerateRequest`).

**Batch 1 (2026-07-14) — Slonimsky routing SHIPPED:** `runBigBandRealisation` → `slonimskySongwriterStyleId` from metadata HV; `buildBigBandScoreModel` uses HV \|\| primary for Slonimsky only. Primary `songwriterStyleId` stays for FZ gate / receipts. Mosaic dispatch + harmony precompute still primary-only.

**Batch 4 (2026-07-14) — FZ precompute HV continuity SHIPPED:** `buildFrankZappaBigBandCompositionContext` preserves `harmonicVoice` via `inheritedMetadata` (was bare-meta drop). Gate still primary-only — HV=`frank_zappa` does **not** open FZ when primary is not FZ. Precompute may not consume HV for chord rewrite yet (metadata continuity).

**Batch 6 (2026-07-14) — Berg HV-only non-mosaic harmony bridge SHIPPED:** After FZ block, before mosaic: when exact `harmonicVoice=berg`, `precomputeBergEffectiveHarmonyBars` rewrites `chordBars` (`bg:*`). Gate = **HV-only** (not primary||HV). Soft `alban_berg` no. Primary `frank_zappa` excluded. Mosaic `getDispatchEntry` untouched (item E). Helper: `isBergHvOnlyEnsembleWall` + `buildBergEnsemblePrecomputeContext`.

**Phase 2 widen (2026-07-15) — Beefheart HV-only non-mosaic harmony bridge SHIPPED:** Same slot (after Berg, before mosaic): exact `harmonicVoice=beefheart` → `precomputeBeefheartEffectiveHarmonyBars` (`cbf:*`). Gate = **HV-only** (not primary||HV). Twin `beefheart_fragment_polyphony` / soft `captain_beefheart` no. Primary `frank_zappa` excluded. Mosaic untouched. Helper: `isBeefheartHvOnlyEnsembleWall` + `buildBeefheartEnsemblePrecomputeContext`.

**Phase 2 widen (2026-07-15) — Fela Kuti HV-only non-mosaic harmony bridge SHIPPED:** Same slot (after Beefheart, before mosaic): exact `harmonicVoice=fela_kuti` → `precomputeFelaKutiEffectiveHarmonyBars` (`fk:*`). Gate = **HV-only** (not primary||HV). Soft `fela` no. Primary `frank_zappa` excluded. Mosaic untouched. No percussion append on wall (duo seal path separate). Helper: `isFelaKutiHvOnlyEnsembleWall` + `buildFelaKutiEnsemblePrecomputeContext`.

**Phase 2 widen (2026-07-15) — Henry Threadgill HV-only non-mosaic harmony bridge SHIPPED:** Same slot (after Fela, before mosaic): exact `harmonicVoice=henry_threadgill` → `precomputeHenryThreadgillEffectiveHarmonyBars` (`ht:*`). Gate = **HV-only**. Soft `threadgill` / BB dual-id arranger alias no. Primary `frank_zappa` excluded. Mosaic untouched. Helper: `isHenryThreadgillHvOnlyEnsembleWall` + `buildHenryThreadgillEnsemblePrecomputeContext`.

**Phase 2 widen (2026-07-15) — Eberhard Weber HV-only non-mosaic harmony bridge SHIPPED (final ROI #5):** Same slot (after Threadgill, before mosaic): exact `harmonicVoice=eberhard_weber` → `precomputeEberhardWeberEffectiveHarmonyBars` (`ew:*`). Gate = **HV-only**. Twin `weber_field` / soft `weber`|`ew` no (never `webern`). Primary `frank_zappa` excluded. Mosaic untouched. Helper: `isEberhardWeberHvOnlyEnsembleWall` + `buildEberhardWeberEnsemblePrecomputeContext`.

Still unused on BB: other `is*HarmonicPath` composers on the non-mosaic wall; mosaic per-section HV. Matrix `big_band` row stays `TRANSPORT_ONLY` for Verlaine fixture (no Slonimsky profile map entry → GCE delta often still 0).

**Mosaic global HV overlay (2026-07-16) — SHIPPED:** Product chose **global** HV (not per-section map). `precomputeMosaicEffectiveHarmonyBars`: per-section `getDispatchEntry(section.songwriterStyleId)` base, then when `harmonicVoice` set and ≠ section composer, HV dispatch precompute overlays base bars on every section. Receipts `mosaicGlobalHvOverlayApplied` / `mosaicGlobalHvId` / `mosaicGlobalHvOverlaySections`. Item E: walls + `getDispatchEntry` selection unchanged. Smoke: `mosaicGlobalHvRoutingSmoke.test.ts`.

**Status:** Fix #3A (transport) + Batch 1 Slonimsky + Batch 4 FZ HV continuity + Batch 6 Berg HV bridge + Phase 2 widen Beefheart + Fela Kuti + Threadgill + Weber + **mosaic global HV overlay** **COMPLETE**.

**Matrix handling:** `big_band` row status remains `TRANSPORT_ONLY` until harmony consumption (or matrix HV switched to a Slonimsky-mapped style).

## String Quartet — Phase 2 consumption (Fix #3B transport + Batches 2–3 + 5)

`harmonicVoice` reaches `generationMetadata` at the String Quartet planning seam (`stringQuartetGenerationMetadataFromGenerateRequest` / `buildStringQuartetGenerationMetadata`).

**Batch 2 (2026-07-14) — Slonimsky routing SHIPPED:** `runQuartetRealisation` → `slonimskySongwriterStyleId` from metadata HV (mosaic ctx \|\| input.context \|\| `input.generationMetadata`); `buildQuartetScoreModel` uses HV \|\| primary for Slonimsky only. Primary `songwriterStyleId` stays for FZ SQ gate / mosaic. Mosaic dispatch + harmony precompute still primary-only.

**Batch 3 (2026-07-14) — VRB / Pass4 routing SHIPPED:** Pass4 `getVoiceRuleBundle` uses HV \|\| primary. Does **not** read `sqArrangerVrb` (item I / arranger pairing out of Phase 2). Mosaic CLE `primarySongwriterId` still primary-only.

**Batch 5 (2026-07-14) — FZ HV continuity VERIFY-ONLY:** SQ FZ already passes full `generationMetadata` into `buildZappaStringQuartetPrecomputeContext` / precompute (no BB-style bare-meta drop). Gate = primary `frank_zappa` + `zappaSQHarmonySlice` — HV does **not** open slice. No production change. Smoke: `sqFzHvRoutingSmoke.test.ts`. Opening FZ via `HV=frank_zappa` = separate product DCR (deferred; Batch 4 discipline).

**Batch 6 (2026-07-14) — Berg HV-only non-mosaic harmony bridge SHIPPED:** After SQ FZ block, before mosaic: when exact `harmonicVoice=berg`, `precomputeBergEffectiveHarmonyBars` rewrites `chordBars` and stamps `bergEffectiveHarmonyBars` / `bergDeviceReceipts` on ensemble meta. Gate = **HV-only** (not primary||HV). Soft `alban_berg` no. Primary `frank_zappa` excluded. Mosaic CLE / `getDispatchEntry` untouched (item E).

**Phase 2 widen (2026-07-15) — Beefheart HV-only non-mosaic harmony bridge SHIPPED:** Same slot (after Berg, before mosaic): exact `harmonicVoice=beefheart` → `precomputeBeefheartEffectiveHarmonyBars`; stamps `beefheartEffectiveHarmonyBars` / `beefheartDeviceReceipts` (`cbf:*`). Gate = **HV-only**. Twin/soft no. Primary `frank_zappa` excluded. Mosaic CLE untouched.

**Phase 2 widen (2026-07-15) — Fela Kuti HV-only non-mosaic harmony bridge SHIPPED:** Same slot (after Beefheart, before mosaic): exact `harmonicVoice=fela_kuti` → `precomputeFelaKutiEffectiveHarmonyBars`; stamps `felaKutiEffectiveHarmonyBars` / `felaKutiDeviceReceipts` (`fk:*`). Gate = **HV-only**. Soft `fela` no. Primary `frank_zappa` excluded. Mosaic CLE untouched. No percussion append on wall.

**Phase 2 widen (2026-07-15) — Henry Threadgill HV-only non-mosaic harmony bridge SHIPPED:** Same slot (after Fela, before mosaic): exact `harmonicVoice=henry_threadgill` → `precomputeHenryThreadgillEffectiveHarmonyBars`; stamps `henryThreadgillEffectiveHarmonyBars` / `henryThreadgillDeviceReceipts` (`ht:*`). Gate = **HV-only**. Soft `threadgill` no. Primary `frank_zappa` excluded. Mosaic CLE untouched.

**Phase 2 widen (2026-07-15) — Eberhard Weber HV-only non-mosaic harmony bridge SHIPPED (final ROI #5):** Same slot (after Threadgill, before mosaic): exact `harmonicVoice=eberhard_weber` → `precomputeEberhardWeberEffectiveHarmonyBars`; stamps `eberhardWeberEffectiveHarmonyBars` / `eberhardWeberDeviceReceipts` (`ew:*`). Gate = **HV-only**. Twin/soft no (never `webern`). Primary `frank_zappa` excluded. Mosaic CLE untouched.

Still unused on SQ: other composers on non-mosaic bridge; mosaic `getDispatchEntry` / CLE HV. Matrix `string_quartet` row stays `TRANSPORT_ONLY` for Verlaine fixture.

**Status:** Fix #3B (transport) + Batch 2–3 + 5 FZ verify + Batch 6 Berg + Phase 2 widen Beefheart + Fela Kuti + Threadgill + Weber + **mosaic global HV overlay** **COMPLETE**. Optional remaining: FZ-via-HV product.
