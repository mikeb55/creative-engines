"""
Stravinsky Pulse Harmonic Fields — Block-modal, dry-axis, ostinato-center.
"""

from dataclasses import dataclass
from typing import List

CENTERS = {
    "block_modal": ["C", "G", "F"],
    "dry_axis": ["C", "Eb", "G"],
    "ostinato_center": ["C", "C", "G"],
    "stark_quartal": ["C", "F", "Bb"],
    "pulse_pedal": ["C", "G"],
}

CHORD_TYPES = {
    "block_modal": ["", "m", "sus2"],
    "dry_axis": ["", "m", ""],
    "ostinato_center": ["", "", "m"],
    "stark_quartal": ["sus2", "sus4", ""],
    "pulse_pedal": ["", ""],
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


@dataclass
class HarmonicField:
    centers: List[str]
    motion_type: str
    chord_types: List[str]


def build_harmonic_field(seed: int, profile: str = "block_modal") -> HarmonicField:
    """Build deterministic harmonic field."""
    c = list(CENTERS.get(profile, CENTERS["block_modal"]))
    t = list(CHORD_TYPES.get(profile, CHORD_TYPES["block_modal"]))
    h = _hash_int(seed)
    if h % 2 == 0 and len(c) > 1:
        c = c[::-1]
        t = t[::-1]
    return HarmonicField(centers=c, motion_type=profile, chord_types=t)


def derive_section_harmony(hf: HarmonicField, section_role: str) -> List[str]:
    """Derive harmony per section."""
    c, t = hf.centers, hf.chord_types
    if section_role == "contrast":
        return [f"{c[1 % len(c)]}{t[1 % len(t)]}", f"{c[0]}{t[0]}"] * 3
    if section_role == "return":
        return [f"{c[0]}{t[0]}", f"{c[1 % len(c)]}{t[1 % len(t)]}", f"{c[0]}{t[0]}"] * 2
    return [f"{c[0]}{t[0]}", f"{c[1 % len(c)]}{t[1 % len(t)]}", f"{c[0]}{t[0]}", f"{c[-1]}{t[-1]}"]
