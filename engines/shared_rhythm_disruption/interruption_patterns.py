"""
Shared Rhythm/Disruption — Interruption patterns for Stravinsky/Zappa engines.
"""

from dataclasses import dataclass
from typing import List


@dataclass
class InterruptionPattern:
    """Interruption: positions, types, profile."""
    positions: List[int]
    types: List[str]
    profile: str = "default"


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


PROFILES = {
    "abrupt_cut": ([2, 5], ["cut", "cut"]),
    "false_return": ([3, 6], ["cut", "reentry"]),
    "collision": ([1, 4, 7], ["cut", "cut", "reentry"]),
    "zappa_disrupt": ([2, 4, 6], ["cut", "reentry", "cut"]),
    "stravinsky_block": ([4], ["cut"]),
}


def build_interruption_pattern(seed: int, profile: str = "abrupt_cut") -> InterruptionPattern:
    """Build deterministic interruption pattern."""
    template = PROFILES.get(profile, PROFILES["abrupt_cut"])
    positions, types = template
    h = _hash_int(seed)
    positions = list(positions)
    types = list(types)
    if h % 3 == 1 and len(positions) > 1:
        positions = [p + 1 for p in positions]
    return InterruptionPattern(positions=positions, types=types, profile=profile)


def score_disruption_energy(pattern: InterruptionPattern) -> float:
    """Score 0–1: disruption energy."""
    t = 0.0
    if len(pattern.positions) >= 1:
        t += 0.3
    if len(pattern.positions) >= 2:
        t += 0.3
    if "cut" in pattern.types:
        t += 0.2
    if "reentry" in pattern.types:
        t += 0.2
    return min(1.0, t)
