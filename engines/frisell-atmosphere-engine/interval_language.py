"""
Frisell Atmosphere Interval Language — Open fifths, pedal melody, ambient fourths.
"""

from typing import List

try:
    from .composer_ir import IntervalLanguage
except ImportError:
    from composer_ir import IntervalLanguage

PROFILES = {
    "open_fifths": ([5, 7, 12], [4, 2], []),
    "pedal_melody": ([5, 4, 2], [7, 12], []),
    "wistful_leaps": ([7, 5, 9], [4, 2], []),
    "folk_shadow": ([5, 4, 7], [2, 12], []),
    "ambient_fourths": ([5, 7, 5], [4, 12], []),
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def build_interval_language(seed: int, profile: str = "open_fifths") -> IntervalLanguage:
    prof = PROFILES.get(profile, PROFILES["open_fifths"])
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


def derive_atmosphere_cells(interval_language: IntervalLanguage) -> List[List[int]]:
    """Derive sparse lyric-like cells from language."""
    p = interval_language.primary_intervals
    s = interval_language.secondary_intervals
    return [
        p[:2] if len(p) >= 2 else p + [p[0]],
        [p[0], s[0] if s else 2, -p[0]] if p else [5, 2, -5],
        [s[0] if s else 2, p[0]] if p or s else [5, 7],
        [p[-1], p[0]] if len(p) >= 2 else p[:2],
    ]


def score_atmosphere_openness(interval_language: IntervalLanguage) -> float:
    """Score 0-1: openness (fifths, fourths, octaves)."""
    t = 0.0
    for i in interval_language.primary_intervals + interval_language.secondary_intervals:
        if abs(i) in (5, 7, 12):
            t += 0.35
        elif abs(i) in (2, 4):
            t += 0.15
    return min(1.0, t)
