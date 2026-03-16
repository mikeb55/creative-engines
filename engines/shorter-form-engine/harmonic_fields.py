"""
Shorter Form Harmonic Fields — modal shift, chromatic drift, suspended axis.
"""

from typing import List

try:
    from .composer_ir import HarmonicField
except ImportError:
    from composer_ir import HarmonicField

CENTERS_BY_PROFILE = {
    "shorter_modal_shift": ["C", "F", "Eb"],
    "chromatic_center_drift": ["C", "Db", "Eb", "F"],
    "suspended_axis": ["C", "F", "G"],
    "minor_major_duality": ["C", "Cm", "Eb"],
    "floating_tonal_center": ["C", "F#", "G"],
}

CHORD_TYPES = {
    "shorter_modal_shift": ["m7", "M7", "sus"],
    "chromatic_center_drift": ["m7", "M7", "7"],
    "suspended_axis": ["sus", "m7", "M7"],
    "minor_major_duality": ["m7", "M7", "m7"],
    "floating_tonal_center": ["m7", "M7", "sus"],
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def build_harmonic_field(seed: int, profile: str = "shorter_modal_shift") -> HarmonicField:
    prof = profile
    centers = list(CENTERS_BY_PROFILE.get(prof, CENTERS_BY_PROFILE["shorter_modal_shift"]))
    types = list(CHORD_TYPES.get(prof, CHORD_TYPES["shorter_modal_shift"]))
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
    """Derive harmony per section role."""
    c = harmonic_field.centers
    t = harmonic_field.chord_types
    if section_role == "development":
        idx = 1 % len(c)
        return [f"{c[idx]}{t[idx % len(t)]}", f"{c[(idx+1) % len(c)]}{t[0]}"] * 4
    if section_role == "return":
        return [f"{c[0]}{t[0]}", f"{c[1 % len(c)]}{t[1 % len(t)]}"] * 4
    base = c[0]
    ct = t[0]
    return [
        f"{base}{ct}",
        f"{c[1 % len(c)]}{t[1 % len(t)]}",
        f"{base}{t[0]}",
        f"{c[-1]}{t[-1]}",
    ]


def score_harmonic_narrative(harmonic_field: HarmonicField) -> float:
    """Score 0-1: harmonic narrative interest."""
    t = 0.0
    if len(harmonic_field.centers) >= 3:
        t += 0.3
    if "sus" in str(harmonic_field.chord_types):
        t += 0.2
    if harmonic_field.avoid_resolution:
        t += 0.2
    return min(1.0, t)
