# Songwriting Engine — Population Search + Quality Selection Report

## Summary

- **Previous baseline:** ~7.7
- **New average best:** 7.81
- **Best overall:** 7.9
- **Worst best:** 7.8
- **Improvement:** +0.11
- **Target:** >= 8.5
- **Status:** Plateau reduced; population search improves selection; still below 8.5

---

## Files Created

| File | Purpose |
|------|---------|
| `population_generator.py` | Population search: generate N candidates, evaluate, rank, mutate, recombine, iterate |

---

## Files Modified

| File | Changes |
|------|---------|
| `songwriting_engine_runtime.py` | Added `run_population_search`; `generate_song` supports `use_population_search=True` (default), `population_size`, `elite_count`, `generations` |
| `song_generator.py` | Added `lyric_theme` to candidate dict |
| `runtime_tests.py` | All tests use `use_population_search=False` for speed; added 6 population tests |
| `smoke_test.py` | 10 population-based runs; `use_population_search=True`, population_size=12, generations=4 |

---

## Population Search Integration

1. **Load rules** — unchanged
2. **Generate initial population** — 12 candidates via SongGenerator
3. **Evaluate all** — EvaluationAdapter scores each
4. **Keep elites** — Top 3 by overall score; hard gates (clarity, identity coherence, anti-mush)
5. **Mutate + recombine** — 25% mutation rate; crossover when 2+ elites
6. **Evaluate next generation** — Score new candidates
7. **Repeat** — 4 generations
8. **Repair top** — Targeted repair on best candidate if triggers exist
9. **Return best** — Highest-scoring candidate
10. **Export** — Unchanged

---

## Mutation Operators

| Operator | Action |
|----------|--------|
| `mutate_melody` | Regenerate melody for one random section; new seed |
| `mutate_lyrics` | Regenerate lyrics for one random section; preserve identity |
| `mutate_harmony` | Swap progression for one section from choose_progression_by_section |
| `mutate_structure` | Re-randomise energy_level per section from ENERGY_BY_ROLE |

---

## Crossover Strategy

| Mode | Action |
|------|--------|
| `melody_harmony` | Harmony from B into A; section bar counts must match |
| `section_swap` | Chorus from B into A, verse from B into A; bar counts must match |

---

## Selection Criteria

- **Ranking:** By `evaluation_scores.overall`
- **Hard gates:** clarity_score >= 4; identity_coherence >= 3 when identity present; motifs <= 3
- **Fallback:** If no candidate passes gates, use all candidates for ranking

---

## Test Results

All 35 tests passed:

- Existing 29 tests (with use_population_search=False)
- population creates multiple
- elite selection
- mutation no break
- crossover valid
- anti-mush after population
- export after population

---

## 10 Smoke-Test Scores (Population Search)

| Run | Seed | Best |
|-----|------|------|
| 1 | 4000 | 7.8 |
| 2 | 4111 | 7.9 |
| 3 | 4222 | 7.8 |
| 4 | 4333 | 7.8 |
| 5 | 4444 | 7.8 |
| 6 | 4555 | 7.8 |
| 7 | 4666 | 7.8 |
| 8 | 4777 | 7.8 |
| 9 | 4888 | 7.8 |
| 10 | 4999 | 7.8 |

**Average best:** 7.81  
**Previous baseline:** ~7.7  
**Improvement:** +0.11

---

## Remaining Bottlenecks

1. **Evaluation ceiling:** Many dimensions capped at 6–8; overall rarely exceeds 8.0
2. **Mutation scope:** Single-section mutations; limited exploration
3. **Crossover alignment:** Bar-count matching restricts useful crossovers
4. **Lyric/melody quality:** Underlying generators still the main limit
5. **Population size:** 12 may be too small for strong diversity

---

## Next Steps to Reach >= 8.5

1. **Larger population:** Try population_size=20, elite_count=5
2. **Stronger mutations:** Multi-section mutations; motif-level changes
3. **Evaluation tuning:** Revisit dimension weights and caps
4. **Crossover flexibility:** Partial section merge; motif-level crossover
