"""
Stravinsky Pulse Interval Language — Pulse-fifth, sharp-second, block-fourth.
"""

from dataclasses import dataclass
from typing import List

PROFILES = {
    "pulse_fifth": [7, 5, 4],
    "sharp_second": [2, 1, 3],
    "block_fourth": [5, 7, 5],
    "dry_leap_cell": [7, 12, 5],
    "repeated_accent_pitch": [0, 7, 0],
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def build_interval_language(seed: int, profile: str = "pulse_fifth") -> "IntervalLanguage":
    """Build deterministic interval language."""
    try:
        from .composer_ir import IntervalLanguage
    except ImportError:
        from composer_ir import IntervalLanguage
    prim = list(PROFILES.get(profile, PROFILES["pulse_fifth"]))
    h = _hash_int(seed)
    if h % 2 == 0 and len(prim) > 1:
        prim = prim[::-1]
    sec = [4, 9] if "fifth" in profile else [2, 7]
    return IntervalLanguage(primary_intervals=prim, secondary_intervals=sec, tension_profile=profile)
