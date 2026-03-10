# GCE Evaluation Framework

**Version 1.0**  
**Universal — applies to all styles, ensembles, projects**

---

## GCE Rule (Mandatory)

**MusicXML may only be generated when the composition internally evaluates ≥ 9.0 on the GCE scale.**

Before outputting any MusicXML:

1. Run an internal evaluation against the GCE framework.
2. If GCE < 9.0:
   - Revise composition
   - Improve structure, harmony, orchestration, rhythm
   - Re-evaluate
3. Repeat until GCE ≥ 9.0.
4. **MusicXML output is NOT permitted until threshold is met.**

---

## GCE Rubric (0–10 per category)

Evaluate each category. Calculate overall score (average or weighted).

| # | Category | Description |
|---|----------|-------------|
| 1 | **Melodic identity** | Distinct, memorable melodic material; not generic |
| 2 | **Harmonic clarity** | Harmony supports structure; uses palette (Tonality Vault, interval cycles, etc.) |
| 3 | **Voice independence** | Each part has distinct role; no mere doubling |
| 4 | **Ensemble interaction** | Dialogue between instruments; responsive writing |
| 5 | **Texture control** | Density arc present; variation; no static texture > 4 bars × 2 |
| 6 | **Emotional resonance** | Piece has perceptible character and arc |
| 7 | **Originality** | Avoids cliché; distinctive choices |
| 8 | **Formal coherence** | Clear structure; sectional logic; rehearsal letters |
| 9 | **Idiomatic playability** | Parts suit the instruments; playable ranges |
| 10 | **Motivic integration** | Motifs evolve; transformation present |

---

## Threshold

- **Minimum for export:** 9.0
- **Target:** 9.0–10.0
- **Regenerate if below:** Do not output. Diagnose. Revise. Re-evaluate.

---

## Automatic Revision Loop

Before final output, perform internally:

1. Composition draft
2. Structural review
3. Harmonic enrichment
4. Orchestration refinement
5. Rhythmic improvement
6. Engraving correction
7. Final GCE evaluation

**Only when GCE ≥ 9.0** → generate MusicXML.

---

## Failsafe Conditions — Regenerate If

- Harmonic-capable parts (guitar, piano, etc.) are monophonic with no harmonic role
- Excessive repetition detected (cell > 4 bars repeated > 2× without transformation)
- Harmonic stagnation occurs
- Rhythmic identity unclear
- Orchestration lacks dialogue between instruments
- Score lacks sectional structure (rehearsal letters, boundaries)

---

## Output Policy

- Aim directly for GCE 9–10 quality in a single pass.
- Avoid incremental prompts whenever possible.
- Produce highest possible artistic level.
- Do not output sub-threshold work.
