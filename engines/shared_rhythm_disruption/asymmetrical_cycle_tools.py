"""
Shared Rhythm/Disruption — Asymmetrical cycle tools for Stravinsky/Zappa engines.
"""

from dataclasses import dataclass
from typing import List


@dataclass
class AsymmetricalCycle:
    """Asymmetrical cycle: lengths, break_points."""
    lengths: List[int]
    break_points: List[int]
    profile: str = "default"


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


PROFILES = {
    "ostinato_5_3": ([5, 3], [5]),
    "pulse_7_5": ([7, 5], [7]),
    "disrupt_4_3_2": ([4, 3, 2], [4, 7]),
    "block_6_4": ([6, 4], [6]),
    "collision_3_4_3": ([3, 4, 3], [3, 7]),
}


def build_asymmetrical_cycle(seed: int, profile: str = "ostinato_5_3") -> AsymmetricalCycle:
    """Build deterministic asymmetrical cycle."""
    template = PROFILES.get(profile, PROFILES["ostinato_5_3"])
    lengths, break_points = template
    h = _hash_int(seed)
    lengths = list(lengths)
    break_points = list(break_points)
    if h % 2 == 0 and len(lengths) > 1:
        lengths = lengths[::-1]
        break_points = [sum(lengths[:i]) for i in range(1, len(lengths))]
    return AsymmetricalCycle(lengths=lengths, break_points=break_points, profile=profile)


def score_cycle_irregularity(cycle: AsymmetricalCycle) -> float:
    """Score 0–1: cycle irregularity."""
    t = 0.0
    if len(cycle.lengths) >= 2:
        t += 0.4
    if len(set(cycle.lengths)) > 1:
        t += 0.4
    if cycle.break_points:
        t += 0.2
    return min(1.0, t)
