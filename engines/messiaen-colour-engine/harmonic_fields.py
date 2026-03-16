"""
Messiaen Colour Harmonic Fields — Modes of limited transposition, colour-chord, radiant axis.
"""

from dataclasses import dataclass
from typing import List

# Modes of limited transposition: Mode 2 (octatonic), Mode 3 (9-note)
MODE_2_CENTERS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
MODE_3_CENTERS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]

CENTERS = {
    "mode_2_field": ["C", "Eb", "F#"],
    "mode_3_field": ["C", "Eb", "G"],
    "colour_chord_field": ["C", "F#", "Bb"],
    "radiant_axis": ["C", "E", "Ab"],
    "suspended_ecstatic": ["C", "G", "Eb"],
    "static_luminous_center": ["C", "C", "F#"],
}

CHORD_TYPES = {
    "mode_2_field": ["", "sus2", "add9"],
    "mode_3_field": ["", "m", "add9"],
    "colour_chord_field": ["", "sus2", "sus4"],
    "radiant_axis": ["", "add9", ""],
    "suspended_ecstatic": ["sus2", "sus4", ""],
    "static_luminous_center": ["", "", "add9"],
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


@dataclass
class HarmonicField:
    centers: List[str]
    motion_type: str
    chord_types: List[str]
    mode_transpositions: int = 3


def build_harmonic_field(seed: int, profile: str = "mode_2_field") -> HarmonicField:
    c = list(CENTERS.get(profile, CENTERS["mode_2_field"]))
    t = list(CHORD_TYPES.get(profile, CHORD_TYPES["mode_2_field"]))
    h = _hash_int(seed)
    if h % 2 == 0 and len(c) > 1:
        c = c[::-1]
        t = t[::-1]
    trans = 3 if "mode_2" in profile or "mode_3" in profile else 2
    return HarmonicField(centers=c, motion_type=profile, chord_types=t, mode_transpositions=trans)


def derive_section_harmony(hf: HarmonicField, section_role: str) -> List[str]:
    c, t = hf.centers, hf.chord_types
    if section_role == "contrast":
        return [f"{c[1 % len(c)]}{t[1 % len(t)]}", f"{c[0]}{t[0]}", f"{c[-1]}{t[-1]}"] * 2
    if section_role == "return":
        return [f"{c[0]}{t[0]}", f"{c[1 % len(c)]}{t[1 % len(t)]}", f"{c[0]}{t[0]}"] * 2
    return [f"{c[0]}{t[0]}", f"{c[1 % len(c)]}{t[1 % len(t)]}", f"{c[0]}{t[0]}", f"{c[-1]}{t[-1]}"]


def score_harmonic_colour(hf: HarmonicField) -> float:
    """Score 0–1: harmonic colour strength."""
    t = 0.0
    if hf.mode_transpositions >= 2:
        t += 0.3
    if len(hf.centers) >= 2:
        t += 0.3
    if "sus" in str(hf.chord_types) or "add" in str(hf.chord_types):
        t += 0.3
    return min(1.0, t)
