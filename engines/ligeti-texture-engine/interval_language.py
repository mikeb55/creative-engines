"""
Ligeti Texture Interval Language — Cluster semitone, micropoly step, swarm fourth.
"""

from typing import List

try:
    from .composer_ir import IntervalLanguage
except ImportError:
    from composer_ir import IntervalLanguage

PROFILES = {
    "cluster_semitone": ([1, 2, -1], [3, 4], []),
    "micropoly_step": ([1, 2, 3], [4, 5], []),
    "swarm_fourth": ([5, 4, 6], [1, 2], []),
    "chromatic_cloud": ([1, 2, 3, 4], [5, 6], []),
    "registral_shimmer": ([1, 2, 5, 7], [3, 4], []),
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def build_interval_language(seed: int, profile: str = "cluster_semitone") -> IntervalLanguage:
    prof = PROFILES.get(profile, PROFILES["cluster_semitone"])
    primary, secondary, avoid = prof
    h = _hash_int(seed)
    primary = list(primary)
    secondary = list(secondary)
    if h % 2 == 0:
        primary = primary[::-1]
    return IntervalLanguage(
        primary_intervals=primary,
        secondary_intervals=secondary[:3],
        avoid_intervals=avoid,
        tension_profile=profile,
    )


def derive_texture_cells(interval_language: IntervalLanguage) -> List[List[int]]:
    """Derive texture interval cells from language."""
    p = interval_language.primary_intervals
    s = interval_language.secondary_intervals
    return [
        p[:3] if len(p) >= 3 else p + [p[0]],
        [p[0], -p[0]] if p else [1, -1],
        [s[0] if s else p[0], p[0]] if p or s else [2, 1],
        [p[-1], p[0], -p[0]] if len(p) >= 2 else p[:3],
    ]


def score_textural_identity(interval_language: IntervalLanguage) -> float:
    """Score 0-1: textural identity strength."""
    t = 0.0
    for i in interval_language.primary_intervals + interval_language.secondary_intervals:
        if abs(i) in (1, 2):
            t += 0.25
        elif abs(i) in (3, 4):
            t += 0.15
        elif abs(i) in (5, 7):
            t += 0.1
    return min(1.0, t)
