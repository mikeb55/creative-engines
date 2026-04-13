"""
Bebop phrasing: enclosures, unprepared approaches, chromatic neighbors.
"""

import random
import re
from typing import Dict, List, Optional, Tuple

# (above_neighbor_spec, below_neighbor_spec); "ch" = chromatic half-step from target
ENCL_LOOKUP: Dict[str, Tuple[str, str]] = {
    "major": ("7", "ch"),
    "minor": ("b7", "ch"),
    "dominant": ("ch", "3"),
    "half_dim": ("ch", "b3"),
    "dim": ("ch", "ch"),
    "sus": ("ch", "ch"),
    "default": ("ch", "ch"),
}

_DEGREE_SEMITONES = {
    "1": 0,
    "b3": 3,
    "3": 4,
    "4": 5,
    "#4": 6,
    "5": 7,
    "b7": 10,
    "7": 11,
    "9": 2,
    "11": 5,
    "13": 9,
}

_NOTE_TO_PC = {
    "C": 0,
    "D": 2,
    "E": 4,
    "F": 5,
    "G": 7,
    "A": 9,
    "B": 11,
}


def _parse_chord_root_pc(symbol: str) -> int:
    m = re.match(r"^([A-G])(b|#)?", (symbol or "C").strip())
    if not m:
        return 0
    step = m.group(1)
    acc = m.group(2) or ""
    pc = _NOTE_TO_PC.get(step, 0)
    if acc == "b":
        pc = (pc - 1) % 12
    elif acc == "#":
        pc = (pc + 1) % 12
    return pc


def _chord_category(symbol: str) -> str:
    s = (symbol or "").lower()
    if "dim" in s or "°" in symbol:
        return "dim"
    if "m7b5" in s or "ø" in symbol:
        return "half_dim"
    if "sus" in s:
        return "sus"
    if "7" in s and "maj7" not in s and "m7" not in s and "min7" not in s:
        return "dominant"
    if "m" in s or "min" in s:
        return "minor"
    if "maj" in s:
        return "major"
    return "default"


def _degree_to_pc(deg: str, root_pc: int) -> int:
    key = deg.strip()
    if key not in _DEGREE_SEMITONES:
        return root_pc % 12
    return (root_pc + _DEGREE_SEMITONES[key]) % 12


def _midi_on_side(target_pitch: int, pc: int, above: bool) -> int:
    tp = target_pitch
    for delta in range(1, 24):
        cand = tp + (delta if above else -delta)
        if (cand % 12) == (pc % 12):
            return cand
    return tp + (1 if above else -1)


def _neighbor_from_spec(
    target_pitch: int,
    deg_spec: str,
    root_pc: int,
    above: bool,
) -> int:
    if deg_spec == "ch":
        return target_pitch + (1 if above else -1)
    pc = _degree_to_pc(deg_spec, root_pc)
    return _midi_on_side(target_pitch, pc, above=above)


def _build_enclosure(
    target_pitch: int,
    above_deg: str,
    below_deg: str,
    root_pc: int,
    descending: bool,
) -> List[int]:
    above_pitch = _neighbor_from_spec(target_pitch, above_deg, root_pc, above=True)
    below_pitch = _neighbor_from_spec(target_pitch, below_deg, root_pc, above=False)
    if descending:
        return [below_pitch, above_pitch, target_pitch]
    return [above_pitch, below_pitch, target_pitch]


def _build_unprepared_approach(target_pitch: int, step: int) -> int:
    ua_pitch = target_pitch - int(step)
    return ua_pitch


def apply_bebop_phrasing(
    bar_index: int,
    chord_symbol: str,
    target_pitch: int,
    prev_pitch: Optional[int] = None,
    generation_seed: int = 0,
) -> int:
    rng = random.Random(
        generation_seed
        ^ ((bar_index + 1) * 1009)
        ^ sum(ord(c) for c in chord_symbol)
    )
    root_pc = _parse_chord_root_pc(chord_symbol)
    cat = _chord_category(chord_symbol)
    above_deg, below_deg = ENCL_LOOKUP.get(cat, ENCL_LOOKUP["default"])
    descending = (prev_pitch > target_pitch) if prev_pitch else False

    r = rng.random()
    if r < 0.33:
        _build_enclosure(target_pitch, above_deg, below_deg, root_pc, descending)
        return target_pitch
    if r < 0.5:
        step = rng.choice([1, 2, 3])
        return _build_unprepared_approach(target_pitch, step)
    return target_pitch
