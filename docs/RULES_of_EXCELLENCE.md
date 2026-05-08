# Rules of Excellence — Composer OS (assembled export)

**Purpose:** Single downloadable snapshot of **GCE**, **LOCK**, **DCR**, Style Profile Layer, Cursor agent rules, canonical GCE v2.0 math, playbook evaluation hooks, and benchmarks.

**Assembled from** (same repo, no wording changes except this header):

| Source | Path |
|--------|------|
| Integrated standards | `docs/GCE_LOCK_DCR_STANDARDS.md` |
| Agent GCE reminder | `.cursor/rules/gce-evaluation.mdc` |
| Agent LOCK / DCR / Style Layer | `.cursor/rules/composer-os-quality-gates.mdc` |
| GCE v2.0 full framework | `docs/GCE_FRAMEWORK_V2.md` |
| Evaluation stack + LOCK gates + DCR protocol | `docs/COMPOSER_OS_PLAYBOOK.md` (Evaluation System section) |

For authoritative ongoing edits, prefer the files above individually.

---

# Part 1 — `docs/GCE_LOCK_DCR_STANDARDS.md` (full text)

# Composer OS — GCE · LOCK · DCR · Style Profile Layer

**Development standards for all musical output, style surfaces, and composer slices.**  
Applies to every build path (Generate, Song Mode, Tonality Vault, duo/ECM surfaces, including **ECM chamber / STYLE_ECM*** work in progress).

**Source note:** The manuscript `000_MUSIC_EVALUATION_-_GCE_-_LOCK_-_DCR.txt` was not found under `docs/` or `uploads/` in this repository. This document **integrates** the four systems from project practice and the canonical GCE specification in **`docs/GCE_FRAMEWORK_V2.md`**.

---

## 1. GCE v2.0 — Grand Criteria of Excellence (scoring)

**Authoritative detail:** `docs/GCE_FRAMEWORK_V2.md`  
**Agent quick rule:** `.cursor/rules/gce-evaluation.mdc`

### Scoring contract

- **10 categories**, each scored **0–10** (automatable dimensions per `GCE_FRAMEWORK_V2.md`).
- **Overall target ≥ 9.0** before treating output as release-quality.
- If **< 9.0**: revise **weakest category only**, **one pass**, **no full rewrite**; preserve asymmetry.

### Category list (names only — formulas and thresholds in `GCE_FRAMEWORK_V2.md`)

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

### GCE hard gates (auto-fail)

Align with **`docs/GCE_FRAMEWORK_V2.md` § Hard Gates**, including:

- Melodic identity in the failure band defined there (e.g. **≤ 6** where applicable)  
- No section contrast  
- Cadential clarity coverage below threshold (e.g. **< 0.4** where defined)  
- Accidental / unresolved ending (final-bar tension threshold)

---

## 2. LOCK — hard gates before commit (style / composer output)

**LOCK** is the **pre-commit compliance bundle** for any change that affects **generated music, symbols, or style behaviour** (including new or updated **composer slices**, **Song Mode style surfaces**, **ECM / vault** layers, presets, or export).

### L — Locked truth

- **Harmony lock:** If the pipeline uses **locked bars**, **slice precompute**, or **effective harmony arrays**, MusicXML and assertions must match **`getChordForBar`** / export-truth routing (see locked-harmony wiring in app generation and golden path).  
- **No silent drift** between UI chord text, engine bars, and XML.

### O — Output integrity

- **Export / readiness gates** must pass for the touched surface (e.g. export integrity receipt, schema-safe XML, host-import assumptions documented in playbook).  
- Do not commit “broken shareable” output paths without documenting bypass or fix.

### C — Category hard fails (GCE)

- Output evaluated against **§1** must **not** violate **GCE hard gates**.  
- For manual / harness evaluation: record overall score, weakest category, and PASS/FAIL.

### K — Key verification

- **Engine/test changes:** follow **`CLAUDE.md`** — e.g. **`npm run test:composer-smoke`** when smoke allowlists or engine behaviour changes (sync counts in roadmap/CHANGELOG per repo practice).  
- **Slice-only / docs-only:** at minimum **design-time GCE checklist** on representative seeds or harness output before merge.

**Rule:** Do not merge composer/style/generation changes that skip LOCK without an explicit exception note in the PR/commit body.

---

## 3. DCR — standard build workflow (Design · Commit · Refine)

**DCR** is the **single refinement loop** aligned with GCE (“revise weakest only, one pass”).

