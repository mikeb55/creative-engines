# 80-Style HV Authority Rollout - Design (2026-07-10)

**Status:** **In progress** — prerequisite items 1–2 **SHIPPED**; Waves A/B/C promoted many Tier 1 styles; **Wave D leftovers (~13)** still open (see roadmap Priority Order).  
**Roadmap item:** 3 (80-style HV authority rollout)  
**Prerequisite (item 2 - SHIPPED/closed):** Verlaine HV authority end-to-end (Phase 0 + Phase 1 seams 1-4); frank_zappa HV write-path fix (`76aec931`)  
**Parent design:** [HV_AUTHORITY_ABSTRACTION_DESIGN.md](./HV_AUTHORITY_ABSTRACTION_DESIGN.md) (**SHIPPED**)  
**Audit inputs:** [EIGHTY_STYLE_AUDIT_SWEEP_2026-07-08.md](./EIGHTY_STYLE_AUDIT_SWEEP_2026-07-08.md), [EIGHTY_STYLE_STAGE2_FINDINGS.md](./EIGHTY_STYLE_STAGE2_FINDINGS.md)

---

## 0. Proven pattern (Verlaine + frank_zappa)

Item 2 closed with a repeatable template. **Seam files did not change for frank_zappa** (`76aec931` touched only golden-path write path + spine row + slice helper). All four Phase 1 seams already consume `EffectiveStyleIdentity` via shared adapters - promoting a second style required **registry + evidence + write-path wiring only**.

### Evidence chain (what "engaged" means)

| Evidence source | Role |
|---|---|
| `precompute*EffectiveHarmonyBars` | Populates `*EffectiveHarmonyBars` on metadata at full chart length |
| Golden-path dispatch (`generateGoldenPathDuoScore.ts`) | Gates precompute + `attach*HarmonyContext` via `is{Style}HarmonicPath` (primary **or** `harmonicVoice === style`) |
| `harmonyContext.styleId` | Canonical locked-harmony timeline when slice uses context object (e.g. frank_zappa) |
| `harmonySpineProvider` spine row | `sliceId` match + adapter-driven authority id at probe bar |
| Full-length eff bars on metadata | Resolver `harmonyEvidenceForStyle` - array length === `form.totalBars` |

