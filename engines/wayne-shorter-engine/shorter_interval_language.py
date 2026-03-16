"""
Shorter Interval Language — Deterministic interval fingerprints.
2nds, 4ths, 5ths, tritone; avoid bland scalar.
"""

import os
import importlib.util
from typing import List, Tuple

# Load composer_ir from same directory to avoid cross-engine import collision
_ws_dir = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("ws_composer_ir", os.path.join(_ws_dir, "composer_ir.py"))
_ws_ir = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_ws_ir)
IntervalLanguage = _ws_ir.IntervalLanguage

PROFILES = {
    "balanced": ([2, 5, 7], [6, 1], []),
    "angular": ([6, 2, 10], [1, 11], [3, 4]),
    "lyrical_ambiguous": ([5, 7, 2], [6, 1], []),
    "quartal_colored": ([5, 7, 12], [2, 6], [3]),
    "minor_second_shadowed": ([1, 2, 5], [6, 11], [4]),
}


def _hash_int(seed: int, extra: int = 0) -> int:
    h = (seed * 31 + extra) & 0xFFFFFFFF
    return h


def build_interval_language(seed: int, profile: str = "balanced") -> IntervalLanguage:
    """Build interval language from seed and profile. Deterministic."""
    prof = PROFILES.get(profile, PROFILES["balanced"])
    primary, secondary, avoid = prof
    h = _hash_int(seed)
    primary = list(primary)
    secondary = list(secondary)
    if h % 3 == 0:
        primary = primary[::-1]
    if (h >> 4) % 2 == 0:
        secondary = [x for x in secondary if x != 6][:2] + ([6] if 6 in secondary else [])
    return IntervalLanguage(
        primary_intervals=primary,
        secondary_intervals=secondary[:3],
        avoid_intervals=avoid,
        tension_profile=profile,
    )


def score_interval_tension(interval_language: IntervalLanguage) -> float:
    """Score 0-1: higher = more tension/angularity."""
    t = 0.0
    for i in interval_language.primary_intervals + interval_language.secondary_intervals:
        if abs(i) == 6:
            t += 0.3
        elif abs(i) in (1, 11):
            t += 0.2
        elif abs(i) in (5, 7):
            t += 0.1
    return min(1.0, t)


def derive_melodic_cell_shapes(interval_language: IntervalLanguage) -> List[List[int]]:
    """Derive cell shapes from interval language."""
    p = interval_language.primary_intervals
    s = interval_language.secondary_intervals
    shapes = [
        p[:3] if len(p) >= 3 else p + [p[0]],
        [p[0], s[0] if s else p[-1], p[1]] if p else [2, 5, 7],
        [-x for x in (p[:2] if len(p) >= 2 else p)],
    ]
    return shapes
