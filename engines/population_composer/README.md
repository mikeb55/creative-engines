# Population Composer Engine

Population-based evolutionary search for compositions. Generates many compositions using existing composer engines, evaluates them with the composition evaluator, and evolves better results through mutation and crossover.

## Population Search

1. **Generate** — Use a composer engine (wayne_shorter, barry_harris, andrew_hill, monk) to produce an initial population of compositions.
2. **Score** — Each composition is evaluated by the composition_evaluator (motif, harmony, interval, form, voice-leading, asymmetry).
3. **Select** — Top-scoring candidates are retained (elite selection).
4. **Evolve** — Mutate and crossover to produce the next generation.
5. **Repeat** — Iterate for a fixed number of generations.

## Evolution Strategy

- **Elite ratio** — Fraction of population kept as parents (default 0.3).
- **Mutation** — Randomly apply one of: mutate_intervals, mutate_harmony, mutate_motif, mutate_phrase_lengths, mutate_form.
- **Crossover** — Combine two parents: crossover_melody, crossover_harmony, or crossover_motif.
- **Asymmetry preserved** — Mutations avoid symmetrical normalization; phrase lengths favor odd values.

## Composer Engines

Population generation plugs into the engine registry:

```python
from shared_composer.engine_registry import get_engine
engine = get_engine("wayne_shorter")
ir = engine.generate_ir("Title", mode="title", seed=0)
compiled = engine.compile_from_ir(ir)
```

Each engine produces compiled compositions with `sections`, `melody_events`, `harmony`, `phrase_lengths`, `motif_refs`.

## Evaluator Ranking

The composition_evaluator scores compositions 0–10 on:

- motif — Coherence, variation, spacing
- harmony — Variety, nonfunctional motion
- interval — Interval language consistency
- form — Section roles, phrase length variety
- voice_leading — Smoothness
- asymmetry — Odd phrase lengths, structural variety

Higher total score = better composition. `select_top_candidates` returns the highest-scoring candidates.
