"""
Selection Engine — Select top candidates from population.
"""

from typing import List

try:
    from population_composer.population_types import Population, PopulationCandidate
except ImportError:
    import sys
    import os
    _base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if _base not in sys.path:
        sys.path.insert(0, _base)
    from population_composer.population_types import Population, PopulationCandidate


def select_top_candidates(population: Population, top_n: int) -> List[PopulationCandidate]:
    """Return the top_n highest-scoring candidates."""
    sorted_candidates = sorted(
        population.candidates,
        key=lambda c: c.score,
        reverse=True,
    )
    return sorted_candidates[:top_n]
