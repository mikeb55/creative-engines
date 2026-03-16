"""
Scofield Holland Interval Language — Chromatic riff, blues-modern, groove cell.
"""

from typing import List

try:
    from .composer_ir import IntervalLanguage
except ImportError:
    from composer_ir import IntervalLanguage

PROFILES = {
    "chromatic_riff": ([1, 4, 6, -1, 2], [5, 7, 0], []),
    "blues_modern": ([1, 4, 6, -1, 5], [7, 2, 0], []),
    "groove_cell": ([0, 1, 4, -1], [5, 6, 7], []),
    "angular_funk": ([6, 1, -1, 4], [2, 5, 7], []),
    "short_burst_repeat": ([0, 1, 0, 4], [6, -1, 5], []),
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def build_interval_language(seed: int, profile: str = "chromatic_riff") -> IntervalLanguage:
    prof = PROFILES.get(profile, PROFILES["chromatic_riff"])
    primary, secondary, avoid = prof
    h = _hash_int(seed)
    primary = list(primary)
    secondary = list(secondary)
    if h % 2 == 0:
        primary = primary[::-1]
    return IntervalLanguage(
        primary_intervals=primary,
        secondary_intervals=secondary[:4],
        avoid_intervals=avoid,
        tension_profile=profile,
    )


def derive_riff_cells(interval_language: IntervalLanguage) -> List[List[int]]:
    """Derive riff cells from language: semitone approach, fourths, repeated-note."""
    p = interval_language.primary_intervals
    s = interval_language.secondary_intervals
    return [
        p[:3] if len(p) >= 3 else p + [p[0]],
        [0, p[0], -p[0]] if p else [0, 1, -1],
        [p[0], s[0] if s else 5, -p[0]] if p else [1, 5, -1],
        [p[-1], p[0]] if len(p) >= 2 else p[:2],
        [0, 0, p[0]] if p else [0, 0, 1],
    ]


def score_groove_identity(interval_language: IntervalLanguage) -> float:
    """Score 0-1: groove identity (chromatic, fourths, repeated notes)."""
    t = 0.0
    for i in interval_language.primary_intervals + interval_language.secondary_intervals:
        if abs(i) in (0, 1):
            t += 0.3
        elif abs(i) in (4, 6):
            t += 0.25
        elif abs(i) in (5, 7):
            t += 0.15
    return min(1.0, t)