**Rule:** adapters treat **requested** (`harmonicVoice` present) as not equal to **engaged** (registry permits layer **and** evidence exists). Missing either -> primary-only fallback (today's behaviour).

### Resolver + registry + adapters

```
resolveEffectiveStyleIdentity(context)
  -> EffectiveStyleIdentity { harmonyAuthorityStyleId, engagement.*, receipts, harmonicVoiceAuthorityGap }
       |
  harmonyAuthorityAdapter   -> getChordForBar / spine row match
  precomputeAdapter         -> shouldPrecomputeStyle gates in duo score build
  validatorRelaxAdapter     -> behaviourGates / duoMelodyIdentityV3 relax
  truthRegistryAdapter      -> EFFECTIVE_HARMONY_TRUTH_REGISTRY row lookup
  gceScorerAdapter          -> resolveGceScorerRouting / style scorer selection
```

**"No seam-file edits" for new styles:** once Phase 1 seams are wired (done for GBD), adding a style is **not** another pass through `harmonyResolution.ts`, `behaviourGates.ts`, `customLockedHarmonyRouting.ts`, or `resolveEffectiveGceStyle.ts`. Work lives in:

1. `harmonicVoiceCapabilityRegistry.ts` - layer levels + `effectiveHarmonyBarsKey`
2. Style slice / golden-path - `is{Style}HarmonicPath`, precompute dispatch, optional `attach{Style}HarmonyContext`
3. `harmonySpineProvider.ts` - spine row `match` if not already covered by adapter (prefer adapter-only when possible)
4. Optional truth-registry row extension - only when `truth_registry: hv_full` is promoted (Verlaine/frank_zappa remain `primary_only` on truth today)

Per-style bespoke seam rewrites are **out of scope** unless audit proves a layer the adapters cannot express (expected rare; escalate before implementing).

### Item 2 commit map (reference)

| Commit | Work |
|---|---|
| `1d8bdff5` | Phase 0 - registry, resolver, adapters, verify harness |
| `65754282` | Seam 1 - harmony authority (Verlaine engaged) |
| `746efb62` | Seam 2 - validator relax (Verlaine structural relax; seed 133) |
| `92759baa` | Seam 3 - truth registry (Verlaine authority id) |
| `9200267e` | Seam 4 - GCE scorer (Verlaine fully migrated) |
| `76aec931` | frank_zappa write-path - harmonic-path helper, harmonyContext, spine, mosaic merge; **zero seam-file edits** |

---

## 1. Scope

### Rollout universe

| Tier | Count | Notes |
|---|---:|---|
| **Tier 1 Wave D leftovers** | **~13** | `ecm_chamber`, `bernard_herrmann`, `claus_ogerman`, `don_sebesky`, `jack_white`, `jerry_goldsmith`, `john_barry`, `john_williams`, `johnny_mandel`, `marr`, `nino_rota`, `philip_glass`, `ralph_towner` (after Waves A/B/C) |
| **Tier 2** | **54** | Stage 1 score 4-6; spot-check / batch after Wave D |
| **Tier 3** | 11 | Out of rollout scope unless product adds Slonimsky HV for SQ VRB-only ids |
| **Shipped (reference + Waves A/B/C)** | **verlaine**, **frank_zappa**, plus Wave A/B/C promotions in `harmonicVoiceCapabilityRegistry.ts` | Regression harnesses for verlaine/zappa; see registry for full list |

**Historical note:** At item-2 close the queue said **26 remaining** after verlaine + frank_zappa; Waves A/B/C reduced that to the Wave D leftovers above. Tier 3 and transport-only HV ids (e.g. joe_pass, jamerson) stay primary-only until explicitly promoted.

### In scope

- GBD golden-path HV authority for Tier 1 then Tier 2 styles in audit table
- Registry row promotion (`hv_full` / `hv_partial` / `primary_only` per layer)
- Write-path evidence wiring mirroring Verlaine/Zappa
- Stage 2-style verification per style (PRIMARY vs HV)

### Explicit constraint

**Use the Verlaine/Zappa pattern.** No per-style bespoke seam rewrites unless strictly necessary and documented as an adapter gap.

---

## 2. Pattern template (per-style checklist)

Copy this checklist for every style promotion. Deviation requires design note in commit message.

### Step 1 - Registry row

Add or update `HARMONIC_VOICE_CAPABILITY_REGISTRY` entry:

- `styleId`
- Per-layer levels: `harmony`, `precompute`, `validator_relax`, `truth_registry`, `gce_scorer`, `riff_vrb_lane`
- `effectiveHarmonyBarsKey` (must match metadata field populated by precompute)
- Optional `styleProfiles` for `hv_partial` styles (pat_metheny, joni_mitchell, sonic_youth pattern)

**Default for unmigrated styles:** no row -> `none` -> primary-only (safe).

### Step 2 - Harmonic-path helper

In style slice (or existing helper module):

```text
is{Style}HarmonicPath(metadata):
  primary === style OR harmonicVoice === style
  (+ styleProfile gate when hv_partial)
```

Mirror `isVerlaineHarmonicPath` / `isFrankZappaHarmonicPath`.

### Step 3 - Evidence production (write path)

In `generateGoldenPathDuoScore.ts` (and slice precompute if not already centralized):

1. Gate `precompute{Style}EffectiveHarmonyBars` on harmonic-path helper (not `songwriterStyleId === style` alone)
2. If slice uses locked context: call `attach{Style}HarmonyContext` on HV path
3. Ensure eff bars reach full `totalBars` before export/LOCK

### Step 4 - Spine alignment

In `harmonySpineProvider.ts`:

- Ensure spine row `match` resolves via harmony authority adapter **or** explicit harmonic-path helper where row predates adapters
- Prefer shrinking bespoke `match` ternaries over adding new ones

### Step 5 - Resolver engagement (read path - usually free)

With registry + evidence correct, seams 1-4 should engage without edits:

- `harmonyAuthorityStyleId` -> HV style when evidence present
- `harmonicVoiceAuthorityGap` -> false when harmony engaged
- `HV_SCORER_MISMATCH` -> absent when GCE layer engaged
- Validator relax -> fires on HV when `validator_relax: hv_full`

### Step 6 - Truth registry (optional promotion)

Only when product requires HV-specific LOCK row:

- Extend `EFFECTIVE_HARMONY_TRUTH_REGISTRY` + `harmonicVoiceStyleIds` column
- Verlaine/frank_zappa intentionally remain `truth_registry: primary_only` until a later pass

### Step 7 - Verify (mandatory before merge)

Run acceptance checks (section 5) for that style; capture probe JSON or matrix row in commit notes.

---

## 3. Rollout strategy

### Grouping (proposed waves)

| Wave | Styles (indicative) | Rationale |
|---|---|---|
| **A - Stage 2 probed** | `allan_holdsworth`, `fripp`, `bill_evans`, `pat_metheny` | Known 3-symptom class; targeted verification, no fresh diagnosis |
| **B - hv_partial to hv_full** | `pat_metheny`, `joni_mitchell`, `sonic_youth` | Partial path exists via `styleProfile`; extend to explicit `harmonicVoice` |
| **C - Tier 1 eff-bar + Slonimsky HV** | `debussy`, `duke_ellington`, `herbie_hancock`, `john_coltrane`, `thelonious_monk`, `wayne_shorter`, `antonio_carlos_jobim`, ... | Same precompute/spine stack as bill_evans; batch by shared slice pattern |
| **D - Tier 1 validator-relax** | `bernard_herrmann`, `claus_ogerman`, `don_sebesky`, `jack_white`, `ecm_chamber`, ... | Need `validator_relax: hv_full` + harmony evidence together |
| **E - Tier 1 riff-lane hybrids** | `allan_holdsworth`, `fripp` (after harmony promoted) | Keep `riff_vrb_lane: hv_partial` distinct from harmony authority |
| **F - Tier 2 batches** | Score 5-6 blocks from audit table | 3-5 styles per commit; chord-branch + multi-truth only |

Order within Tier 1: **Wave A -> B -> C/D interleaved by shared slice code path** (minimize duplicate golden-path edits).

### Tier 1 vs Tier 2 cadence

| Tier | Strategy | Commit granularity |
|---|---|---|
| **Tier 1** | **One style at a time** (or pair only when sharing one slice module) | One DCR commit per style + probe evidence |
| **Tier 2** | **Small batches (3-5)** grouped by audit score band / shared precompute | Batch commit only if zero cross-style coupling in golden-path gates |

### Tier 1 batching policy

Default for Tier 1 remains one-style-per-turn, with full PRIMARY vs HV gate probes and shared-resolver zero-diff verification after each wiring change. A limited exception is allowed for Tier 1 styles that pass a pre-flight "batch-safe" screen: canonical style identity (no shared alias tables or cross-style id workarounds), HV-adjacent registry metadata, and a change surface confined to the style's local files plus existing shared resolver read-seams. For such batch-safe Tier 1 styles, wire 2 styles per turn (not 3 — ceiling may rise after a few clean 2-batches land). Each style must still run the full 9-seed PRIMARY/HV probe and zero-diff resolver check INDEPENDENTLY (not combined into one probe run). Any anomaly (shared-file drift, PRIMARY/HV divergence, or unexpected use of shared aliases) promotes that style to solo rollout with stop-and-investigate before further batching.

**Batch-safe pre-check** (run before wiring, per candidate style):

1. **Identity:** confirm single canonical songwriter/spine id, no alias fields, no shared alias table usage anywhere in the codebase for this style id.
2. **HV adjacency:** registry row already has some HV-related metadata (even partial/riff-only counts as a positive signal) — flags familiarity with the abstraction.
3. **Expected change surface:** list the style's local files; confirm scope is contained to those + existing shared resolver read path, with zero expected new registry schema or shared alias table.
4. **Historical risk:** no recent commits show this style's helpers touching shared code or causing cross-style issues.

Label each candidate **batch-safe** or **solo-only** with one-line justification per check.

### Acceptance criteria (per style)

| # | Criterion |
|---|---|
| 1 | HV authority engages **only** when registry permits **and** evidence exists |
| 2 | PRIMARY run (style as primary, no `harmonicVoice`) **unchanged** vs pre-rollout baseline on representative seeds |
| 3 | HV run: `harmonicVoice === style` -> harmony authority = style; eff bars or `harmonyContext.styleId` match |
| 4 | No new `harmonicVoiceAuthorityGap` / `HV_SCORER_MISMATCH` when harmony engaged |
| 5 | GCE hard gates: **no new failures** vs PRIMARY baseline for non-target styles; for target style, PRIMARY and HV **agree** on pass/fail per gate (style bugs may pre-exist - see non-goals) |
| 6 | LOCK: `exportIntegrityPassed` stable; no new LOCK failures vs pre-rollout |
| 7 | Non-target regression spot-check: verlaine seed **133**, frank_zappa multi-seed, `bill_evans`, `pat_metheny` zero delta |

### Reference harnesses during rollout

| Harness | Use |
|---|---|
| **verlaine** | Seam 2 regression - seed **133** structural relax; confirms validator adapter still works |
| **frank_zappa** | Write-path + authority parity - multi-seed PRIMARY vs HV agreement on gates/receipts |
| `runHvAuthorityPhase0Verify.ts` | Resolver engagement JSON; extend `TIER1` list as styles ship |
| Stage 2 probe pattern | `barry_harris` primary + `harmonicVoice = target`, seed **77777**, 32-bar GBD |
| `runHarmonicVoiceForwardingGceLockMatrix.ts` | Transport + GCE/LOCK matrix when touching forwarding-adjacent paths |

Every Tier 1 promotion re-runs **both** reference styles on the same seeds before merge.

---

## 4. Non-goals

This rollout **does not**:

- Fix style-specific **cadence / ending rules** (e.g. frank_zappa `finalBarTension` - pre-existing, 7/9 seeds fail in **both** PRIMARY and HV; style DCR, not HV authority)
- Fix **validator relax keying gaps** that are intentional follow-ups (e.g. `zappaStructuralRelax` still primary-only - separate smaller seam item)
- Rewrite slice chord vocabularies, devices, or musical business logic
- Change GCE formulas, hard-gate thresholds, or LOCK semantics
- Auto-migrate Tier 3 / SQ VRB-only / transport-only HV ids
- BB / SQ / Song Mode Phase 2 consumption (forwarding done; engine still primary-only - separate roadmap items)
- Merge `harmonicVoice` with `riffVrbId`

**Separation rule:** if PRIMARY and HV agree on a failure, it is a **style-quality** issue. If they **diverge**, it is an **HV authority** bug - blocker for that style's rollout commit.

---

## 5. Verification plan

### Per-style probe (mandatory)

**Setup:**

- Preset: `guitar_bass_duo`
- Primary: `barry_harris` (or audit-default primary for that style class)
- Variants: **PRIMARY** (target as primary), **HV** (`harmonicVoice = target`)
- Seeds: style default **77777** + at least **2** alternates (include verlaine seed 133 / frank_zappa pass-band seeds for cross-harness sanity)

**Capture:**

| Field | Pass |
|---|---|
| `metadata.harmonicVoice` | Set on HV variant |
| `resolveEffectiveStyleIdentity().engagement` | harmony/precompute/validator/gce match registry |
| `harmonyAuthorityStyleId` | HV style on HV variant when engaged |
| Eff bars / `harmonyContext.styleId` | Full length; matches export chords |
| Spine probe `sliceId` | HV style at bar 2 when engaged |
| `harmonicVoiceAuthorityGap` | false when harmony engaged |
| `harmonicVoiceScorerMismatch` | absent when GCE engaged |
| GCE overall + hard gates | PRIMARY unchanged; HV vs PRIMARY same pass/fail per gate |
| `exportIntegrityPassed` | No regression vs baseline |

### PRIMARY/HV divergence (stop condition)

If a style shows PRIMARY passing a gate (for example, `finalBarTension`) while HV fails the same gate at the same seed, or HV passes while PRIMARY fails, this is **not** the frank_zappa pattern of a shared pre-existing defect.

Treat this as a **stop condition** for that style:

- Do not proceed with that style's rollout commit yet.
- Investigate with the same multi-seed method used in the frank_zappa analysis.
- Determine whether the divergence comes from:
  - a routing/evidence bug in that style's harmonic-path logic, or
  - a genuine style-specific difference that requires its own DCR cycle.
- Only proceed once the cause is understood and the rollout decision is explicit.

### Aggregate regression (each commit)

1. **Reference pair:** verlaine (133) + frank_zappa (77777 + one fail seed) - zero delta on non-promoted metrics
2. **Tier 1 spot-check:** bill_evans, pat_metheny on 77777 - zero delta until those styles are the promotion target
3. **Smoke tier:** `npm run test:composer-smoke` - no new failures; add permanent smoke row only after style stable (optional, post-rollout)
4. **Rollout ledger:** append promoted style + seeds + probe JSON path to CHANGELOG / roadmap Current (same commit as promotion)

### Silent regression guard

- Maintain a **frozen baseline file** per wave (probe JSON snapshot) - diff on CI or pre-merge script
- Fail promotion if any **non-target** style's PRIMARY metrics drift
- Track `harmonicVoiceAuthorityGap` count across Tier 1 matrix - must monotonically decrease as styles ship

---

## 6. Open decisions

1. **Truth registry HV rows:** promote per style with `truth_registry: hv_full`, or keep primary-only truth until wave complete (recommend: per-style when LOCK asserts eff-bar keys differ on HV)
2. **Tier 1 count vs Stage 1 table:** Stage 1 lists **32** Tier 1 rows; rollout queue uses **28** Tier 1 targets (**26** remaining + **2** shipped) - reconcile by excluding Tier 1 ids without Slonimsky HV product surface until UI adds them
3. **Batch size Tier 2:** cap at 5 unless golden-path edit is identical across batch (shared `precompute*` dispatch pattern)

---

## 7. Next implementation prompt (for Cursor)

When ready to implement Wave A style 1 (`allan_holdsworth` or `bill_evans` per priority):

1. Registry row promotion only in first commit slice
2. Write-path + harmonic-path helper (no seam files)
3. Run per-style probe + reference harnesses
4. Document KNOWN ISSUE style bugs separately from authority gaps

---

*Design session 2026-07-10. Item 2 closed; item 3 design ready for phased implementation.*
