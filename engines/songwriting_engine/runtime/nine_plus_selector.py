"""
Nine-Plus Selector — Identify songs with true breakout potential (9+).
"""

from typing import Any, Dict, List

try:
    from .editorial_selector import compute_identity_strength, compute_structural_health
    from .standout_factor import score_standout_factor, score_quotable_hook, score_afterglow
    from .identity_scoring import genericness_penalty
except ImportError:
    from editorial_selector import compute_identity_strength, compute_structural_health
    from standout_factor import score_standout_factor, score_quotable_hook, score_afterglow
    from identity_scoring import genericness_penalty

IDENTITY_STRENGTH_MIN = 7.5
STRUCTURAL_HEALTH_MIN = 5.5
STANDOUT_FACTOR_MIN = 6.5
QUOTABLE_HOOK_MIN = 6.0
AFTERGLOW_MIN = 5.5
REPLACEABILITY_MAX = 0.5


def is_nine_plus_candidate(song: Dict[str, Any], population: List[Dict[str, Any]] = None) -> bool:
    """
    A 9+ candidate shows: strong identity, adequate structure, strong chorus/title,
    strong standout_factor, clear afterglow, low replaceability.
    """
    identity = compute_identity_strength(song)
    structural = compute_structural_health(song)
    standout = score_standout_factor(song)
    quotable = score_quotable_hook(song)
    afterglow = score_afterglow(song)

    if identity < IDENTITY_STRENGTH_MIN:
        return False
    if structural < STRUCTURAL_HEALTH_MIN:
        return False
    if standout < STANDOUT_FACTOR_MIN:
        return False
    if quotable < QUOTABLE_HOOK_MIN:
        return False
    if afterglow < AFTERGLOW_MIN:
        return False

    if population is not None:
        penalty = genericness_penalty(song, population)
        if penalty > REPLACEABILITY_MAX:
            return False

    return True


def rank_nine_plus_candidates(candidates: List[Dict[str, Any]], population: List[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """
    Rank by 9+ potential. Prefer distinctive over merely balanced.
    """
    if not candidates:
        return []

    def key_fn(c):
        identity = compute_identity_strength(c)
        standout = score_standout_factor(c)
        quotable = score_quotable_hook(c)
        afterglow = score_afterglow(c)
        structural = compute_structural_health(c)
        penalty = genericness_penalty(c, population or candidates)
        replaceability = 10 - penalty * 5
        return (identity, standout, quotable, afterglow, structural, replaceability)

    return sorted(candidates, key=key_fn, reverse=True)
