"""
Big Band Harmonic Fields — Modern big band modal, layered chromatic, brass axis.
"""

from typing import List

try:
    from .composer_ir import HarmonicField
except ImportError:
    from composer_ir import HarmonicField

CENTERS_BY_PROFILE = {
    "modern_big_band_modal": ["C", "F", "Bb"],
    "layered_chromatic": ["C", "Db", "Eb", "F"],
    "brass_axis_field": ["Bb", "Eb", "F"],
    "shout_dominant_field": ["Bb", "Eb", "F", "G"],
    "sectional_pedal_field": ["C", "G", "F"],
}

CHORD_TYPES = {
    "modern_big_band_modal": ["7", "m7", "maj7"],
    "layered_chromatic": ["7", "m7", "7#11"],
    "brass_axis_field": ["7", "m7", "maj7"],
    "shout_dominant_field": ["7", "m7", "7"],
    "sectional_pedal_field": ["7", "m7", "maj7"],
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def build_harmonic_field(seed: int, profile: str = "modern_big_band_modal") -> HarmonicField:
    prof = profile
    centers = list(CENTERS_BY_PROFILE.get(prof, CENTERS_BY_PROFILE["modern_big_band_modal"]))
    types = list(CHORD_TYPES.get(prof, CHORD_TYPES["modern_big_band_modal"]))
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
    """Derive harmony: big band sectional."""
    c = harmonic_field.centers
    t = harmonic_field.chord_types
    if section_role == "contrast":
        idx = 1 % len(c)
        return [f"{c[idx]}{t[idx % len(t)]}", f"{c[(idx+1) % len(c)]}{t[0]}"] * 4
    if section_role == "shout":
        return [f"{c[0]}{t[0]}", f"{c[1 % len(c)]}{t[1 % len(t)]}"] * 4
    base = c[0]
    ct = t[0]
    return [
        f"{base}{ct}",
        f"{c[1 % len(c)]}{t[1 % len(t)]}",
        f"{base}{t[0]}",
        f"{c[-1]}{t[-1]}",
    ]


def score_ensemble_harmonic_interest(harmonic_field: HarmonicField) -> float:
    """Score 0-1: ensemble harmonic interest."""
    t = 0.0
    if len(harmonic_field.centers) >= 3:
        t += 0.3
    if "7" in str(harmonic_field.chord_types):
        t += 0.3
    if "#" in str(harmonic_field.chord_types):
        t += 0.2
    return min(1.0, t)
