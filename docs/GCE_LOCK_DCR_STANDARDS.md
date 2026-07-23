# Composer OS â€” GCE Â· LOCK Â· DCR Â· Style Profile Layer

**Development standards for all musical output, style surfaces, and composer slices.**  
Applies to every build path (Generate, Song Mode, Tonality Vault, duo/ECM surfaces, including **ECM chamber / STYLE_ECM*** work in progress).

**Source note:** The manuscript `000_MUSIC_EVALUATION_-_GCE_-_LOCK_-_DCR.txt` was not found under `docs/` or `uploads/` in this repository. This document **integrates** the four systems from project practice and the canonical GCE specification in **`docs/GCE_FRAMEWORK_V2.md`**.

---

## 1. GCE v2.0 â€” Grand Criteria of Excellence (scoring)

**Authoritative detail:** `docs/GCE_FRAMEWORK_V2.md`  
**Agent quick rule:** `.cursor/rules/gce-evaluation.mdc`

### Scoring contract

- **10 categories**, each scored **0â€“10** (automatable dimensions per `GCE_FRAMEWORK_V2.md`).
- **9.0** remains the **aspirational north star** (long-term benchmark; formulas and weights unchanged).
- **7.9â€“8.4** is the **current empirical release-quality / system-ceiling band** under the present system (documented benchmark gap to 9.0: **0.6â€“1.2** points).
- **Operational release band (guidance, not a formula change):**
  - **â‰¥ 7.9** â€” PASS for tuned, shipped-quality output under the current system
  - **6.5â€“7.8** â€” acceptable / promising; revise **weakest category only**, **one pass** (DCR)
  - **&lt; 6.5** â€” materially weak; investigate (not release quality)
- If below the operational band: **one** DCR refinement pass on weakest category; **no full rewrite**; preserve asymmetry.

### Â§1.0 Two GCE modes (formal vs musician-facing)

The same **GCE v2.0** category vocabulary serves two contexts. **Formulas, weights, thresholds, and hard gates are identical in both** â€” only **how the agent applies** them differs.

| Mode | Context | Agent behaviour |
|------|---------|-----------------|
| **Formal / technical** | Code changes, official evaluator runs, LOCK / DCR, release readiness, CI, automated harness scores | Strict repo definition: hard gates block; operational band (â‰¥7.9 PASS, etc.) applies; DCR on weakest category; no weakening of semantics |
| **Musician-facing / conversational** | Chat requests: â€œGCE thisâ€, â€œevaluate this pieceâ€, â€œis this good?â€, â€œpros and cons?â€, â€œwhat would raise it?â€ | Musical critique on the GCE scale; **not** a release gate unless formal validation is explicitly requested |

**Musician-facing rules (chat only):**
- Overall score + 2â€“4 strengths + 2â€“4 weaknesses + one highest-leverage improvement
- Tag improvement as musical refinement, technical fix, or architectural concern (architecture only when clearly warranted and explicitly requested)
- Do not auto-apply hard gates or treat sub-9 as automatic failure
- Open with: *â€œInterpreting GCE here as musician-facing critique, not formal repo release gating.â€*
- Category scores optional â€” include only when they clarify

**Formal rules (repo / pipeline):** unchanged â€” see Â§1 scoring contract, Â§1.1 short-form, hard gates Â§1 (bottom), and Â§2 LOCK.

Agent quick rule: **`.cursor/rules/gce-evaluation.mdc`** (mode table + Â§1 formal + Â§2 musician-facing).

### Â§1.3 Default mode (agents)

| Context | Default mode |
|---------|----------------|
| Chat evaluation (â€œGCE thisâ€, â€œis this good?â€, â€œpros and cons?â€, â€œwhat would raise it?â€) | **Musician-facing** â€” unless the user asks for **formal Composer OS validation** or mentions **LOCK**, **DCR**, or **CI** |
| Code changes, official evaluator runs, automated harness scores, release readiness | **Formal / technical** |

In musician-facing chat, open with: *â€œInterpreting GCE here as musician-facing critique, not formal repo release gating.â€* Full output shape: Â§1.0 musician-facing rules above.

