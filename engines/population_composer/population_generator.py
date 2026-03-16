"""
Population Generator — Generate initial population from composer engine.
"""

from typing import Any

try:
    from shared_composer.engine_registry import get_engine
    from composition_evaluator.composition_evaluator import evaluate_composition
    from population_composer.population_types import Population, PopulationCandidate
except ImportError:
    import sys
    import os
    _base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if _base not in sys.path:
        sys.path.insert(0, _base)
    from shared_composer.engine_registry import get_engine
    from composition_evaluator.composition_evaluator import evaluate_composition
    from population_composer.population_types import Population, PopulationCandidate


def generate_population(
    engine_name: str,
    population_size: int,
    seed: int = 0,
    title: str = "Population",
) -> Population:
    """
    Generate a population of compositions from the given engine.
    Each composition uses a different seed (seed, seed+1, ...).
    Returns Population with scored candidates.
    """
    engine = get_engine(engine_name)
    candidates = []
    for i in range(population_size):
        s = seed + i
        ir = engine.generate_ir(title, mode="title", seed=s)
        compiled = engine.compile_from_ir(ir)
        score_obj = evaluate_composition(compiled)
        candidates.append(PopulationCandidate(
            composition=compiled,
            score=score_obj.total_score,
            engine_source=engine_name,
        ))
    return Population(candidates=candidates, generation_number=0)
