"""
Zappa Disruption Harmonic Fields — Collision-field, altered-shift, abrupt-modal-cut.
"""

from dataclasses import dataclass
from typing import List

CENTERS = {
    "collision_field": ["C", "F#", "Eb"],
    "altered_shift": ["C", "Db", "G"],
    "abrupt_modal_cut": ["C", "F", "F#"],
    "chromatic_break": ["C", "D", "Eb"],
    "unstable_axis": ["C", "F#", "Bb"],
}

CHORD_TYPES = {
    "collision_field": ["7", "m7", "7#11"],
    "altered_shift": ["7", "7alt", "m7"],
    "abrupt_modal_cut": ["7", "7sus", "7"],
    "chromatic_break": ["7", "m7", "dim7"],
    "unstable_axis": ["7", "7#11", "7"],
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


@dataclass
class HarmonicField:
    centers: List[str]
    motion_type: str
    chord_types: List[str]


def build_harmonic_field(seed: int, profile: str = "collision_field") -> HarmonicField:
    c = list(CENTERS.get(profile, CENTERS["collision_field"]))
    t = list(CHORD_TYPES.get(profile, CHORD_TYPES["collision_field"]))
    h = _hash_int(seed)
    if h % 2 == 0 and len(c) > 1:
        c = c[::-1]
        t = t[::-1]
    return HarmonicField(centers=c, motion_type=profile, chord_types=t)


def derive_section_harmony(hf: HarmonicField, section_role: str) -> List[str]:
    c, t = hf.centers, hf.chord_types
    if section_role == "cut":
        return [f"{c[1 % len(c)]}{t[1 % len(t)]}", f"{c[0]}{t[0]}"] * 2
    if section_role == "return":
        return [f"{c[0]}{t[0]}", f"{c[-1]}{t[-1]}", f"{c[0]}{t[0]}"] * 2
    return [f"{c[0]}{t[0]}", f"{c[1 % len(c)]}{t[1 % len(t)]}", f"{c[-1]}{t[-1]}", f"{c[0]}{t[0]}"]
