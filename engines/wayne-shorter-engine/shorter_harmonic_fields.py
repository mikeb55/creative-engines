"""
Shorter Harmonic Fields — Nonfunctional motion, ambiguity, expectation-diversion.
"""

from typing import List, Dict, Any

try:
    from .composer_ir import HarmonicField
except ImportError:
    from composer_ir import HarmonicField

CENTERS_BY_PROFILE = {
    "ambiguous_modal": ["C", "F", "G"],
    "nonfunctional_cycle": ["Cm", "Fm", "Ab"],
    "blues_shadowed": ["C", "Eb", "F"],
    "major_third_axis": ["C", "Eb", "G"],
    "suspended_dark": ["Dm", "G", "Cm"],
    "mixed_tonic_centers": ["C", "Am", "F"],
}

CHORD_TYPES = {
    "ambiguous_modal": ["m7", "M7", "sus4"],
    "nonfunctional_cycle": ["m7", "m11"],
    "blues_shadowed": ["7", "m7", "7sus"],
    "major_third_axis": ["M7", "m7", "7"],
    "suspended_dark": ["sus2", "m7", "sus4"],
    "mixed_tonic_centers": ["m7", "M7", "7"],
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def build_harmonic_field(seed: int, profile: str = "ambiguous") -> HarmonicField:
    """Build harmonic field. Deterministic."""
    prof = "ambiguous_modal" if profile == "ambiguous" else profile
    centers = list(CENTERS_BY_PROFILE.get(prof, CENTERS_BY_PROFILE["ambiguous_modal"]))
    types = list(CHORD_TYPES.get(prof, CHORD_TYPES["ambiguous_modal"]))
    h = _hash_int(seed)
    if h % 2 == 0 and len(centers) > 1:
        centers = centers[::-1]
    return HarmonicField(
        centers=centers,
        motion_type=prof,
        chord_types=types,
        avoid_resolution=(h % 3 != 0),
    )


def derive_section_harmony(harmonic_field: HarmonicField, section_role: str) -> List[str]:
    """Derive chord symbols for section from field."""
    c = harmonic_field.centers
    t = harmonic_field.chord_types
    if section_role == "contrast":
        idx = 1 % len(c)
        return [f"{c[idx]}{t[idx % len(t)]}"] * 4
    base = c[0]
    ct = t[0]
    return [f"{base}{ct}", f"{c[1 % len(c)]}{t[1 % len(t)]}", f"{base}{ct}", f"{c[-1]}{t[-1]}"]


def score_harmonic_ambiguity(harmonic_field: HarmonicField) -> float:
    """Score 0-1: higher = more ambiguous/nonfunctional."""
    t = 0.0
    if harmonic_field.avoid_resolution:
        t += 0.3
    if "nonfunctional" in harmonic_field.motion_type or "ambiguous" in harmonic_field.motion_type:
        t += 0.3
    if len(harmonic_field.centers) >= 2:
        t += 0.2
    if "sus" in str(harmonic_field.chord_types):
        t += 0.2
    return min(1.0, t)