| Phase | Action |
|--------|--------|
| **D — Design** | Define goal, scope, GCE targets, affected Style Profile Layer (§4), and acceptance checks (LOCK §2). |
| **C — Commit** | Implement with deterministic behaviour; update **docs/playbook/changelog** when user-facing or slice behaviour changes; keep one logical change set reviewable. |
| **R — Refine** | **One** refinement pass: address **weakest GCE category** (or single blocking LOCK item), not a full rewrite. |

**Forbidden:** repeated full regenerations or unconstrained tweak loops; if still failing after one Refine, return to **Design**.

---

## 4. Style Profile Layer — per-style scoring requirement

Every **composer slice** (primary `SongwriterRuleId`) and, where relevant, **Song Mode `StyleProfile`** (dropdown) must have an explicit **Style Profile Layer** definition:

1. **Primary GCE categories** to monitor for that voice (usually **Melodic identity**, **Harmony & language**, **Structure & form** — slice-specific).  
2. **Engine hooks**: harmony precompute, melody behaviour profile, style engine velocity, optional harmony policy (e.g. ECM motion policy).  
3. **Diagnostics**: receipt prefixes (`ec:*`, `fz:*`, …), smoke/eval entry points per **`CLAUDE.md`**.  
4. **Evaluation**: slice smoke test and/or `npm run eval:<name>` where shipped; GCE-style assessment on representative seeds when adding behaviour.

**ECM (including in-progress surfaces):** Treat **`ecm_chamber`** slice + **`STYLE_ECM` / `STYLE_ECM_CHAMBER`** as one **Style Profile Layer** for documentation and QA: sparse/modal harmony language, phrase asymmetry, velocity contour, and builtin harmony policy must be scored under **Harmony & language**, **Tension & release**, **Economy & focus**, and **Melodic identity** as appropriate.

---

## 5. Where this applies

| Artifact | Requirement |
|----------|-------------|
| New composer slice | §4 Style Profile Layer + §2 LOCK + §3 DCR |
| Style surface / profile change | §4 + LOCK (O/C/K) |
| Docs-only eval rubric | §1 GCE + §2 LOCK checklist on sample output |
| ECM / Tonality Vault | Same standards; §4 explicitly covers ECM chamber / ECM style profiles |

---

## 6. Cross-references

- `docs/GCE_FRAMEWORK_V2.md` — full GCE v2.0 mathematics and benchmarks  
- `.cursor/rules/gce-evaluation.mdc` — agent-applied GCE reminder  
- `.cursor/rules/composer-os-quality-gates.mdc` — LOCK + DCR + Style Layer reminders  
- `docs/COMPOSER_OS_PLAYBOOK.md` — user-facing workflows and export notes  

---

*Last integrated: 2026-05-05 — repository standards consolidation.*

---

# Part 2 — `.cursor/rules/gce-evaluation.mdc` (full text)

---
description: GCE v2.0 universal evaluation — Composer OS MusicXML and musical output.
alwaysApply: true
---

# GCE v2.0 — Universal Music Evaluation Standard
# Applied automatically to ALL Composer OS musical output

Every time Composer OS generates MusicXML output, evaluate
against GCE v2.0 before confirming success.

Full framework: see docs/GCE_FRAMEWORK_V2.md

**Integrated standards (GCE + LOCK + DCR + Style Profile Layer):** `docs/GCE_LOCK_DCR_STANDARDS.md`  
**Pre-commit / workflow / per-slice rules:** `.cursor/rules/composer-os-quality-gates.mdc`

Quick reference:
- 10 categories, all score 0-10
- Overall must reach 9.0
- If < 9.0: revise weakest only, one pass, no full rewrite
- Hard fail: Melody <= 6, no section contrast, accidental ending

Apply this framework whenever:
- Generating or evaluating any MusicXML output
- Reviewing chord progressions or melody lines
- Assessing any musical sketch, song, or arrangement
- Running gceStyleEval or any evaluation script
- Changing composer slices, Song Mode style surfaces, ECM/vault layers, or export paths (also satisfy LOCK + Style Profile Layer in `docs/GCE_LOCK_DCR_STANDARDS.md`)

---

# Part 3 — `.cursor/rules/composer-os-quality-gates.mdc` (full text)

---
description: LOCK pre-commit gates, DCR workflow, Style Profile Layer — composer/style output.
alwaysApply: true
---

# Composer OS — LOCK · DCR · Style Profile Layer

Full specification: **`docs/GCE_LOCK_DCR_STANDARDS.md`** (includes **GCE v2.0** cross-reference to **`docs/GCE_FRAMEWORK_V2.md`**).

## LOCK (before merging composer/style/generation/export work)

