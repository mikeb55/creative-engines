"""
Editorial Selector — Prefer distinctive winners over balanced averages.
Structural metrics guide repair, not final ranking.
"""

from typing import Any, Dict, List

try:
    from .contrast_arc_planner import score_contrast_arc
    from .chorus_arrival_engine import score_chorus_arrival
    from .verse_development_engine import score_verse_development
    from .section_role_contracts import score_section_role_clarity
    from .transition_scoring import score_transition_flow
except ImportError:
    from contrast_arc_planner import score_contrast_arc
    from chorus_arrival_engine import score_chorus_arrival
    from verse_development_engine import score_verse_development
    from section_role_contracts import score_section_role_clarity
    from transition_scoring import score_transition_flow

STRUCTURAL_BROKEN_THRESHOLD = 3.5


def compute_structural_health(song: Dict[str, Any]) -> float:
    """
    Aggregate structural scores. Used to filter broken songs, not to rank.
    """
    scores = song.get("evaluation_scores", {})
    if not scores:
        return 5.0
    parts = [
        scores.get("section_role_clarity", 5),
        scores.get("transition_flow", 5),
        scores.get("contrast_arc_score", 5),
        scores.get("chorus_arrival_score", 5),
        scores.get("verse_development_score", 5),
    ]
    return round(sum(parts) / len(parts), 1)


def compute_identity_strength(song: Dict[str, Any]) -> float:
    """
    Primary ranking signal: hook strength, melodic identity, title, memorability, premise.
    """
    scores = song.get("evaluation_scores", {})
    if not scores:
        return 5.0
    parts = [
        scores.get("hook_strength", 5),
        scores.get("melodic_identity", 5),
        scores.get("title_integration", 5),
        scores.get("memorability", 5),
        scores.get("premise_integrity", 5),
        scores.get("identity_score", 5),
        scores.get("chorus_dominance", 5),
    ]
    return round(sum(parts) / len(parts), 1)


def editorial_rank_candidates(candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    1. Filter out structurally broken songs.
    2. Rank by identity strength first.
    3. Use structural health as tiebreaker.
    """
    if not candidates:
        return []

    healthy = [c for c in candidates if compute_structural_health(c) >= STRUCTURAL_BROKEN_THRESHOLD]
    if not healthy:
        healthy = candidates

    def key_fn(c):
        identity = compute_identity_strength(c)
        structural = compute_structural_health(c)
        overall = c.get("evaluation_scores", {}).get("overall", 0)
        return (identity, structural, overall)

    return sorted(healthy, key=key_fn, reverse=True)
