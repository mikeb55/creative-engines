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
    "altered_dominant": ["C", "F#", "Bb"],
    "chromatic_shift": ["C", "Db", "D", "Eb"],
    "stride_shadow": ["C", "F", "G", "Eb"],
}

CHORD_TYPES = {
    "blues_shadowed": ["7", "m7", "7sus"],
    "altered_dominant": ["7alt", "7b9", "7"],
    "chromatic_shift": ["7", "m7", "dim7"],
    "stride_shadow": ["6", "7", "m7"],
}

CHROMATIC = [
    "C", "Db", "D", "Eb", "E", "F",
    "F#", "G", "Ab", "A", "Bb", "B",
]

ROOT_MOTION_WEIGHTS = [
    (1, 0.22), (-1, 0.22),
    (2, 0.13), (-2, 0.13),
    (3, 0.10), (-3, 0.10),
    (6, 0.05), (5, 0.05),
]


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def _pc_root_from_center(center: str) -> str:
    s = (center or "").strip()
    if not s:
        return "C"
    if len(s) >= 2 and s[1] in ("b", "#"):
        return s[:2]
    return s[0]


def _get_chord_types(harmonic_field: HarmonicField) -> List[str]:
    return list(harmonic_field.chord_types)


def _next_root(current_root: str, seed: int) -> str:
    """Bias toward semitone/whole-step/third motion."""
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
        # Use tritone-related center for contrast
        centers = harmonic_field.centers if hasattr(harmonic_field, "centers") else ["F", "Gb"]
        ctr = centers[1] if len(centers) > 1 else "F"
        chord_types = _get_chord_types(harmonic_field)
        contrast_types = ["m7", "dim7", "7sus", "m7"]
        seed = _hash_int(sum(ord(x) for x in section_role), len(centers))
        root = _pc_root_from_center(ctr)
        roots = [root]
        for k in range(1, 4):
            root = _next_root(root, _hash_int(seed, k + 50))
            roots.append(root)
        types = [contrast_types[k % len(contrast_types)] for k in range(4)]
        return [f"{r}{t}" for r, t in zip(roots, types)]
    seed = _hash_int(sum(ord(x) for x in section_role), len(c))
    roots = [_pc_root_from_center(c[0])]
    last_root = roots[0]
    repeat_count = 0
    for k in range(3):
        new_root = _next_root(roots[-1], _hash_int(seed, k + 1))
        if new_root == last_root:
            repeat_count += 1
            if repeat_count >= 1:
                # Force move by skipping at least 2 semitones
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
    return [f"{roots[i]}{t[i % len(t)]}" for i in range(4)]


def score_harmonic_ambiguity(harmonic_field: HarmonicField) -> float:
    t = 0.0
    if harmonic_field.avoid_resolution:
        t += 0.3
    if "chromatic" in harmonic_field.motion_type or "altered" in str(harmonic_field.chord_types):
        t += 0.3
    return min(1.0, t)