Must pass before committing output-affecting changes unless the commit message documents an explicit exception:

1. **Locked truth** — harmony bars / slice precompute / XML alignment; no drift between pasted symbols, effective bars, and export.
2. **Output integrity** — export/readiness expectations met for the touched path (shareable XML, integrity receipts where applicable).
3. **GCE hard gates** — no violation of **`docs/GCE_FRAMEWORK_V2.md`** hard failures (melodic/section contrast/cadential/ending rules).
4. **Key verification** — follow **`CLAUDE.md`**: smoke tier when engine/smoke lists change; otherwise minimal GCE + LOCK checklist on representative output.

## DCR workflow

**Design** → **Commit** → **Refine** (single pass on weakest GCE category or one blocking LOCK item only). No full rewrite; no infinite refine loops.

## Style Profile Layer

Every composer slice / relevant **`StyleProfile`** must define monitored GCE dimensions, diagnostics (`*:*` receipts), and eval/smoke expectations per **`docs/GCE_LOCK_DCR_STANDARDS.md` §4**. **ECM** (`ecm_chamber`, **`STYLE_ECM`**, **`STYLE_ECM_CHAMBER`**) included.

---

# Part 4 — `docs/GCE_FRAMEWORK_V2.md` (full text)

---
# GCE v2.0 — UNIVERSAL MUSIC EVALUATION FRAMEWORK
# For Composer OS — applies to all musical output

## See also

**Development workflow bundle (LOCK hard gates, DCR, Style Profile Layer):** `docs/GCE_LOCK_DCR_STANDARDS.md`

## Scope
Applies to: songs, sketches, études, arrangements,
works in progress, instrumental pieces, ensemble output.
NOT limited to: bebop, songs with lyrics, or any single style.

## Scoring
- Score each category 0-10
- Overall must reach 9.0 before final output
- If < 9.0: revise weakest category only, one pass
- Never full rewrite. Preserve asymmetry.

## 10 Categories (all fully automatable)

1. CADENTIAL CLARITY
   Measures harmonic/melodic arrival points at phrase endings.
   Pass >= 6.5. Hard fail if coverage < 0.4
   Reads: MelodicNote[], chords[], ScoreModel, sections

2. MELODIC IDENTITY
   Motif recurrence + contour distinctiveness + interval economy
   Formula: 10 * (0.35R + 0.25C + 0.20I + 0.20G)
   Pass >= 6.5. Hard fail if motifRecurrence < 0.35
   Reads: MelodicNote[]

3. PHRASE GRAMMAR
   Phrase segmentation, balance, closure, recurrence with variation
   Formula: 10 * (0.30L + 0.30C + 0.30R + 0.10(1-O))
   Pass >= 6.0. Fail if closureRate < 0.35
   Reads: MelodicNote[], chords[], sections

4. HARMONY & LANGUAGE
   Extension value + functional motion + voice leading + variety
   Formula: 10 * (0.25E + 0.30F + 0.30V + 0.15H)
   Pass >= 6.5. Fail if voiceLeadingProxy < 0.35
   Reads: chords[]

5. RHYTHMIC IDENTITY
   IOI variety + syncopation + rhythm motif + groove stability
   Formula: 10 * (0.25I + 0.30S + 0.25R + 0.20G)
   Pass >= 6.0. Fail if syncopation < 0.15 AND motifRecurrence < 0.20
   Reads: MelodicNote[]

6. STRUCTURE & FORM
   Adjacent contrast + return consistency + boundary strength
   Formula: 10 * (0.35A + 0.35R + 0.30B)
   Pass >= 6.5. Fail if repeated labels differ > 0.55
   Reads: ScoreModel, sections, chords[]

7. ARRANGEMENT & ORCHESTRATION
   Hierarchy clarity + density variation + register layering
   Formula: 10 * (0.35H + 0.25D + 0.25L + 0.15(1-P))
   Pass >= 6.0. Fail if hierarchyClarity < 0.40
   Reads: ScoreModel

8. ECONOMY & FOCUS
   Note density + silence use - ornament overload - register waste
   Formula: 10 * (0.40N + 0.25S + 0.20(1-O) + 0.15(1-W))
   Pass >= 6.0. Fail if ornamentOverloadPenalty > 0.28
   Reads: MelodicNote[], ScoreModel

9. TENSION & RELEASE
   Arc count + arrival resolution - overflat penalty
   Formula: 10 * (0.45A + 0.40R + 0.15(1-F))
   Pass >= 6.5. Fail if overflatPenalty > 0.6
   Reads: MelodicNote[], chords[]

