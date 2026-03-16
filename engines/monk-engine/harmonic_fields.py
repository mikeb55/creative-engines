"""
Monk Harmonic Fields — Blues-shadowed, altered dominant, chromatic shift, stride shadow.
"""

from typing import List

try:
    from .composer_ir import HarmonicField
except ImportError:
    from composer_ir import HarmonicField

CENTERS_BY_PROFILE = {
    "blues_shadowed": ["C", "Eb", "F", "G"],
    "altered_dominant": ["C7", "F#7", "Bb7"],
    "chromatic_shift": ["C", "Db", "D", "Eb"],
    "stride_shadow": ["C", "F", "G", "Eb"],
}

CHORD_TYPES = {
    "blues_shadowed": ["7", "m7", "7sus"],
    "altered_dominant": ["7alt", "7b9", "7"],
    "chromatic_shift": ["7", "m7", "dim7"],
    "stride_shadow": ["6", "7", "m7"],
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def build_harmonic_field(seed: int, profile: str = "blues_shadowed") -> HarmonicField:
    prof = profile
    centers = list(CENTERS_BY_PROFILE.get(prof, CENTERS_BY_PROFILE["blues_shadowed"]))
    types = list(CHORD_TYPES.get(prof, CHORD_TYPES["blues_shadowed"]))
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
        idx = 2 % len(c)
        return [f"{c[idx]}{t[idx % len(t)]}"] * 4
    base = c[0]
    ct = t[0]
    return [f"{base}{ct}", f"{c[1 % len(c)]}{t[1 % len(t)]}", f"{base}{ct}", f"{c[-1]}{t[-1]}"]


def score_harmonic_ambiguity(harmonic_field: HarmonicField) -> float:
    t = 0.0
    if harmonic_field.avoid_resolution:
        t += 0.3
    if "chromatic" in harmonic_field.motion_type or "altered" in str(harmonic_field.chord_types):
        t += 0.3
    return min(1.0, t)
