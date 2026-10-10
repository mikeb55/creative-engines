# GCE Framework V3.0 — Musical Excellence & Radical Reworking

Status: proposed additive framework, 10 October 2026.

**Numeric authority stays in** `docs/GCE_FRAMEWORK_V2.md`. **LOCK, DCR, and Style Profile Layer** stay in `docs/GCE_LOCK_DCR_STANDARDS.md`. This file does not restate category formulas, weights, or benchmark tables.

## 1. Authority and compatibility

GCE V3.0 supplements GCE V2.0; it does not replace, renumber, recalculate, or relax the canonical ten categories, formulas, weights, LOCK hard gates, or DCR procedure. This document is an agent-facing quality and evidence contract, initially piloted on WWH guitar/upright-bass duo reworkings. Do not present it as an implemented numerical evaluator.

## 2. Calibrated GCE interpretation (unchanged V2.0)

- 9.0: aspirational north star, not automatic operational release threshold.
- 7.9–8.4: empirical release-quality / current system-ceiling band for the tested Composer OS presets; >=7.9 is operational PASS for calibrated, tuned output **only when** all hard gates pass.
- 6.5–7.8: promising / revise the weakest meaningful dimension once.
- <6.5: materially weak / investigate.
- This calibration cannot be transferred uncritically to manually written WWH reworkings or untested styles. No fabricated scores; log evaluator version, input scope, and actual measurements.

## 3. LOCK hard gates (unchanged)

All remain automatic failure blockers regardless of overall score:

- Melodic Identity <=6.
- No section contrast.
- Cadential Clarity coverage <0.4.
- Final-bar tension >0.7.

Consciously unresolved or experimental music may be artistically valid, but a failed canonical gate must remain FAILED; document the artistic conflict separately. Never silently waive or alter gates. Context-aware application of the final-bar gate (`endingContext`) is defined in `docs/GCE_LOCK_DCR_STANDARDS.md` §3.1a; the numeric threshold is unchanged.

## 4. Short-form calibration and DCR (unchanged interpretation)

For fragments below roughly 16 bars, particularly 8-bar leadsheets, thematicRecallPotential, structureAndForm and elements of phraseGrammar can be structurally limited. Mark those measurements accordingly. RhythmAntiLoop, chord-fidelity, range, and idiomatic failures remain actionable even in short fragments. Prefer full-chart (>8-bar) evaluation before recommending major grammar changes. DCR revises the weakest meaningful, non-structurally-limited category ONCE; re-evaluate afterward and report remaining issues.

## 5. New V3.0 musical evidence layers (supplementary, qualitative)

### A — Source identity and creative transformation

- Record authoritative source file, immutable SHA-256, motif landmarks and source-to-output passage correspondences.
- For WWH, target approximately 65% recognisable melodic identity / 20% harmonic identity / 40% rhythmic identity as *listening heuristics*, not numerical quotas or hard gates.
- Preserve opening fingerprint, significant returns, characteristic gestures, and final melodic destination where the source warrants them; deliberate nonliteral transformations require a traceable musical rationale.
- Avoid simultaneously obscuring all melody, rhythm and source-bass relationships for long spans. Intentional silence and exceptions are valid when compositionally purposeful.

### B — Development, contrast and anti-mechanism

- Name each version's core premise and its phrase-to-phrase development: statement, variation, contrast, climax/restraint, return, ending appropriate to the original form.
- Check recurring chord-grip schedules, fixed attack grids, unchanging four-bar loops, arbitrary pitch-class cycling and generic accompaniment. Repetition is allowed when purposeful and transformed.
- Compare all four arrangements for materially distinct texture, rhythmic grammar, register, harmony and bass interaction.

### C — Guitar and duo idiom

- Check independent guitar voices, real fret/string assignments for questionable grips, hand movements, sustain and overlap, voice-leading, rests and ensemble space.
- Respect the unchanged upright bass as a melodic partner, not a harmonic root machine. Preserve meaningful solos and handoffs.
- No TAB in released music. Do not assert physical playability from pitch range alone.

### D — Compositional language

- Draw selectively on existing Wyble, Shorter, Wheeler, Frisell, Hill, Liquid Harmony/Tonality Vault, pentatonic fields and related systems. Use existing mechanisms where they are source-compatible; do not claim an engine was run when its style ideas were only adapted manually.
- Radical dissonance, angularity and ambiguity can be artistically excellent; conventional resolution is not a universal compositional goal.

### E — Music and performance evidence

- Track separately: MusicXML-valid; source/bass/form-verified; musically analysed; notation-import-checked; playback-auditioned; guitarist-play-tested; user-accepted.
- Never call a file 'excellent', 'auditioned', 'GCE 8.x' or 'release approved' unless corresponding evidence exists. The absence of audition or playing is an explicit limitation.

## 6. Release decision contract

- **TECHNICAL FAIL:** incomplete or malformed XML, source-identity discrepancy, bass/timing drift, incorrect measure duration, broken ties, or lost protected landmarks. Must repair before any candidate release.
- **MUSICAL REVISE:** valid score but weak recognition, mechanical surface, undeveloped phrases, insufficiently differentiated concept, non-idiomatic voice-leading or unresolved playability concerns.
- **CANDIDATE FOR AUDITION:** technical gates pass, a substantive source-specific musical critique finds no material compositional defect, engine/evaluator results are faithfully reported; no independent audition yet.
- **MUSICALLY APPROVED:** evidence of genuine audition and, for technical guitar writing, physical playability review plus explicit artistic acceptance. No automated system can confer this status by assertion.
- If an arrangement remains weak after a focused DCR pass, mark it REVISE/REJECT with evidence, never manufacture PASS. Do not endlessly iterate; stop on a defined defect and solicit human judgement only where needed.

## 7. WWH release application

- Nine original leadsheets, 4 distinct reworkings each = 36 MusicXML files, each with a concise bar-range map and evidence report.
- Locked per source: unchanged upright-bass event stream, source form, bar count, metre, tempo, rehearsal marks, critical silences, and preserved original files. Original chord labels may change in new arrangements to describe actual new harmony.
- Audited source selection precedes composition; highest version number is not automatically authoritative.
- Four identities per song are musical briefs, not interchangeable algorithm templates. Preserve the original practice guide's song-specific approaches wherever strong.
- Implement musical quality checks and technical checks before delivery. Keep all candidates in a staging area; publish as one completed nine-song set only when each has achieved the demonstrable **candidate-for-audition** standard. Do not mislabel such a set 'musically approved' prior to listening and playing.
- If release conditions cannot be met, hold the incomplete set and report blockers, rather than giving the user inferior files or claiming delivery is complete.

## 8. Change control

V3.0 documentation is additive. Do not change existing evaluator code, weights, scoring formulas, proof runners, test fixtures or hard-gate values in the V3.0 documentation step. Any future evaluator implementation requires separate design, calibration, regressions, and explicit approval. Preserve V2.0 benchmark tables and historical reports.
