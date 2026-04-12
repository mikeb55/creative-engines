"""
Shorter Harmonic Fields — Nonfunctional motion, ambiguity, expectation-diversion.
"""

import re
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


def _dedupe_minor_m(symbol: str) -> str:
    """Remove double minor prefix when root already ends with 'm' (e.g. Fm + m11 -> Fmm11 -> Fm11)."""
    return re.sub(r"([A-G](?:b|#)?)mm", lambda m: m.group(1) + "m", symbol)


def _pc_root_from_center(center: str) -> str:
    s = (center or "").strip()
    if not s:
        return "C"
    if len(s) >= 2 and s[1] in ("b", "#"):
        return s[:2]
    return s[0]


def _next_root(current_root: str, seed: int) -> str:
    """Bias toward semitone/whole-step/third motion."""
    CHROMATIC = ['C', 'Db', 'D', 'Eb', 'E', 'F',
                 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
    ROOT_MOTION_WEIGHTS = [
        (1, 0.22),   # semitone up
        (-1, 0.22),  # semitone down
        (2, 0.13),   # whole step up
        (-2, 0.13),  # whole step down
        (3, 0.10),   # minor 3rd
        (-3, 0.10),  # minor 3rd down
        (6, 0.05),   # tritone
        (5, 0.05),   # 4th up (suppress V-I)
    ]
    key = (current_root or "").strip()
    if len(key) >= 2 and key[1] in ("b", "#"):
        pitch = key[:2]
    else:
        pitch = key[0]
    try:
        idx = CHROMATIC.index(pitch)
    except ValueError:
        idx = 0
    h = (seed * 31 + idx) & 0xFFFFFFFF
    r = (h & 0xFF) / 255.0
    cumulative = 0.0
    for semitones, weight in ROOT_MOTION_WEIGHTS:
        cumulative += weight
        if r < cumulative:
            new_idx = (idx + semitones) % 12
            return CHROMATIC[new_idx]
    return CHROMATIC[(idx + 2) % 12]


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
        sym = _dedupe_minor_m(f"{c[idx]}{t[idx % len(t)]}")
        return [sym] * 4
    seed = _hash_int(sum(ord(x) for x in section_role), len(c))
    roots = [_pc_root_from_center(c[0])]
    last_root = roots[0]
    repeat_count = 0
    for k in range(3):
        new_root = _next_root(roots[-1], _hash_int(seed, k + 1))
        if new_root == last_root:
            repeat_count += 1
            if repeat_count >= 1:
                nudge_seed = seed + 999 + k * 37
                candidate = _next_root(new_root, nudge_seed)
                if candidate == new_root:
                    candidate = _next_root(new_root, nudge_seed + 1)
                new_root = candidate
                repeat_count = 0
        else:
            repeat_count = 0
        last_root = new_root
        roots.append(new_root)
    return [_dedupe_minor_m(f"{roots[i]}{t[i % len(t)]}") for i in range(4)]


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
