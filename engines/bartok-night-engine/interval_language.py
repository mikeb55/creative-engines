"""
Bartók Night Interval Language — m2, tritone, P4/P5, isolated leaps.
"""

from typing import List

try:
    from .composer_ir import IntervalLanguage
except ImportError:
    from composer_ir import IntervalLanguage

PROFILES = {
    "minor_second_cluster": ([1, -1, 2], [6, 11], []),
    "tritone_axis": ([6, 11, 1], [5, 7], []),
    "fourth_fifth_space": ([5, 7, 4], [6, 1], []),
    "insect_motif": ([1, 2, -1], [6, 11], []),
    "modal_fragment": ([2, 5, 7], [1, 6], []),
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def build_interval_language(seed: int, profile: str = "minor_second_cluster") -> IntervalLanguage:
    prof = PROFILES.get(profile, PROFILES["minor_second_cluster"])
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


def derive_fragment_cells(interval_language: IntervalLanguage) -> List[List[int]]:
    """Derive fragment-like interval cells from language."""
    p = interval_language.primary_intervals
    s = interval_language.secondary_intervals
    return [
        p[:2] if len(p) >= 2 else p + [p[0]],
        [p[0], -p[0]] if p else [1, -1],
        [s[0] if s else p[0], p[0]] if p or s else [6, 1],
        [p[-1], p[0]] if len(p) >= 2 else p[:2],
    ]


def score_interval_color(interval_language: IntervalLanguage) -> float:
    """Score 0-1: night-music color (m2, tritone, P4/P5)."""
    t = 0.0
    for i in interval_language.primary_intervals + interval_language.secondary_intervals:
        if abs(i) in (1, 6, 11):
            t += 0.25
        elif abs(i) in (4, 5, 7):
            t += 0.15
    return min(1.0, t)
