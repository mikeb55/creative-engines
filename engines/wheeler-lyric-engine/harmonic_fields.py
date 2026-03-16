"""
Wheeler Lyric Harmonic Fields — Suspended, spacious, nonfunctional but warm.
"""

from typing import List

try:
    from .composer_ir import HarmonicField
except ImportError:
    from composer_ir import HarmonicField

CENTERS_BY_PROFILE = {
    "suspended_lyric": ["C", "F", "G"],
    "floating_modal": ["C", "Eb", "F"],
    "open_tonal_center": ["C", "G", "D"],
    "major_minor_shade": ["C", "Ab", "Eb"],
    "chamber_ecm": ["C", "F#", "A"],
    "soft_axis": ["C", "D", "F"],
}

CHORD_TYPES = {
    "suspended_lyric": ["sus4", "maj7", "sus2"],
    "floating_modal": ["m7", "sus4", "maj7"],
    "open_tonal_center": ["maj7", "sus4", "maj7"],
    "major_minor_shade": ["m7", "maj7", "sus4"],
    "chamber_ecm": ["maj7", "sus4", "m7"],
    "soft_axis": ["sus2", "maj7", "sus4"],
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def build_harmonic_field(seed: int, profile: str = "suspended_lyric") -> HarmonicField:
    prof = profile
    centers = list(CENTERS_BY_PROFILE.get(prof, CENTERS_BY_PROFILE["suspended_lyric"]))
    types = list(CHORD_TYPES.get(prof, CHORD_TYPES["suspended_lyric"]))
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
    """Derive harmony: suspended, spacious."""
    c = harmonic_field.centers
    t = harmonic_field.chord_types
    if section_role == "contrast":
        idx = 1 % len(c)
        return [f"{c[idx]}{t[idx % len(t)]}", f"{c[(idx+1) % len(c)]}{t[0]}"] * 3
    base = c[0]
    ct = t[0]
    return [
        f"{base}{ct}",
        f"{c[1 % len(c)]}{t[1 % len(t)]}",
        f"{base}{t[0]}",
        f"{c[-1]}{t[-1]}",
    ]


def score_harmonic_suspension(harmonic_field: HarmonicField) -> float:
    """Score 0-1: suspended/lyrical texture."""
    t = 0.0
    if harmonic_field.avoid_resolution:
        t += 0.3
    if "sus" in str(harmonic_field.chord_types):
        t += 0.35
    if "maj7" in str(harmonic_field.chord_types):
        t += 0.2
    return min(1.0, t)
