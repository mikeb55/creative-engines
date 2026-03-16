"""
Shared Rhythm/Disruption — Pulse cells for Stravinsky/Zappa engines.
"""

from dataclasses import dataclass
from typing import List


@dataclass
class PulseCell:
    """Pulse cell: beats, accents, profile."""
    beats: List[int]
    accents: List[int]
    profile: str = "default"


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


PROFILES = {
    "stravinsky_pulse": [2, 3, 2, 3],
    "zappa_disrupt": [3, 2, 4, 2],
    "block_contrast": [4, 4, 3],
    "asymmetrical": [5, 3, 4],
    "ostinato": [2, 2, 3, 2],
}


def build_pulse_cell(seed: int, profile: str = "stravinsky_pulse") -> PulseCell:
    """Build deterministic pulse cell from seed and profile."""
    beats_template = PROFILES.get(profile, PROFILES["stravinsky_pulse"])
    h = _hash_int(seed)
    beats = list(beats_template)
    if h % 2 == 0 and len(beats) > 1:
        beats = beats[::-1]
    accents = [i for i in range(len(beats)) if (h >> (i % 4)) % 2 == 1][:3]
    if not accents:
        accents = [0]
    return PulseCell(beats=beats, accents=accents, profile=profile)


def score_pulse_identity(cell: PulseCell) -> float:
    """Score 0–1: pulse identity strength."""
    t = 0.0
    if len(cell.beats) >= 2:
        t += 0.3
    if len(set(cell.beats)) > 1:
        t += 0.3
    if cell.accents:
        t += 0.2
    return min(1.0, t)
