---
# GCE v2.0 — UNIVERSAL MUSIC EVALUATION FRAMEWORK
# For Composer OS — applies to all musical output

## See also

**Development workflow bundle (LOCK hard gates, DCR, Style Profile Layer):** `docs/GCE_LOCK_DCR_STANDARDS.md`

## Scope
Applies to: songs, sketches, études, arrangements,
works in progress, instrumental pieces, ensemble output.
NOT limited to: bebop, songs with lyrics, or any single style.

## Agent interpretation — two modes (formulas unchanged)

This document is the **authoritative formal specification** for automated evaluation and repo quality gates. The categories and hard gates below are **not** relaxed in any mode.

| Mode | Use when |
|------|----------|
| **Formal / technical** | Composer OS code, official evaluator runs, LOCK / DCR, release readiness, automated scores |
| **Musician-facing / conversational** | Chat critique (“GCE this”, “is this good?”, etc.) unless formal validation is explicitly requested |

**Default for chat:** musician-facing — unless the user asks for **formal Composer OS validation** or mentions **LOCK**, **DCR**, or **CI**. Pipeline and evaluator work default to formal / technical.

In **musician-facing** mode, agents score musical quality on the same 0–10 scale and GCE category vocabulary, but:
- Do **not** treat the score as repo PASS/FAIL or apply hard gates unless formal validation is requested
- Do **not** treat sub-9 as automatic failure or jump to architecture changes from one low score
- Distinguish musical issues from notation / export limitations
- On short fragments, mark thematic recall, large-scale structure & form, and global phrase grammar as **N/A / structurally limited** (see `docs/GCE_LOCK_DCR_STANDARDS.md` §1.1)
- Prefer: overall score, strengths, weaknesses, one highest-leverage improvement (musical / technical / architectural tag)

Full chat behaviour: **`.cursor/rules/gce-evaluation.mdc` §2** · **`docs/GCE_LOCK_DCR_STANDARDS.md` §1.0**.

## Scoring
- Score each category 0-10
- **9.0** = aspirational north star (long-term benchmark; formulas unchanged)
- **7.9–8.4** = current empirical release-quality / system-ceiling band under the present system
- **Operational release band (guidance):** >= 7.9 PASS · 6.5–7.8 acceptable / one weakest-category pass · < 6.5 materially weak
- If below operational band: revise weakest category only, one pass (DCR)
- Never full rewrite. Preserve asymmetry.
- **Hard gates** (below) remain auto-fail blockers regardless of calibrated overall band

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

**Relationship:** **`docs/GCE_CANONICAL.md`** is the agent entry point. **`docs/GCE_FRAMEWORK.md`** and **`rules/gce_evaluation_framework.md`** are **parked** (historical only). **This file (v2.0)** is the **master engineering standard** for measurable, automatable evaluation across **all** Composer OS outputs.

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

### Benchmark interpretation (2026-06-15)

- Ceilings around **7.9–8.4** define the **current practical system ceiling** under tuned presets (not a formula change).
- **9.0** remains the **long-term benchmark**; the documented **0.6–1.2** point gap is real.
- **Short-form outputs** (< ~16 bars, especially 8-bar leadsheet fragments) must **not** be scored like full charts — see **`docs/GCE_LOCK_DCR_STANDARDS.md` §1.1**.
- **Roadmap:** fix **>8-bar / full-chart** measurement first, re-score, then decide rhythm vs harmony vs deeper composer grammar — do not treat a low 8-bar score as automatic proof that deep composer-grammar work is next.
