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

**Seams:** `parseRiffVrbId` (reads `riffVrbId` only today) ? UI sends `harmonicVoice` without `riffVrbId`.

**Acceptance (forwarding):**
- Product/field-mapping decision recorded (map `harmonicVoice` ? riff VRB id vs read `harmonicVoice` directly).
- After decision: UI field reaches the engine path that selects riff VRB bundle ? no silent drop at app boundary.

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
4. Riff Generator ? DEFERRED, this is a field-mapping/product decision (UI sends harmonicVoice, engine reads unrelated riffVrbId), not a forwarding bug ? treat as separate scoped item, not part of this sprint

**New guardrail:** add a per-entry-point "supportsHarmonicVoice: forward | mapped | unsupported" status so future new paths can't silently reintroduce this ambiguity.

**Phasing per path:** Phase 1 (preserve field to engine entry) before Phase 2 (confirm path's semantics actually use it) before Phase 3 (align authority/registry/validator behavior if needed) ? don't mix plumbing fix with deeper style-system work.
