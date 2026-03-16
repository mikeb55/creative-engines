"""
Zappa Disruption Interval Language — Jagged-cut, chromatic-burst, disruption-cell.
"""

from typing import List

PROFILES = {
    "jagged_cut": [1, 6, 11, -3],
    "chromatic_burst": [1, 2, 11, -1],
    "satirical_leap": [12, -7, 6],
    "disruption_cell": [4, 8, -5, 3],
    "odd_repeat_break": [0, 7, 0, 11],
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def build_interval_language(seed: int, profile: str = "jagged_cut") -> "IntervalLanguage":
    try:
        from .composer_ir import IntervalLanguage
    except ImportError:
        from composer_ir import IntervalLanguage
    prim = list(PROFILES.get(profile, PROFILES["jagged_cut"]))
    h = _hash_int(seed)
    if h % 2 == 0 and len(prim) > 1:
        prim = prim[::-1]
    sec = [4, 8] if "chromatic" in profile else [6, 10]
    return IntervalLanguage(primary_intervals=prim, secondary_intervals=sec, tension_profile=profile)
