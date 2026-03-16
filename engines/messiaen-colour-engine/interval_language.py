"""
Messiaen Colour Interval Language — Birdsong fragments, luminous fourths, mode-coloured seconds.
"""

from typing import List

PROFILES = {
    "birdsong_fragment": [2, 5, 6, 12],
    "luminous_fourths": [5, 7, 5, 12],
    "mode_coloured_seconds": [2, 1, 3, 2],
    "ecstatic_leaps": [12, 7, 5, 9],
    "chromatic_colour_cluster": [1, 2, 1, 6],
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def build_interval_language(seed: int, profile: str = "birdsong_fragment") -> "IntervalLanguage":
    try:
        from .composer_ir import IntervalLanguage
    except ImportError:
        from composer_ir import IntervalLanguage
    prim = list(PROFILES.get(profile, PROFILES["birdsong_fragment"]))
    h = _hash_int(seed)
    if h % 2 == 0 and len(prim) > 1:
        prim = prim[::-1]
    sec = [4, 7, 9] if "fourths" in profile else [2, 5, 6]
    return IntervalLanguage(primary_intervals=prim, secondary_intervals=sec, tension_profile=profile)


def derive_colour_cells(interval_language: "IntervalLanguage") -> List[List[int]]:
    """Derive colour cells from interval language."""
    prim = interval_language.primary_intervals
    cells = []
    for i in range(min(3, len(prim))):
        cell = [prim[(i + j) % len(prim)] for j in range(3)]
        cells.append(cell)
    return cells if cells else [[5, 2, 6]]


def score_interval_colour(interval_language: "IntervalLanguage") -> float:
    """Score 0–1: interval colour strength."""
    t = 0.0
    if 5 in interval_language.primary_intervals or 7 in interval_language.primary_intervals:
        t += 0.3
    if 2 in interval_language.primary_intervals or 1 in interval_language.primary_intervals:
        t += 0.25
    if 12 in interval_language.primary_intervals or 6 in interval_language.primary_intervals:
        t += 0.25
    if len(interval_language.primary_intervals) >= 3:
        t += 0.2
    return min(1.0, t)
