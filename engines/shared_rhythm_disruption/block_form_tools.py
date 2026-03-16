"""
Shared Rhythm/Disruption — Block contrast for Stravinsky/Zappa engines.
"""

from dataclasses import dataclass
from typing import List


@dataclass
class BlockContrastPlan:
    """Block contrast: section lengths, energy levels."""
    block_lengths: List[int]
    energy_levels: List[str]
    profile: str = "default"


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


PROFILES = {
    "block_contrast": ([4, 3, 5], ["high", "low", "high"]),
    "cut_collage": ([2, 4, 2, 3], ["high", "low", "high", "medium"]),
    "stark_sectional": ([6, 4], ["high", "low"]),
    "collision": ([3, 2, 4], ["high", "low", "high"]),
}


def build_block_contrast_plan(seed: int, profile: str = "block_contrast") -> BlockContrastPlan:
    """Build deterministic block contrast plan."""
    template = PROFILES.get(profile, PROFILES["block_contrast"])
    lengths, energies = template
    h = _hash_int(seed)
    if h % 2 == 0 and len(lengths) > 1:
        lengths = list(lengths)[::-1]
        energies = list(energies)[::-1]
    else:
        lengths = list(lengths)
        energies = list(energies)
    return BlockContrastPlan(block_lengths=lengths, energy_levels=energies, profile=profile)


def score_block_contrast(plan: BlockContrastPlan) -> float:
    """Score 0–1: block contrast strength."""
    t = 0.0
    if len(plan.block_lengths) >= 2:
        t += 0.4
    if len(set(plan.energy_levels)) > 1:
        t += 0.4
    if len(set(plan.block_lengths)) > 1:
        t += 0.2
    return min(1.0, t)
