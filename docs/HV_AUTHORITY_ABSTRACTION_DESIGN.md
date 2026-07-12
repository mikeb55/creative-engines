# HV-Aware Authority / Effective-Style Abstraction — Design (2026-07-09)

**Status:** **SHIPPED** (Phase 0 infra + Phase 1 seams 1–4). Live code: `engines/composer-os-v2/core/authority/`. Item 2 (Verlaine + frank_zappa template) also **SHIPPED**. Remaining work = per-style rollout (Waves A/B/C done; Wave D leftovers + Tier 2) — see [COMPOSER_OS_80_STYLE_HV_ROLLOUT_DESIGN.md](./COMPOSER_OS_80_STYLE_HV_ROLLOUT_DESIGN.md) and roadmap Priority Order.  
**Doc lag note (2026-07-12):** earlier “design only — no implementation” header was stale and corrected.  
**Context:** [EIGHTY_STYLE_STAGE2_FINDINGS.md](./EIGHTY_STYLE_STAGE2_FINDINGS.md) · [EIGHTY_STYLE_AUDIT_SWEEP_2026-07-08.md](./EIGHTY_STYLE_AUDIT_SWEEP_2026-07-08.md) · [AUDIT_SEAM_EXTRACT_2026-07-07.md](./AUDIT_SEAM_EXTRACT_2026-07-07.md) · [HARMONIC_VOICE_FORWARDING_DESIGN.md](./HARMONIC_VOICE_FORWARDING_DESIGN.md)

---

## 1. Problem definition

### Confirmed bug pattern (6/6 Tier 1 probes)

Stage 2 HV probes on `guitar_bass_duo` (seed 77777, 32-bar) tested:

| Style | Symptom A (authority) | Symptom B (validators) | Symptom C (scoring) |
|---|---|---|---|
| `verlaine` | partial — bespoke HV path exists but incomplete across seams | partial — some relaxes HV-aware, precompute/registry gaps remain | partial — dedicated routing when authority engages |
| `frank_zappa` | no — spine stays primary; `harmonyContext` never attaches on HV | no — `zappaStructuralRelax` primary-only | mismatch — generic scorer when authority absent |
| `allan_holdsworth` | partial — riff VRB lane only; spine/eff bars stay primary | no — `holdsworthStructuralRelax` primary-only | mismatch + generic GCE |
| `fripp` | partial — riff VRB lane only; spine/eff bars stay primary | no — Metheny bypass primary-only | mismatch + generic GCE |
| `bill_evans` | no — spine/eff bars stay primary | no — precompute primary-only | mismatch + generic GCE |
| `pat_metheny` | no — spine/eff bars stay primary (`STYLE_PAT_METHENY` gate not met on HV) | no — precompute primary-only | mismatch + generic GCE |

**Shared class:** when `harmonicVoice` ≠ primary, most runtime seams still ask "is style X active?" via `songwriterStyleId === 'x'` (or `styleProfile === 'STYLE_X'`) and ignore `harmonicVoice`. Transport may carry the field; behaviour does not switch.

### What is already fixed (out of scope for this abstraction)

| Layer | Status | Evidence |
|---|---|---|
| **Transport** | Fixed on GBD + ECM full-generate; forwarding matrix documents remaining paths | `forwardHarmonicVoiceField.ts`, `runHarmonicVoiceForwardingGceLockMatrix.ts`, roadmap item 1a-continued |
| **GCE scorer identity (honesty)** | Fixed centrally — `951ea2a7` | `resolveGceScorerRouting` / `HV_SCORER_MISMATCH` in `resolveEffectiveGceStyle.ts`; no false uplift when HV authority absent |

### What remains unfixed (in scope)

