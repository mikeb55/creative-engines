"""
Big Band Interval Language — Brass punch, sax counterline, shout leap, sectional unison.
"""

from typing import List

try:
    from .composer_ir import IntervalLanguage
except ImportError:
    from composer_ir import IntervalLanguage

PROFILES = {
    "brass_punch": ([5, 7, 12, 4], [2, 9], []),
    "sax_counterline": ([4, 7, 9, 2], [5, 11], []),
    "shout_leap": ([12, 7, 5, 9], [4, 8], []),
    "sectional_unison": ([0, 5, 7], [4, 5], []),
    "layered_ensemble_motion": ([5, 7, 4, 9], [2, 3], []),
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def build_interval_language(seed: int, profile: str = "brass_punch") -> IntervalLanguage:
    prof = PROFILES.get(profile, PROFILES["brass_punch"])
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


def derive_sectional_cells(interval_language: IntervalLanguage) -> List[List[int]]:
    """Derive sectional interval cells from language."""
    p = interval_language.primary_intervals
    s = interval_language.secondary_intervals
    return [
        p[:3] if len(p) >= 3 else p + [p[0]],
        [p[0], -p[0]] if p else [5, -5],
        [s[0] if s else p[0], p[0]] if p or s else [6, 5],
        [p[-1], p[0], -p[0]] if len(p) >= 2 else p[:3],
    ]


def score_sectional_identity(interval_language: IntervalLanguage) -> float:
    """Score 0-1: sectional identity strength."""
    t = 0.0
    for i in interval_language.primary_intervals + interval_language.secondary_intervals:
        if abs(i) in (1, 6, 11):
            t += 0.2
        elif abs(i) in (4, 5, 7):
            t += 0.15
        elif abs(i) == 12:
            t += 0.25
    return min(1.0, t)