### Â§1.1 Short-form / fragment outputs (&lt; ~16 bars, especially 8-bar leadsheet)

Short-form material **cannot** be judged the same way as full-chart output.

**Structurally limited / interpret with caution** (low scores may reflect fragment length, not craft failure alone):

- **Thematic recall potential**
- **Structure & form**
- Parts of **phrase grammar**

Report these as structurally limited / N/A-leaning where appropriate; **do not** blindly DCR-refine them on 8-bar proofs alone.

**Still meaningful on short-form** (real findings may apply):

- **Rhythm anti-loop / too-perfect grid** (LOCK `rhythmAntiLoop`)
- **Harmony & language / chord fidelity**
- **Range / idiomaticity**
- **GCE hard gates** (always blockers)

A **5.x** short-form score (e.g. Orbit leadsheet ~5.3â€“5.4 after Phase 7 GCE wiring) is **not** release quality; it may combine real underperformance **and** measurement distortion when judged on **8-bar** fragments only.

### Â§1.2 Roadmap triage (leadsheet-input / low GCE)

**>8-bar / full-chart** leadsheet-input measurement is **shipped** (full input up to **64-bar** cap; **`4b5a791a`**). Re-score on full-chart material before deep composer-grammar work.

When GCE is low on **leadsheet-input** or other short-form material:

1. Ask whether the score is **distorted by short-form limits** â€” prefer **full-chart** (â‰¤64 bars) re-score when available
2. **Then** decide whether the next work is rhythm, harmony correctness, or deeper composer grammar
3. **Do not** optimize deep composer-behavioural grammar until fair full-chart scoring is done
4. **Immediate fixable craft** still matters: `rhythmAntiLoop`, chord-fidelity / normalization, range / idiomaticity Â· **sparse-chord** leadsheets may inherit/default across long unlabeled stretches

See **`docs/COMPOSER_OS_ROADMAP.md`** for tier ordering (quality-unblocking â†’ craft depth â†’ input reach â†’ housekeeping).

### Category list (names only â€” formulas and thresholds in `GCE_FRAMEWORK_V2.md`)

1. Cadential clarity  
2. Melodic identity  
3. Phrase grammar  
4. Harmony & language  
5. Rhythmic identity  
6. Structure & form  
7. Arrangement & orchestration  
8. Economy & focus  
9. Tension & release  
10. Thematic recall potential  

### GCE hard gates (auto-fail â€” unchanged blockers)

**Hard gates remain true blockers** regardless of the calibrated operational release band above. Numeric thresholds are **not** relaxed.

Align with **`docs/GCE_FRAMEWORK_V2.md` Â§ Hard Gates**, including:

- Melodic identity **â‰¤ 6**
- No section contrast
- Cadential clarity coverage **&lt; 0.4**
- Accidental / unresolved ending â€” final bar tension **&gt; 0.7**

---

## 2. LOCK â€” hard gates before commit (style / composer output)

**LOCK hard gates are the real merge blockers.** The calibrated GCE release band (Â§1) is **guidance** for release-quality interpretation; it does **not** override LOCK or GCE hard gates.

**LOCK** is the **pre-commit compliance bundle** for any change that affects **generated music, symbols, or style behaviour** (including new or updated **composer slices**, **Song Mode style surfaces**, **ECM / vault** layers, presets, or export).

### L â€” Locked truth

- **Harmony lock:** If the pipeline uses **locked bars**, **slice precompute**, or **effective harmony arrays**, MusicXML and assertions must match **`getChordForBar`** / export-truth routing (see locked-harmony wiring in app generation and golden path).  
- **No silent drift** between UI chord text, engine bars, and XML.

### O â€” Output integrity

- **Export / readiness gates** must pass for the touched surface (e.g. export integrity receipt, schema-safe XML, host-import assumptions documented in playbook).  
- Do not commit â€œbroken shareableâ€ output paths without documenting bypass or fix.

### C â€” Category hard fails (GCE)

- Output evaluated against **Â§1** must **not** violate **GCE hard gates**.  
- For manual / harness evaluation: record overall score, weakest category, and PASS/FAIL.

