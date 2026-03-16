"""
Population Runtime — Run evolutionary population search.
"""

import random
from typing import Any, List

try:
    from composition_evaluator.composition_evaluator import evaluate_composition
    from population_composer.population_types import Population, PopulationCandidate
    from population_composer.population_generator import generate_population
    from population_composer.selection_engine import select_top_candidates
    from population_composer.mutation_operators import (
        mutate_intervals,
        mutate_harmony,
        mutate_motif,
        mutate_phrase_lengths,
        mutate_form,
    )
    from population_composer.crossover_engine import crossover_melody, crossover_harmony, crossover_motif
except ImportError:
    import sys
    import os
    _base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if _base not in sys.path:
        sys.path.insert(0, _base)
    from composition_evaluator.composition_evaluator import evaluate_composition
    from population_composer.population_types import Population, PopulationCandidate
    from population_composer.population_generator import generate_population
    from population_composer.selection_engine import select_top_candidates
    from population_composer.mutation_operators import (
        mutate_intervals,
        mutate_harmony,
        mutate_motif,
        mutate_phrase_lengths,
        mutate_form,
    )
    from population_composer.crossover_engine import crossover_melody, crossover_harmony, crossover_motif


def run_population_search(
    engine_name: str,
    population_size: int,
    generations: int,
    seed: int = 0,
    elite_ratio: float = 0.3,
    mutation_prob: float = 0.5,
    crossover_prob: float = 0.5,
) -> List[PopulationCandidate]:
    """
    Run evolutionary population search.
    Pipeline: generate → score → select → mutate/crossover → repeat.
    Returns best candidates from final generation (sorted by score desc).
    """
    rng = random.Random(seed)
    pop = generate_population(engine_name, population_size, seed)
    elite_n = max(1, int(population_size * elite_ratio))
    mutators = [mutate_intervals, mutate_harmony, mutate_motif, mutate_phrase_lengths, mutate_form]
    crossovers = [crossover_melody, crossover_harmony, crossover_motif]

    for gen in range(1, generations):
        top = select_top_candidates(pop, elite_n)
        new_candidates: List[PopulationCandidate] = []

        for c in top:
            new_candidates.append(c)

        while len(new_candidates) < population_size:
            parent = rng.choice(top)
            if rng.random() < crossover_prob and len(top) >= 2:
                pa, pb = rng.sample(top, 2)
                op = rng.choice(crossovers)
                child_comp = op(pa.composition, pb.composition, seed=rng.randint(0, 2**31 - 1))
                engine_src = pa.engine_source
            else:
                child_comp = parent.composition
                if rng.random() < mutation_prob:
                    op = rng.choice(mutators)
                    child_comp = op(child_comp, strength=0.3, seed=rng.randint(0, 2**31 - 1))
                engine_src = parent.engine_source

            score_obj = evaluate_composition(child_comp)
            new_candidates.append(PopulationCandidate(
                composition=child_comp,
                score=score_obj.total_score,
                engine_source=engine_src,
            ))

        pop = Population(candidates=new_candidates[:population_size], generation_number=gen)

    return select_top_candidates(pop, min(population_size, len(pop.candidates)))
