"""
Scofield Holland Harmonic Fields — Funk-blues, chromatic dominant, bass-axis.
"""

from dataclasses import dataclass
from typing import List


@dataclass
class HarmonicField:
    """Local harmonic field: avoids composer_ir import collision when loaded via importlib."""
    centers: List[str]
    motion_type: str
    chord_types: List[str]
    bass_axis: bool = True

CENTERS_BY_PROFILE = {
    "funk_blues_modern": ["C", "F", "G", "Bb"],
    "chromatic_dominant": ["C", "F#", "G", "Db"],
    "pedal_groove_field": ["C", "F"],
    "minor_blues_shadow": ["Cm", "Fm", "G"],
    "quartal_funk": ["C", "F", "Bb"],
    "bass_axis_motion": ["C", "F", "G", "Eb"],
}

CHORD_TYPES = {
    "funk_blues_modern": ["7", "m7", "7sus", "7"],
    "chromatic_dominant": ["7", "7#11", "7sus"],
    "pedal_groove_field": ["7", "7sus", "5"],
    "minor_blues_shadow": ["m7", "7", "m7"],
    "quartal_funk": ["7sus", "7", "m7"],
    "bass_axis_motion": ["7", "m7", "7", "7sus"],
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def build_harmonic_field(seed: int, profile: str = "funk_blues_modern") -> HarmonicField:
    prof = profile
    centers = list(CENTERS_BY_PROFILE.get(prof, CENTERS_BY_PROFILE["funk_blues_modern"]))
    types = list(CHORD_TYPES.get(prof, CHORD_TYPES["funk_blues_modern"]))
    h = _hash_int(seed)
    if h % 2 == 0 and len(centers) > 1:
        centers = centers[::-1]
    return HarmonicField(
        centers=centers,
        motion_type=prof,
        chord_types=types,
        bass_axis=True,
    )


def derive_section_harmony(harmonic_field: HarmonicField, section_role: str) -> List[str]:
    """Derive groove-supportive harmony: bass-aware, chromatic without drift."""
    c = harmonic_field.centers
    t = harmonic_field.chord_types
    if section_role == "contrast":
        idx = 1 % len(c)
        return [f"{c[idx]}{t[idx % len(t)]}", f"{c[0]}{t[0]}", f"{c[-1]}{t[-1]}"] * 2
    if section_role == "return":
        return [f"{c[0]}{t[0]}", f"{c[1 % len(c)]}{t[1 % len(t)]}", f"{c[0]}{t[0]}"] * 2
    return [
        f"{c[0]}{t[0]}",
        f"{c[1 % len(c)]}{t[1 % len(t)]}",
        f"{c[0]}{t[0]}",
        f"{c[-1]}{t[-1]}",
    ]


def score_harmonic_groove(harmonic_field: HarmonicField) -> float:
    """Score 0-1: groove-supportive harmony."""
    t = 0.0
    if harmonic_field.bass_axis:
        t += 0.3
    if "7" in str(harmonic_field.chord_types) or "7sus" in str(harmonic_field.chord_types):
        t += 0.35
    if len(harmonic_field.centers) >= 3:
        t += 0.2
    return min(1.0, t)