### K â€” Key verification

- **Engine/test changes:** follow **`CLAUDE.md`** â€” e.g. **`npm run test:composer-smoke`** when smoke allowlists or engine behaviour changes (sync counts in roadmap/CHANGELOG per repo practice).  
- **Slice-only / docs-only:** at minimum **design-time GCE checklist** on representative seeds or harness output before merge.

**Rule:** Do not merge composer/style/generation changes that skip LOCK without an explicit exception note in the PR/commit body.

---

## 3. DCR â€” standard build workflow (Design Â· Commit Â· Refine)

**DCR** is the **single refinement loop** aligned with GCE (â€œrevise weakest only, one passâ€).

| Phase | Action |
|--------|--------|
| **D â€” Design** | Define goal, scope, GCE targets, affected Style Profile Layer (Â§4), and acceptance checks (LOCK Â§2). |
| **C â€” Commit** | Implement with deterministic behaviour; update **docs/playbook/changelog** when user-facing or slice behaviour changes; keep one logical change set reviewable. |
| **R â€” Refine** | **One** refinement pass: address **weakest GCE category** (or single blocking LOCK item), not a full rewrite. |

On **short-form** output, if the weakest category is **structurally limited** (Â§1.1), do **not** blindly refine it â€” prioritize fair **>8-bar / full-chart** re-score and fixable short-form findings (rhythm grid, chord fidelity, range) first.

**Forbidden:** repeated full regenerations or unconstrained tweak loops; if still failing after one Refine, return to **Design**.

### Â§3.1 Final-bar Tension (`finalBarTension`) slice fixes

Before applying the **standard final-bar tonic-force** pattern (`forceFinalBarTonicResolution` / `enforceFinalBarTonicResolution` â†’ tonic-family spelling) to a new composer slice:

1. Read the slice **header / comments** and chord **pool** for stated idiom intent (open-cadence, non-functional, impressionist/planing, noise / alt-rock, etc.).
2. If that intent is present, use the **idiomatic-bias** approach instead: bias piece-final selection toward outcomes the styleâ€™s **own vocabulary already sometimes produces** (and that already pass FBT), rather than forcing a jazz tonic-family chord.
3. Leave mid-piece devices untouched; piece-final bias/force only.

**Confirmed mismatches** (tonic-force would be wrong; idiomatic-bias used): **Debussy**, **Andrew Hill**, **Sonic Youth**.

**Addendum â€” dual-surface convergence (third pattern):** bacharach required a third fix pattern for modules with dual harmony-writing pipelines (an early "dressing" pass writing `lockedHarmonyBarsRaw` / `parsedCustomProgressionBars`, and a later "effective harmony" precompute writing a separate authoritative surface for `getChordForBar` / LOCK). A full-array sync between the two surfaces (Porter-style) risked LOCK semantic divergence when mid-piece values disagreed in voicing detail (e.g. 6/9 vs 6). Resolution: a final-bar-only sync/patch that converges both surfaces on just the final chord, leaving mid-piece values on each surface untouched. Verify convergence explicitly (compare final-bar values across all surfaces) rather than assuming a fix in one surface propagates. See bacharach commit **`ca619d8f`**, cole_porter commit **`35202ddd`** for comparison.


### §3.1a Ending context (`endingContext`) for `finalBarTension`

Numeric threshold is **unchanged**: tension **> 0.7** still fails when the gate applies. Context only decides whether auto-fail applies.

| Context | Default | Auto-fail when tension > 0.7? | Notes |
|---------|---------|-------------------------------|-------|
| `terminal` | Song Mode, leadsheets, charts, non-riff presets | **Yes** | Classic accidental / unresolved ending hard gate |
| `loop` | `riff_generator` | **No** | Loop-setup unresolved endings are idiomatic; do not auto-fail |
| `open_idiom` | Via `acknowledgeOpenIdiomEnding: true` | **No** | Conscious open terminal ending; emit disclosure (UI banner), not an ordinary riff loop |

Resolution order: explicit `acknowledgeOpenIdiomEnding` → `open_idiom`; else explicit `endingContext`; else `riff_generator` → `loop`; else `terminal`.

