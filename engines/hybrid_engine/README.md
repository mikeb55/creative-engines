# Style-Aware Hybrid Composition Engine

Generates, scores, selects, and exports hybrid compositions by combining multiple composer engines with style-aware evaluation.

## What a Hybrid Composition Is

A hybrid uses different engines for different roles:

- **Melody (primary)** — Main melodic material
- **Harmony** — Chord progression and harmonic color
- **Counter** — Countermelody (optional)
- **Rhythm** — Rhythmic punctuation (optional)

The hybrid compiler delegates each role to the specified engine and combines the results.

## Engine Roles

| Role | Engines | Character |
|------|---------|-----------|
| Melody | wayne_shorter, barry_harris, andrew_hill, monk | Primary identity |
| Harmony | wayne_shorter, barry_harris, andrew_hill, monk | Harmonic color |
| Counter | Optional second engine | Contrasting line |
| Rhythm | Optional (e.g. monk) | Rhythmic character |

## Style-Aware Scoring

Hybrids are scored by:

- **Base evaluator** — Motif, harmony, interval, form, voice-leading, asymmetry
- **Style DNA** — Fit to primary (melody) engine
- **Hybrid balance** — Primary identity strong, harmony/counter/rhythm contribute
- **Harmony engine fit** — Harmony reflects harmony engine

This prevents bland averaging and rewards clear identity with complementary support.

## Usage

### Generate and rank hybrids

```python
from hybrid_engine.hybrid_generator import generate_hybrid_candidates
from hybrid_engine.hybrid_ranker import select_top_hybrids

candidates = generate_hybrid_candidates("My Title", count=12, seed=0)
top = select_top_hybrids(candidates, top_n=5)
```

### Run hybrid population search

```python
from hybrid_engine.hybrid_population_runtime import run_hybrid_population_search, export_top_hybrids

top = run_hybrid_population_search(
    input_text="Hybrid Search",
    count=12,
    generations=2,
    top_n=5,
    seed=0,
)
paths = export_top_hybrids(top, output_dir="output", prefix="hybrid")
```

### Via population composer (hybrid mode)

```python
from population_composer.population_runtime import run_population_search

best = run_population_search(
    engine_name="wayne_shorter",
    population_size=12,
    generations=2,
    hybrid_mode=True,
    input_text="Hybrid Pop",
)
```

## Suggested Combinations

1. Shorter melody + Barry Harris harmony
2. Hill melody + Monk rhythm + Shorter harmony
3. Monk melody + Barry Harris harmony + Hill counterline
4. Shorter melody + Monk harmony
5. Barry Harris melody + Hill harmony
6. Monk melody + Shorter harmony
7. Hill melody + Barry Harris harmony
8. Shorter melody + Harris + Monk rhythm