10. THEMATIC RECALL POTENTIAL
    Motif strength + section spread + variedness + compactness
    Formula: 10 * (0.75P + 0.25S - penalty)
    Pass >= 6.0. Fail if no motif has 3+ occurrences in 2+ sections
    Reads: MelodicNote[], sections

## Hard Gates (Auto-Fail any output)
- Melodic Identity <= 6
- No section contrast
- Cadential Clarity coverage < 0.4
- Final bar tension > 0.7 (accidental ending)

## Engine Rules
- Generate -> evaluate -> revise weakest only -> output once
- Never full rewrite
- Never optimise symmetry
- Preserve asymmetry and asymmetrical phrasing

## Implementation Order
1. Parse melody: attacks, IOIs, phrase candidates, motifs
2. Parse chords: root/quality/extensions per bar
3. Summarize section vectors and boundary bars
4. Score all 10 from shared intermediate features

## Output Format
- Category name: score/10 — one-line justification
- Overall: X.X/10
- Status: PASS / FAIL
- If revised: what changed and why
---

## Reference — `grand-criteria-of-excellence-jazz` (GitHub)

Repository: `https://github.com/mikeb55/grand-criteria-of-excellence-jazz` (local clone under *Cursor AI Projects*).

Useful legacy material (jazz / workflow — **not** a substitute for this universal v2.0 spec, but worth cross-reading):

| Asset | Notes |
|-------|--------|
| `Composition Rules/GCE_Jazz_v1_0.md` | Original **GCE Jazz v1.0** title and scope (jazz composition, arranging, harmony). |
| `Composition Rules/GCE_Melodic_Development_Rules.md` | Melodic development techniques, counterpoint “actionable logic,” orchestration layering — qualitative companion to **Melodic Identity** / **Arrangement** categories above. |
| `Composition Rules/CLEF_ASSIGNMENT_RULES.md` | Notation layout rules (instrumentation export quality). |
| `Project Logs/GCE_Jazz_Transformation_Log.md`, `GCE_Transformation_Log_Orbit.md` | Project history tied to GCE-aligned tune work. |
| `BarryEngine/` (e.g. `gce_scoring.py`) | Phrase/section-level scoring hooks in Python — different data model than Composer OS `ScoreModel`; useful for **tension–release** and **form** intuition only. |

**Relationship:** `docs/GCE_FRAMEWORK.md` remains the earlier **song-oriented** Cursor/Claude rubric (10 subjective categories + hard gates). **This file (v2.0)** is the **master engineering standard** for measurable, automatable evaluation across **all** Composer OS outputs.

## Latest Benchmark (2026-04-19, seed 50021)
| Preset | Score | Weakest |
|--------|-------|---------|
| guitar_bass_duo | 7.8/10 | Melodic Identity |
| guitar_bass_duo_single_line | 8.1/10 | Melodic Identity |
| big_band | 8.0/10 | Melodic Identity |
| string_quartet | 8.0/10 | Melodic Identity |
| wyble_etude | 8.0/10 | Melodic Identity |
| riff_generator | 8.0/10 | Melodic Identity |
| song_mode | 8.0/10 | Melodic Identity |
| ecm_chamber | OOM pending |

Bad piece: 3.1/10. Target: 9.0/10. Gap: 1.0 point.

### Song Mode writer styles (same seed, harness)
| Style | Overall | Weakest |
|-------|---------|---------|
| donald_fagen | 7.9/10 | Melodic Identity |
| wayne_shorter | 7.9/10 | Melodic Identity |
| bacharach | 7.9/10 | Melodic Identity |
| barry_harris | 7.9/10 | Melodic Identity |
| ecm_chamber | 7.9/10 | Melodic Identity |

Bad piece sanity check: 3.1/10 (separation confirmed).

## Final Benchmark (2026-04-19, seed 50021)
| Preset | Score | Weakest |
|--------|-------|---------|
| song_mode_shorter | 8.4/10 | Melodic Identity |
| song_mode_bacharach | 8.4/10 | Melodic Identity |
| song_mode_barry_harris | 8.4/10 | Melodic Identity |
| song_mode_fagen | 8.3/10 | Melodic Identity |
| guitar_bass_duo_single_line | 8.3/10 | Melodic Identity |
| guitar_bass_duo | 8.0/10 | Economy & Focus |
| song_mode_metheny | 7.9/10 | Melodic Identity |
| big_band | 7.9/10 | Melodic Identity |
| string_quartet | 7.9/10 | Melodic Identity |
| wyble_etude | 7.9/10 | Melodic Identity |
| riff_generator | 7.9/10 | Melodic Identity |
| ecm_chamber | OOM pending |
Gap to 9.0: 0.6-1.1 points. Universal weakness: Melodic Identity.