Modules: `engines/composer-os-v2/core/gce/endingContext.ts`, `finalBarTensionGate.ts`. Golden-path stamps metadata after context build. Cross-ref: `docs/GCE_FRAMEWORK_V2.md` hard-gate note.

---

## 4. Style Profile Layer â€” per-style scoring requirement

Every **composer slice** (primary `SongwriterRuleId`) and, where relevant, **Song Mode `StyleProfile`** (dropdown) must have an explicit **Style Profile Layer** definition:

1. **Primary GCE categories** to monitor for that voice (usually **Melodic identity**, **Harmony & language**, **Structure & form** â€” slice-specific).  
2. **Engine hooks**: harmony precompute, melody behaviour profile, style engine velocity, optional harmony policy (e.g. ECM motion policy).  
3. **Diagnostics**: receipt prefixes (`ec:*`, `fz:*`, â€¦), smoke/eval entry points per **`CLAUDE.md`**.  
4. **Evaluation**: slice smoke test and/or `npm run eval:<name>` where shipped; GCE-style assessment on representative seeds when adding behaviour.

**ECM (including in-progress surfaces):** Treat **`ecm_chamber`** slice + **`STYLE_ECM` / `STYLE_ECM_CHAMBER`** as one **Style Profile Layer** for documentation and QA: sparse/modal harmony language, phrase asymmetry, velocity contour, and builtin harmony policy must be scored under **Harmony & language**, **Tension & release**, **Economy & focus**, and **Melodic identity** as appropriate.

---

## 5. Where this applies

| Artifact | Requirement |
|----------|-------------|
| New composer slice | Â§4 Style Profile Layer + Â§2 LOCK + Â§3 DCR |
| Style surface / profile change | Â§4 + LOCK (O/C/K) |
| Docs-only eval rubric | Â§1 GCE + Â§2 LOCK checklist on sample output |
| ECM / Tonality Vault | Same standards; Â§4 explicitly covers ECM chamber / ECM style profiles |

---

## 6. Cross-references

- **`docs/GCE_CANONICAL.md`** â€” agent entry point (two modes; parked legacy list)
- `docs/GCE_FRAMEWORK_V2.md` â€” full GCE v2.0 mathematics and benchmarks  
- `.cursor/rules/gce-evaluation.mdc` â€” agent-applied GCE reminder  
- `.cursor/rules/composer-os-quality-gates.mdc` â€” LOCK + DCR + Style Layer reminders  
- `docs/COMPOSER_OS_PLAYBOOK.md` â€” user-facing workflows and export notes  

---

## GCE 9.0 Build Sequence

Priority order for maximum score gain per implementation session:

1. Motif Authority Layer â€” ThemeGenome + MotifCell + recall quotas
2. Voice Rule Compiler â€” VoiceRuleBundle per composer voice
3. Harmonic Scene Engine â€” scene pipeline + voice-leading solver
4. RhythmDNA â€” bound to motif and section identity
5. Form Controller â€” three-space, AABA, arch templates + tension scheduler

Milestone ladder:

- 8.4 â†’ 8.7: motif seeding, recall quotas, cadence-aware phrase endings,
  voice-specific rhythm cells
- 8.7 â†’ 9.0: deep harmonic scene differentiation, inner-voice motion
  scoring, form-level recapitulation and tension scheduling
- Above 9.0: orchestration-as-harmony, cross-section thematic memory,
  adaptive evaluator-driven repair passes

Implementation principle: every generated note must be explainable by
one of four authorities â€” motif, harmonic scene, rhythmic DNA, or form
role. Notes belonging to none are suppressing the 9.0 ceiling.

Note: style emulation parameters are tendencies not deterministic rules.
Expose as tunable weights. Especially true for Evans voicing abstractions,
sheets-of-sound rendering, and Schneider narrative arc intensity curves.

---

*Last integrated: 2026-06-16 â€” Â§1.0â€“Â§1.3 formal vs musician-facing GCE modes + default-mode rule (agent interpretation only; formulas/weights/hard-gate values unchanged).*
