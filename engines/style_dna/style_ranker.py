"""
Style Ranker — Rank by style fit and compute style-adjusted scores.
"""

from typing import Any, List, Tuple

try:
    from style_dna.style_dna_analyzer import _get_profile
    from style_dna.style_similarity import score_composition_against_style
except ImportError:
    import sys
    import os
    _base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if _base not in sys.path:
        sys.path.insert(0, _base)
    from style_dna.style_dna_analyzer import _get_profile
    from style_dna.style_similarity import score_composition_against_style


def rank_compositions_by_style_fit(
    compositions: List[Any],
    engine_name: str,
) -> List[Tuple[Any, float]]:
    """
    Rank compositions by how well they fit the engine's style.
    Returns [(composition, style_fit_score), ...] sorted by style fit descending.
    """
    profile = _get_profile(engine_name)
    scored = [(comp, score_composition_against_style(comp, profile)) for comp in compositions]
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored


def style_adjusted_score(
    compiled_composition: Any,
    engine_name: str,
    base_score: float,
    style_weight: float = 0.3,
) -> float:
    """
    Combine base evaluator score with style fit score.
    adjusted = base_score * (1 - style_weight) + style_fit * 10 * style_weight
    style_fit is 0-1, scaled to 0-10 for blending.
    """
    style_fit = score_composition_against_style(compiled_composition, _get_profile(engine_name))
    style_scaled = style_fit * 10.0
    adjusted = base_score * (1.0 - style_weight) + style_scaled * style_weight
    return max(0.0, min(10.0, adjusted))