| Layer | Symptom | Typical seam |
|---|---|---|
| **Harmony authority** | Eff-bar precompute, spine classification, `getChordForBar` cascade stay on primary | `generateGoldenPathDuoScore.ts`, `harmonyResolution.ts`, `harmonySpineProvider.ts` |
| **Validator / gate routing** | Structural relax, Metheny bypass, melody leap relax, etc. keyed on primary only | `behaviourGates.ts`, `duoMelodyIdentityV3.ts`, `duoLockQuality.ts` |
| **Truth registry / LOCK** | `EFFECTIVE_HARMONY_TRUTH_REGISTRY` rows match primary id only | `customLockedHarmonyRouting.ts`, `pipelineTruthGates.ts` |
| **Precompute dispatch** | `isSongwriterX` flags in duo score build; only Verlaine has `isVerlaineHarmonicPath` exception | `generateGoldenPathDuoScore.ts` ~L3260–L3620 |
| **Side-path confusion** | Riff VRB lane (`resolveDuoRiffVrbLaneId`) can engage on HV without harmony spine — looks "partial" but is not chord authority | `songwriterStyleProfiles.ts` |

**Design goal:** one shared decision model for *which style id is authoritative per concern*, with safe fallback to today's primary-only behaviour for unmigrated styles.

---

## 2. Abstraction proposal

### Recommended shape: shared core identity + thin layer adapters

**Not recommended:** a single monolithic `resolveEffectiveStyleAuthority(context, layer)` that encodes all layer semantics inline. Layers differ too much (harmony needs eff-bar keys and bar-length checks; validators need boolean relax flags; GCE needs scorer route ids; truth registry needs metadata key lookup).

**Recommended:**

```
+---------------------------------------------------------+
|  resolveEffectiveStyleIdentity(context)                 |
|  -> EffectiveStyleIdentity (computed once per context)  |
+---------------------------+-----------------------------+
                            |
     +----------------------+----------------------+
     v                      v                      v
 harmonyAdapter      validatorAdapter      truthRegistryAdapter
 gceScorerAdapter    precomputeAdapter     (thin wrappers)
```

#### Core: `EffectiveStyleIdentity`

Single pure-ish computation from `CompositionContext`. Proposed location: `engines/composer-os-v2/core/harmony/effectiveStyleIdentity.ts`.

**Inputs:**

| Input | Source |
|---|---|
| `primaryStyleId` | `generationMetadata.songwriterStyleId` (normalized) |
| `harmonicVoiceId` | `generationMetadata.harmonicVoice` (normalized via `normalizeHarmonicVoiceId`) |
| `styleProfile` | `generationMetadata.styleProfile` |
| `totalBars` | `context.form.totalBars` |
| **Capability registry** | static table — see section 3 |
| **Engagement evidence** (read-only) | eff-bar arrays on metadata, `harmonyContext.styleId`, spine probe optional |

**Outputs (`EffectiveStyleIdentity`):**

Illustrative shape (not implementation code):

- `primaryStyleId`, `harmonicVoiceId`
- `harmonyAuthorityStyleId` — who owns chord authority for this run
- `engagement` — per-layer booleans: harmony, precompute, validatorRelax, truthRegistry, gceScorer, riffVrbLane
- `receipts` — stable diagnostic tags for probes/smoke
- `harmonicVoiceAuthorityGap` — true when HV set, differs from primary, harmony layer not engaged

#### "Style engaged" vs "style merely requested"

| Term | Definition |
|---|---|
| **Requested** | `harmonicVoice` present in metadata after transport merge. User/UI intent only. |
| **Engaged (harmony)** | Registry says HV may own harmony **and** evidence exists: full-length `*EffectiveHarmonyBars` for HV style **or** `harmonyContext.styleId === hv` **or** spine returns HV `sliceId` at probe bar. |
| **Engaged (validator)** | Registry lists relax for HV **and** harmony authority (or explicit validator target) equals the style whose relax should fire. |
| **Engaged (GCE)** | `resolveGceScorerRouting` pattern — extend via registry, not ad-hoc id checks. |

