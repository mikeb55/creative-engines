"""
Frisell Atmosphere Harmonic Fields — Pedal, open, slow-moving, warm ambiguity.
"""

from typing import List

try:
    from .composer_ir import HarmonicField
except ImportError:
    from composer_ir import HarmonicField

CENTERS_BY_PROFILE = {
    "pedal_field": ["C", "G", "F"],
    "americana_open": ["C", "G", "D"],
    "floating_major_minor": ["C", "Eb", "F"],
    "suspended_plain": ["C", "F", "G"],
    "ambient_modal": ["C", "F#", "A"],
}

CHORD_TYPES = {
    "pedal_field": ["5", "sus4", "maj7"],
    "americana_open": ["maj7", "5", "sus4"],
    "floating_major_minor": ["m7", "maj7", "sus4"],
    "suspended_plain": ["sus4", "sus2", "maj7"],
    "ambient_modal": ["maj7", "sus4", "m7"],
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def build_harmonic_field(seed: int, profile: str = "pedal_field") -> HarmonicField:
    prof = profile
    centers = list(CENTERS_BY_PROFILE.get(prof, CENTERS_BY_PROFILE["pedal_field"]))
    types = list(CHORD_TYPES.get(prof, CHORD_TYPES["pedal_field"]))
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
    """Derive harmony: pedal, open, slow-moving."""
    c = harmonic_field.centers
    t = harmonic_field.chord_types
    if section_role == "contrast":
        idx = 1 % len(c)
        return [f"{c[idx]}{t[idx % len(t)]}", f"{c[0]}{t[0]}"] * 3
    base = c[0]
    ct = t[0]
    return [
        f"{base}{ct}",
        f"{c[1 % len(c)]}{t[1 % len(t)]}",
        f"{base}{t[0]}",
        f"{c[-1]}{t[-1]}",
    ]


def score_harmonic_spaciousness(harmonic_field: HarmonicField) -> float:
    """Score 0-1: spaciousness (sus, maj7, open fifths)."""
    t = 0.0
    if harmonic_field.avoid_resolution:
        t += 0.3
    if "sus" in str(harmonic_field.chord_types):
        t += 0.35
    if "5" in str(harmonic_field.chord_types) or "maj7" in str(harmonic_field.chord_types):
        t += 0.2
    return min(1.0, t)
