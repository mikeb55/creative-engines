"""
Wheeler Lyric Interval Language — 4ths, 5ths, 6ths, 9th-like, wide but singable.
"""

from typing import List

try:
    from .composer_ir import IntervalLanguage
except ImportError:
    from composer_ir import IntervalLanguage

PROFILES = {
    "lyrical_wide": ([5, 7, 9, 4], [2, 3], []),
    "suspended_fourths": ([5, 7, 5, 4], [2, 9], []),
    "sixth_ninth_arc": ([9, 8, 7], [4, 5], []),
    "wistful_minor_major": ([4, 5, 7, 3], [2, 9], []),
    "floating_octave_leap": ([12, 7, 5], [4, 9], []),
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def build_interval_language(seed: int, profile: str = "lyrical_wide") -> IntervalLanguage:
    prof = PROFILES.get(profile, PROFILES["lyrical_wide"])
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
        lyric_profile=profile,
    )


def derive_lyric_cells(interval_language: IntervalLanguage) -> List[List[int]]:
    """Derive lyrical interval cells from language."""
    p = interval_language.primary_intervals
    s = interval_language.secondary_intervals
    return [
        p[:3] if len(p) >= 3 else p + [p[0]],
        [p[0], s[0] if s else 2, -p[0]] if p else [5, 2, -5],
        [s[0] if s else 2, p[0], p[0]] if p or s else [5, 7],
        [p[-1], p[0], -p[0]] if len(p) >= 2 else p[:3],
    ]


def score_melodic_lyricism(interval_language: IntervalLanguage) -> float:
    """Score 0-1: lyrical color (4ths, 5ths, 6ths, 9ths)."""
    t = 0.0
    for i in interval_language.primary_intervals + interval_language.secondary_intervals:
        if abs(i) in (4, 5, 7):
            t += 0.3
        elif abs(i) in (8, 9):
            t += 0.25
        elif abs(i) in (2, 3):
            t += 0.1
    return min(1.0, t)