**Rule:** adapters never treat "requested" as "engaged". Default when capability missing or evidence absent: **primary owns everything** (today's behaviour).

#### Layer adapters (thin)

Each adapter is ~5–20 lines: read `EffectiveStyleIdentity`, apply layer rule, fall back to legacy check during migration.

| Adapter | Responsibility |
|---|---|
| `harmonyAuthorityStyleId(identity)` | Return id for `getChordForBar` / spine row match |
| `shouldPrecomputeStyle(identity, styleId)` | Gate `precompute*EffectiveHarmonyBars` in duo score build |
| `validatorRelaxActive(identity, relaxKind)` | Replace scattered `songwriterStyleId === 'x'` relax tests |
| `truthRegistryStyleId(identity)` | Select `EFFECTIVE_HARMONY_TRUTH_REGISTRY` row |
| `gceEffectiveStyleId(identity)` | Feed `resolveGceScorerRouting` (may wrap existing function) |

### Alternative considered: unified resolver with layer parameter

`resolveEffectiveStyleAuthority(context, layer)` — rejected as primary API because layer enums grow, harmony needs bar-index metadata, validators need relax sub-kinds. Internal `resolveForLayer(identity, layer)` as private helper is fine.

---

## 3. Capability model

### `HarmonicVoiceCapabilityRegistry` (single source of truth)

Static registry — declarative. Most styles: **no entry** or all layers `primary_only`.

**Layers:** `harmony`, `precompute`, `validator_relax`, `truth_registry`, `gce_scorer`, `riff_vrb_lane`

**Levels:** `none` | `primary_only` | `hv_partial` | `hv_full`

**Entry fields:** `styleId`, `layers`, optional `styleProfiles`, `effectiveHarmonyBarsKey`, `notes`

### Initial registry population (honest baseline)

| styleId | harmony | precompute | validator_relax | truth_registry | gce_scorer | riff_vrb_lane | Notes |
|---|---|---|---|---|---|---|---|
| `verlaine` | hv_full | hv_full | hv_full | primary_only | hv_partial | none | truth row still primary-only today |
| `frank_zappa` | hv_full | hv_full | hv_full | primary_only | hv_full | none | `harmonyContext` path |
| `pat_metheny` | hv_partial | hv_partial | none | primary_only | none | none | `STYLE_PAT_METHENY` OR primary |
| `joni_mitchell` | hv_partial | hv_partial | none | primary_only | none | none | styleProfile OR primary |
| `sonic_youth` | hv_partial | hv_partial | none | primary_only | none | none | styleProfile OR primary |
| `allan_holdsworth` | none | none | primary_only | primary_only | none | hv_partial | riff lane only today |
| `fripp` | none | none | primary_only | primary_only | none | hv_partial | Metheny bypass primary-only |
| `bill_evans` | none | none | none | primary_only | none | none | Tier 1 probe — full gap |
| *(default)* | none | none | none | primary_only | none | none | All unmigrated styles |

**Safe fallback:** HV set but registry `none` or no entry → behaviour identical to current primary-only. `HV_SCORER_MISMATCH` continues to fire (already correct).

---

## 4. Migration path

### Phase 0 — Infrastructure only (no behaviour change)

1. Add `effectiveStyleIdentity.ts` + `hvCapabilityRegistry.ts`.
2. Add adapters that **delegate to existing logic**.
3. Wire diagnostics only: optional `effectiveStyleIdentityReceipt` on metadata.
4. No change to eff-bar content, LOCK, or GCE scores.

**Acceptance:** all existing smoke/GCE rows unchanged.

### Phase 1 — Seam migration (read paths)

| Seam file | Migration |
|---|---|
| `harmonyResolution.ts` | Adapter + registry eff-key lookup |
| `harmonySpineProvider.ts` | Row `match` via adapter |
| `behaviourGates.ts` | `validatorRelaxActive` |
| `duoMelodyIdentityV3.ts` | Verlaine leap relax via adapter |
| `customLockedHarmonyRouting.ts` | Truth lookup via adapter; optional `harmonicVoiceStyleIds` on rows |
| `pipelineTruthGates.ts` | Same adapter — delete duplicate ternaries |
| `resolveEffectiveGceStyle.ts` | Registry + engagement evidence |
| `generateGoldenPathDuoScore.ts` | `shouldPrecomputeStyle` gates |

### Phase 2 — Style promotion (write paths)

Per style DCR: registry row update → precompute on HV → truth registry HV → re-run Stage 2 probe.

**Partial rollout:** promoting `frank_zappa` does not affect `bill_evans` until its registry row changes.

### BB / SQ / Song Mode

GBD golden-path first. BB/SQ adapters return primary-only when preset not GBD family.

---

## 5. Rollout order

### First commit: shared-seam infrastructure only

**Do not** lead with `frank_zappa` + `verlaine` behaviour changes in the same commit.

**Why:**

1. Safety — partial Verlaine path already ships; avoid regression.
2. Testability — infrastructure commit score-neutral (Phase 0).
3. Pattern — consolidate scattered `isVerlaineHarmonicPath` into registry without changing outcomes first.
4. Reviewability — plumbing PR separate from behaviour PR.

### Second commit: Verlaine consolidation + `frank_zappa` harmony authority

| Order | Work |
|---|---|
| 2a | Verlaine — registry `hv_full`, truth registry HV row, remove duplicate helpers |
| 2b | `frank_zappa` — registry `hv_full`, `attachFrankZappaHarmonyContext` on HV, validator relax on HV |
| 2c | Re-run Zappa/Verlaine Stage 2 probes — expect mismatch cleared when engaged |

### Third wave: Tier 1 batch

`allan_holdsworth`, `fripp`, `bill_evans`, `pat_metheny` — targeted verification only, no fresh diagnosis.

---

## 6. Non-goals

This abstraction will **not**:

- Rewrite slice musical business logic or chord vocabularies
- Add new validator rules or thresholds
- Author style content or VRB fingerprints
- Redesign truth registry beyond HV routing columns
- Fix BB/SQ/Song Mode transport-only paths
- Merge `harmonicVoice` with `riffVrbId`
- Auto-migrate all ~80 styles

---

## 7. Acceptance checks

Re-use Stage 2 probe pattern (one-off / matrix `--probe`, not permanent smoke until stable).

### Variants (same seed)

- **PRIMARY:** target as primary, no `harmonicVoice`
- **HV:** `barry_harris` primary + `harmonicVoice = target`

### Checks

| # | Check | Pass criterion |
|---|---|---|
| 1 | Transport | `metadata.harmonicVoice === target` on HV |
| 2 | Harmony authority | HV: full eff bars or `harmonyContext.styleId`; spine `sliceId`; chords differ from BH baseline where devices apply |
| 3 | Validator engagement | Style relax/bypass fires on HV when registry says so |
| 4 | Truth / LOCK | `exportIntegrityPassed` stable; no new LOCK failures vs PRIMARY |
| 5 | GCE | No `HV_SCORER_MISMATCH` when harmony engaged; style scorer when `gce_scorer: hv_full`; no hard-gate flip vs baseline |
| 6 | Regression | PRIMARY unchanged from pre-migration probe |

### Phase 0 (infrastructure only)

Zero metric change vs pre-commit baselines; identity receipt correct on spot-check.

---

## Appendix A — Existing helpers

| Existing | Fate |
|---|---|
| `isVerlaineHarmonicPath` | Absorbed into registry; wrapper deprecated |
| `resolveGceScorerRouting` | Kept; fed by adapter |
| `resolveDuoRiffVrbLaneId` | Separate; `riff_vrb_lane` distinct from harmony |
| `HV_SCORER_MISMATCH` | Kept; fires on `harmonicVoiceAuthorityGap` |
| `SLICE_AUTHORITY_ROWS` | `match` calls adapter |

## Appendix B — Open decisions

1. Pat Metheny / Joni / SY: `styleProfile` without HV — preserve today unless product changes.
2. Holdsworth / Fripp: when harmony → `hv_full`, keep riff lane as `hv_partial`. Recommendation: yes.
3. Primary === HV: treat as primary path; no mismatch.

---

*Design session 2026-07-09. Implementation: roadmap item 4 (80-style audit next step).*
