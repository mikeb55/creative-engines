"""
Ligeti Texture Harmonic Fields — Cluster mass, static cloud, chromatic swarm.
"""

from typing import List

try:
    from .composer_ir import HarmonicField
except ImportError:
    from composer_ir import HarmonicField

CENTERS_BY_PROFILE = {
    "cluster_mass": ["C", "Db", "Eb", "E"],
    "static_cloud": ["C", "F", "G"],
    "chromatic_swarm": ["C", "Db", "D", "Eb", "E"],
    "suspended_density": ["C", "F#", "G"],
    "shifting_register_field": ["C", "Eb", "F"],
}

CHORD_TYPES = {
    "cluster_mass": ["cluster", "cloud"],
    "static_cloud": ["cluster", "cloud", "swarm"],
    "chromatic_swarm": ["cluster", "cloud"],
    "suspended_density": ["cluster", "cloud"],
    "shifting_register_field": ["cluster", "cloud", "swarm"],
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def build_harmonic_field(seed: int, profile: str = "cluster_mass") -> HarmonicField:
    prof = profile
    centers = list(CENTERS_BY_PROFILE.get(prof, CENTERS_BY_PROFILE["cluster_mass"]))
    types = list(CHORD_TYPES.get(prof, CHORD_TYPES["cluster_mass"]))
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
    """Derive harmony: texture-led."""
    c = harmonic_field.centers
    t = harmonic_field.chord_types
    if section_role == "contrast":
        idx = 1 % len(c)
        return [f"{c[idx]}{t[idx % len(t)]}", f"{c[(idx+1) % len(c)]}{t[0]}"] * 4
    base = c[0]
    ct = t[0]
    return [
        f"{base}{ct}",
        f"{c[1 % len(c)]}{t[1 % len(t)]}",
        f"{base}{t[0]}",
        f"{c[-1]}{t[-1]}",
    ]


def score_harmonic_texture(harmonic_field: HarmonicField) -> float:
    """Score 0-1: harmonic texture interest."""
    t = 0.0
    if len(harmonic_field.centers) >= 3:
        t += 0.3
    if "cluster" in str(harmonic_field.chord_types):
        t += 0.3
    if "swarm" in str(harmonic_field.chord_types):
        t += 0.2
    return min(1.0, t)
