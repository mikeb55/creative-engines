"""
Monk Interval Language — Leaps, repeated pitch cells, minor seconds and tritones.
"""

from typing import List

try:
    from .composer_ir import IntervalLanguage
except ImportError:
    from composer_ir import IntervalLanguage

PROFILES = {
    "angular": ([6, 1, 5], [7, 11], []),  # tritone, m2, 4th
    "repeated_cell": ([0, 6, 0], [1, 5], []),  # repeat, tritone, repeat
    "leap_m2": ([7, 1, 5], [6, 11], []),  # 5th, m2, 4th
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def build_interval_language(seed: int, profile: str = "angular") -> IntervalLanguage:
    prof = PROFILES.get(profile, PROFILES["angular"])
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


def score_interval_tension(interval_language: IntervalLanguage) -> float:
    t = 0.0
    for i in interval_language.primary_intervals + interval_language.secondary_intervals:
        if abs(i) in (6, 1, 11):
            t += 0.25
        elif abs(i) >= 5:
            t += 0.15
    return min(1.0, t)


def derive_melodic_cell_shapes(interval_language: IntervalLanguage) -> List[List[int]]:
    p = interval_language.primary_intervals
    s = interval_language.secondary_intervals
    shapes = [
        p[:3] if len(p) >= 3 else p + [p[0]],
        [p[0], 0, p[0]] if p else [6, 0, 6],  # repeated cell
        [p[0], s[0] if s else p[-1], -p[0]],
    ]
    return shapes
