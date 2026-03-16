"""
Hill Harmonic Fields — Cluster-based, ambiguous modal, nonfunctional, pedal center.
"""

from typing import List

try:
    from .composer_ir import HarmonicField
except ImportError:
    from composer_ir import HarmonicField

CENTERS_BY_PROFILE = {
    "cluster_based": ["C", "F#", "Ab"],
    "ambiguous_modal": ["C", "F", "G#"],
    "nonfunctional_cycle": ["Cm", "F#m", "Am"],
    "pedal_center": ["C", "C", "Eb"],
}

CHORD_TYPES = {
    "cluster_based": ["cluster", "m7", "sus4"],
    "ambiguous_modal": ["m7", "M7", "sus"],
    "nonfunctional_cycle": ["m7", "m11", "cluster"],
    "pedal_center": ["pedal", "m7", "sus"],
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def build_harmonic_field(seed: int, profile: str = "cluster_based") -> HarmonicField:
    prof = profile
    centers = list(CENTERS_BY_PROFILE.get(prof, CENTERS_BY_PROFILE["cluster_based"]))
    types = list(CHORD_TYPES.get(prof, CHORD_TYPES["cluster_based"]))
    h = _hash_int(seed)
    if h % 2 == 0 and len(centers) > 1:
        centers = centers[::-1]
    return HarmonicField(
        centers=centers,
        motion_type=prof,
        chord_types=types,
        avoid_resolution=True,
    )


def derive_section_harmony(harmonic_field: HarmonicField, section_role: str) -> List[str]:
    c = harmonic_field.centers
    t = harmonic_field.chord_types
    if section_role == "contrast":
        idx = 1 % len(c)
        return [f"{c[idx]}{t[idx % len(t)]}"] * 4
    base = c[0]
    ct = t[0]
    return [f"{base}{ct}", f"{c[1 % len(c)]}{t[1 % len(t)]}", f"{base}{ct}", f"{c[-1]}{t[-1]}"]


def score_harmonic_ambiguity(harmonic_field: HarmonicField) -> float:
    t = 0.0
    if harmonic_field.avoid_resolution:
        t += 0.3
    if "cluster" in str(harmonic_field.chord_types) or "pedal" in str(harmonic_field.chord_types):
        t += 0.3
    if "nonfunctional" in harmonic_field.motion_type or "ambiguous" in harmonic_field.motion_type:
        t += 0.3
    return min(1.0, t)
