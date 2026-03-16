# Composition Evaluator Engine

Scores compositions from any composer engine (Wayne Shorter, Barry Harris, Andrew Hill, Monk, Hybrid) for ranking and population search.

## Scoring Philosophy

- **0–10 scale** — All sub-scores and total are 0–10
- **No phrasing optimisation** — Evaluator does not optimise phrasing
- **No symmetry balancing** — Asymmetry is rewarded, not penalised
- **Preserve asymmetry** — Irregular phrase lengths and structural contrast score higher

## Evaluator Architecture

```
CompiledComposition
    ↓
motif_coherence      → motif_score
harmonic_interest    → harmony_score
interval_language    → interval_score
form_interest        → form_score
voice_leading        → voice_leading_score
asymmetry            → asymmetry_score
    ↓
weighted average     → total_score
    ↓
CompositionScore
```

## Scoring Criteria

| Score | Measures |
|-------|----------|
| motif | Motif reuse, variation, spacing, avoid random fragments |
| harmony | Harmonic variety, nonfunctional motion, avoid trivial loops |
| interval | Interval identity, characteristic intervals, avoid scalar monotony |
| form | Phrase asymmetry, section contrast, avoid symmetrical normalization |
| voice_leading | Melodic flow, interval leaps balance, direction changes |
| asymmetry | Irregular phrase lengths, rhythmic unpredictability, structural contrast |

## How to Rank Compositions

```python
from composition_evaluator import evaluate_composition
from composition_ranker import rank_compositions

# Single composition
score = evaluate_composition(compiled)
print(score.total_score, score.breakdown)

# Rank a list
ranked = rank_compositions([comp1, comp2, comp3])
for comp, s in ranked:
    print(comp.title, s.total_score)
```

## How Hybrid Engines Use the Evaluator

1. **Population search** — Generate N candidates, evaluate each, select elites
2. **Selection** — `rank_compositions(candidates)[:k]` for top k
3. **Quality gate** — Filter by `score.total_score >= threshold`
4. **Breakdown analysis** — Use `score.breakdown` to tune generation

## Integration

Works with any compiled output that has:
- `sections` with `melody_events`, `harmony`, `phrase_lengths`, `motif_refs`
- or `melody.events` and `harmony.chords`
