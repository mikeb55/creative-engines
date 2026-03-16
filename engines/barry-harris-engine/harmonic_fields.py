"""
BH Harmonic Fields — 6th diminished, diminished passing, tonic/dominant conversion.
"""

from typing import List

try:
    from .composer_ir import HarmonicField
except ImportError:
    from composer_ir import HarmonicField

CENTERS_BY_PROFILE = {
    "major6_dim": ["C", "G", "F"],
    "minor6_dim": ["Am", "Dm", "Em"],
    "dominant_dim": ["C7", "G7", "F7"],
    "minor_conversion": ["Cm", "Gm", "Bb"],
}

CHORD_TYPES = {
    "major6_dim": ["6", "dim7", "m6", "M7"],
    "minor6_dim": ["m6", "dim7", "6"],
    "dominant_dim": ["7", "dim7", "7b9"],
    "minor_conversion": ["m6", "m7", "dim7"],
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def build_harmonic_field(seed: int, profile: str = "major6_dim") -> HarmonicField:
    """Build BH harmonic field. Deterministic."""
    prof = profile
    centers = list(CENTERS_BY_PROFILE.get(prof, CENTERS_BY_PROFILE["major6_dim"]))
    types = list(CHORD_TYPES.get(prof, CHORD_TYPES["major6_dim"]))
    h = _hash_int(seed)
    if h % 2 == 0 and len(centers) > 1:
        centers = centers[::-1]
    return HarmonicField(
        centers=centers,
        motion_type=prof,
        chord_types=types,
        avoid_resolution=False,
    )


def derive_section_harmony(harmonic_field: HarmonicField, section_role: str) -> List[str]:
    """Voice-leading based: continuous motion, diminished passing."""
    c = harmonic_field.centers
    t = harmonic_field.chord_types
    if section_role == "contrast":
        idx = 1 % len(c)
        return [f"{c[idx]}{t[idx % len(t)]}", f"{c[(idx+1) % len(c)]}dim7"] * 4
    base = c[0]
    ct = t[0]
    return [
        f"{base}{ct}",
        f"{c[1 % len(c)]}dim7",
        f"{base}{ct}",
        f"{c[-1]}{t[-1]}",
    ]


def score_harmonic_ambiguity(harmonic_field: HarmonicField) -> float:
    """BH: lower = more functional, voice-led."""
    t = 0.0
    if "dim" in str(harmonic_field.chord_types):
        t += 0.2
    if harmonic_field.avoid_resolution:
        t += 0.3
    return min(1.0, t)
