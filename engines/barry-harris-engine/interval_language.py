"""
BH Interval Language — Step motion, chromatic enclosure.
Emphasize bebop scale logic, chord-tone gravity.
"""

from typing import List

try:
    from .composer_ir import IntervalLanguage
except ImportError:
    from composer_ir import IntervalLanguage

PROFILES = {
    "bebop_step": ([1, 2, -1, -2], [3, 4, 7], []),  # step, enclosure
    "enclosure_heavy": ([1, -1, 2, -2], [3, 7], [6]),  # chromatic enclosure
    "scalar_embellish": ([2, 1, -1, -2], [4, 7], [6]),  # scale with passing
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def build_interval_language(seed: int, profile: str = "bebop_step") -> IntervalLanguage:
    """Build BH interval language. Deterministic."""
    prof = PROFILES.get(profile, PROFILES["bebop_step"])
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
    """Lower = more step-based, chord-tone gravity."""
    t = 0.0
    for i in interval_language.primary_intervals + interval_language.secondary_intervals:
        if abs(i) <= 2:
            t -= 0.1
        elif abs(i) >= 6:
            t += 0.2
    return max(0.0, min(1.0, 0.5 + t))


def derive_melodic_cell_shapes(interval_language: IntervalLanguage) -> List[List[int]]:
    """Enclosure figures, bebop cells."""
    p = interval_language.primary_intervals
    s = interval_language.secondary_intervals
    shapes = [
        p[:4] if len(p) >= 4 else p + [p[0]] * (4 - len(p)),
        [p[0], -p[0], p[1]] if len(p) >= 2 else [1, -1, 2],  # enclosure
        [s[0] if s else 3, p[0] if p else 1, -p[0] if p else -1],
    ]
    return shapes
