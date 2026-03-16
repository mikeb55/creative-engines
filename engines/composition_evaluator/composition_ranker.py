"""
Composition Ranker — Rank compositions by score for population search.
"""

from typing import Any, List, Optional, Tuple

try:
    from .composition_evaluator import evaluate_composition
    from .composition_score_types import CompositionScore
except ImportError:
    from composition_evaluator import evaluate_composition
    from composition_score_types import CompositionScore


def rank_compositions(
    list_of_compositions: List[Any],
    engine_name: Optional[str] = None,
) -> List[Tuple[Any, CompositionScore]]:
    """Rank compositions by total_score descending. Returns [(composition, score), ...].
    If engine_name is provided, uses style-adjusted scoring."""
    scored = [(comp, evaluate_composition(comp, engine_name=engine_name)) for comp in list_of_compositions]
    scored.sort(key=lambda x: x[1].total_score, reverse=True)
    return scored
