"""
Bartók Night Harmonic Fields — Nonfunctional, cluster-rich, modal but unstable.
"""

from typing import List

try:
    from .composer_ir import HarmonicField
except ImportError:
    from composer_ir import HarmonicField

CENTERS_BY_PROFILE = {
    "cluster_field": ["C", "F#", "Ab"],
    "modal_axis": ["C", "Eb", "G"],
    "chromatic_center": ["C", "Db", "D", "Eb"],
    "suspended_field": ["C", "F", "G"],
    "naturalistic_field": ["C", "F#", "A"],
}

CHORD_TYPES = {
    "cluster_field": ["m7", "sus4", "m7"],
    "modal_axis": ["m7", "sus2", "m7"],
    "chromatic_center": ["m7", "dim7", "m7"],
    "suspended_field": ["sus4", "sus2", "m7"],
    "naturalistic_field": ["m7", "sus4", "m7"],
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def build_harmonic_field(seed: int, profile: str = "cluster_field") -> HarmonicField:
    prof = profile
    centers = list(CENTERS_BY_PROFILE.get(prof, CENTERS_BY_PROFILE["cluster_field"]))
    types = list(CHORD_TYPES.get(prof, CHORD_TYPES["cluster_field"]))
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
    """Derive harmony: cluster-rich, nonfunctional."""
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


def score_harmonic_texture(harmonic_field: HarmonicField) -> float:
    """Score 0-1: cluster/night-music texture."""
    t = 0.0
    if harmonic_field.avoid_resolution:
        t += 0.3
    if "sus" in str(harmonic_field.chord_types):
        t += 0.3
    if "dim" in str(harmonic_field.chord_types):
        t += 0.2
    return min(1.0, t)
