"""
Shorter Form Interval Language — shorter_leap, angular_modal, tritone_axis.
"""

from typing import List

try:
    from .composer_ir import IntervalLanguage
except ImportError:
    from composer_ir import IntervalLanguage

PROFILES = {
    "shorter_leap": ([5, 7, 3], [6, 1], []),
    "angular_modal": ([3, 7, 5], [6, 2], []),
    "minor_third_axis": ([3, 6, 9], [1, 5], []),
    "tritone_axis": ([6, 5, 7], [1, 3], []),
    "expanding_interval": ([3, 5, 7, 9], [1, 6], []),
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def build_interval_language(seed: int, profile: str = "shorter_leap") -> IntervalLanguage:
    prof = PROFILES.get(profile, PROFILES["shorter_leap"])
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


def derive_shorter_cells(interval_language: IntervalLanguage) -> List[List[int]]:
    """Derive Shorter-style interval cells."""
    p = interval_language.primary_intervals
    s = interval_language.secondary_intervals
    return [
        p[:3] if len(p) >= 3 else p + [p[0]],
        [p[0], -p[0]] if p else [5, -5],
        [s[0] if s else p[0], p[0]] if p or s else [3, 5],
        [p[-1], p[0], -p[0]] if len(p) >= 2 else p[:3],
    ]


def score_interval_character(interval_language: IntervalLanguage) -> float:
    """Score 0-1: interval character strength."""
    t = 0.0
    for i in interval_language.primary_intervals + interval_language.secondary_intervals:
        if abs(i) in (3, 6, 9):
            t += 0.2
        elif abs(i) in (5, 7):
            t += 0.15
        elif abs(i) in (1, 2):
            t += 0.1
    return min(1.0, t)