## Definitive Benchmark ([2026-04-20], seed 50021, all 12 presets)
| Preset | Score | Weakest |
|--------|-------|---------|
| song_mode_shorter | 8.4/10 | Melodic Identity |
| song_mode_bacharach | 8.4/10 | Melodic Identity |
| song_mode_barry_harris | 8.4/10 | Melodic Identity |
| song_mode_fagen | 8.3/10 | Melodic Identity |
| guitar_bass_duo_single_line | 8.3/10 | Melodic Identity |
| guitar_bass_duo | 8.0/10 | Economy & Focus |
| song_mode_metheny | 7.9/10 | Melodic Identity |
| big_band | 7.9/10 | Melodic Identity |
| string_quartet | 7.9/10 | Melodic Identity |
| wyble_etude | 7.9/10 | Melodic Identity |
| riff_generator | 7.9/10 | Melodic Identity |
| ecm_chamber | 7.8/10 | Arrangement & Orchestration |

Zero regressions. ECM first successful eval.
Gap to GCE 9.0: 0.6-1.2 points.
Next: Motif Authority Layer.

---

# Part 5 — `docs/COMPOSER_OS_PLAYBOOK.md` — Evaluation System (excerpt)

## Evaluation System

Composer OS embeds a layered **evaluation** stack used for **observational receipts** (especially Big Band): extract features from a **`ScoreModel`**, score **GCE** (10 categories), score a **style profile** (Big Band arrangers and optional **Light Touch** genre profiles), run **LOCK** gates, optionally combine into a single **`CombinedEvaluationResult`**. **DCR** (Design → Commit → Refine) is available for candidate workflows; it is separate from the golden-path Generate pipeline unless wired explicitly.

### Overview

| Layer | Role |
|-------|------|
| **Feature extraction** | `scoreModelFeatureExtractor` — `orchestration`, `formal`, `rhythmic` metrics from **`sourceFormat: scoreModel`** |
| **GCE** | `evaluateGce` — 0–10 category scores × weights → **`gce.finalScore`** |
| **Style profile** | `StyleProfile.score` — dimension scores × weights → **`style.finalStyleScore`** |
| **LOCK** | `evaluateLock` — hard gates on XML presence, bar count, harmony presence, repetition / swing extremes, register |
| **Combined** | `createCombinedEvaluator().evaluate` — blends GCE + style; respects **`lockRequired`** |
| **DCR** | `runDcrProtocol` — multi-candidate design, optional **single** refinement pass |

### GCE (10 categories + default weights)

Default weights (**`defaultGceWeights`** in **`gceEvaluator.ts`**) — must sum to **1.0**:

| Category | Weight |
|----------|--------|
| cadentialClarity | 0.10 |
| melodicIdentity | 0.12 |
| phraseGrammar | 0.10 |
| harmonyAndLanguage | 0.12 |
| rhythmicIdentity | 0.12 |
| structureAndForm | 0.10 |
| arrangementAndOrchestration | 0.10 |
| economyAndFocus | 0.08 |
| tensionAndRelease | 0.08 |
| thematicRecallPotential | 0.08 |

Placeholder scoring is still **5.0** per category until feature-linked GCE logic lands.

### LOCK (6 gates)

| Gate id | Severity | Check |
|---------|----------|--------|
| **xmlValidity** | critical | Output is not **null** / **undefined** |
| **barDurationIntegrity** | error | **`features.formal.barCount`** is a positive number |
| **chordMelodyAlignment** | error | **`features.harmonic`** exists and is non-empty |
| **sectionContrast** | warning | **`formal.riffRepetitionRatio`** ≠ **1.0** |
| **rhythmAntiLoop** | warning | **`rhythmic.swingGridAlignment`** ≠ **1.0** |
| **registerIntegrity** | error | **`orchestration.avgVoicingSize`** between **1** and **12** |

Big Band **combined** evaluation uses **`lockRequired: false`** in the app so incomplete extract fields do not block observational **`pass`** while extraction catches up.

### DCR protocol

**`runDcrProtocol`** — **Design**: generate **`candidateCount`** candidates, score with **`CombinedEvaluator`**, pick highest **`combinedScore`**. **Commit**: if best ≥ **`targetScore`**, return (no refine). **Refine** (at most **once**): refine weakest dimension via **`refiner.refine`**, re-score, keep whichever candidate scores higher — **never** regenerate all candidates; **never** loop refinement.
