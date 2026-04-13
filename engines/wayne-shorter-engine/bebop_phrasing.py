"""
Bebop phrasing: enclosures, unprepared approaches, chromatic neighbors,
eighth-based bar templates, triplets, cross-bar anticipation.
"""

import random
import re
from typing import Any, Dict, List, Optional, Tuple

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

# Bar grid: divisions=4 per quarter; beat anchors
BEAT_DIVISION_OFFSETS = [0, 4, 8, 12]

# Melody register: A3 (57) through G5 (79)
MELODY_MIDI_LO = 57
MELODY_MIDI_HI = 79


def _clamp_melody_pitch(pitch: int) -> int:
    p = int(pitch)
    while p > MELODY_MIDI_HI:
        p -= 12
    while p < MELODY_MIDI_LO:
        p += 12
    return p


EIGHTH_TEMPLATES = [
    [2, 2, 2, 2, 2, 2, 2, 2],
    [2, 2, 2, 2, 2, 2, 4],
    [4, 2, 2, 2, 2, 2, 2],
    [2, 2, 2, 2, 4, 2, 2],
    [2, 2, 2, 2, 2, 2, 2, 2],
    [4, 2, 2, 2, 2, 2, 2],
    [2, 2, 4, 2, 2, 2, 2],
    [2, 2, 2, 2, 2, 4, 2],
]


def _triplet_slot_indices(template_index: int, template: List[int]) -> set:
    """Which slot index is a triplet group (dur=4 → 3× written eighth-triplet)."""
    if template_index == 5 and len(template) >= 1:
        return {len(template) - 1}
    if template_index == 6 and len(template) >= 3:
        return {2}
    return set()


def _parse_root(chord_symbol: str) -> str:
    m = re.match(r"^([A-G])(b|#)?", (chord_symbol or "C").strip())
    return m.group(1) if m else "C"


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


def _chord_quality(symbol: str) -> str:
    """Harmony class for scale choice (alias of chord category)."""
    return _chord_category(symbol)


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


def _scale_for_quality(quality: str) -> List[int]:
    """Semitone offsets from root for candidate scale tones."""
    q = quality or "default"
    major = [0, 2, 4, 5, 7, 9, 11]
    natural_minor = [0, 2, 3, 5, 7, 8, 10]
    mixolydian = [0, 2, 4, 5, 7, 9, 10]
    half_dim_scale = [0, 2, 3, 5, 6, 8, 10]
    dim_oct = [0, 2, 3, 5, 6, 8, 9, 11]
    sus_mix = [0, 2, 5, 7, 9, 10]
    if q == "major":
        return major
    if q == "minor":
        return natural_minor
    if q == "dominant":
        return mixolydian
    if q == "half_dim":
        return half_dim_scale
    if q == "dim":
        return dim_oct
    if q == "sus":
        return sus_mix
    return major


def _pc_to_nearest_pitch(pc: int, target_pitch: int) -> int:
    """MIDI pitch with pitch-class `pc` closest to `target_pitch` (no register clamp)."""
    pc = int(pc) % 12
    t = int(target_pitch)
    rem = t % 12
    diff = (pc - rem) % 12
    if diff > 6:
        diff -= 12
    return t + diff


def _trip_pitches_scale_above_below_target(
    chord_symbol: str,
    target_pitch: int,
) -> Tuple[int, int, int]:
    """
    Three distinct pitches for a triplet: scale tone above target, scale tone below, target.
    Uses chord quality scale and register 57–79.
    """
    root_pc = _parse_chord_root_pc(chord_symbol)
    quality = _chord_quality(chord_symbol)
    scale = _scale_for_quality(quality)
    tp = _clamp_melody_pitch(int(target_pitch))

    candidates: List[int] = []
    for semis in scale:
        for oct_shift in (-12, 0, 12):
            p_pc = (root_pc + int(semis)) % 12
            cand = _pc_to_nearest_pitch(p_pc, tp) + oct_shift
            if MELODY_MIDI_LO <= cand <= MELODY_MIDI_HI and cand not in candidates:
                candidates.append(cand)
    candidates.sort(key=lambda x: abs(x - tp))

    above = next((c for c in candidates if c > tp), _clamp_melody_pitch(tp + 2))
    below = next((c for c in candidates if c < tp), _clamp_melody_pitch(tp - 1))

    if above == tp:
        above = _clamp_melody_pitch(tp + 1)
    if below == tp:
        below = _clamp_melody_pitch(tp - 1)
    if above == below:
        above = _clamp_melody_pitch(above + 1)

    return above, below, tp


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
            return _clamp_melody_pitch(cand)
    return _clamp_melody_pitch(tp + (1 if above else -1))


def _neighbor_from_spec(
    target_pitch: int,
    deg_spec: str,
    root_pc: int,
    above: bool,
) -> int:
    if deg_spec == "ch":
        return _clamp_melody_pitch(target_pitch + (1 if above else -1))
    pc = _degree_to_pc(deg_spec, root_pc)
    return _midi_on_side(target_pitch, pc, above=above)


def _build_enclosure(
    target_pitch: int,
    above_deg: str,
    below_deg: str,
    root_pc: int,
    descending: bool,
) -> List[int]:
    t = _clamp_melody_pitch(target_pitch)
    above_pitch = _neighbor_from_spec(t, above_deg, root_pc, above=True)
    below_pitch = _neighbor_from_spec(t, below_deg, root_pc, above=False)
    if descending:
        return [below_pitch, above_pitch, t]
    return [above_pitch, below_pitch, t]


def _build_unprepared_approach(target_pitch: int, step: int) -> int:
    return _clamp_melody_pitch(target_pitch - int(step))


def _chord_tone_midi(root_pc: int, beat_idx: int, center_midi: int) -> int:
    """Simple chord-tone rotation by beat (1,3,5,7 degrees)."""
    degrees = ["1", "3", "5", "7"]
    deg = degrees[beat_idx % 4]
    pc = _degree_to_pc(deg, root_pc)
    base = center_midi - (center_midi % 12) + pc
    if base < center_midi - 6:
        base += 12
    elif base > center_midi + 6:
        base -= 12
    return _clamp_melody_pitch(base)


def _get_chord_tone(root_pc: int, beat_idx: int, center_midi: int) -> int:
    return _chord_tone_midi(root_pc, beat_idx, center_midi)


def _chromatic_approach(target_pitch: int) -> int:
    return _clamp_melody_pitch(target_pitch - 1)


def _diatonic_approach(target_pitch: int) -> int:
    return _clamp_melody_pitch(target_pitch - 2)


def _enclosure_two_note(target_pitch: int, root_pc: int) -> Tuple[int, int]:
    below = _neighbor_from_spec(target_pitch, "ch", root_pc, above=False)
    above = _neighbor_from_spec(target_pitch, "ch", root_pc, above=True)
    return below, above


def _pick_next_chord_tone(root_pc: int, beat_idx: int, center_midi: int) -> int:
    return _get_chord_tone(root_pc, beat_idx, center_midi)


def _apply_cross_bar_anticipation(
    events: List[Dict[str, Any]],
    next_chord_root_pc: int,
    center_midi: int,
) -> None:
    """Anticipate next harmony on late-bar chord tones (non-triplet events only for peer lookup)."""
    for ev in events:
        off = ev.get("offset")
        if off is None or off < 12:
            continue
        try:
            peer = next(
                e
                for e in events
                if e["offset"] == off and e["time_mod"] is None
            )
        except StopIteration:
            continue
        if peer is ev and ev.get("time_mod") is None:
            ev["pitch"] = _chord_tone_midi(next_chord_root_pc, 0, center_midi)


def _build_bar_note_events(
    _prior_events: List[Any],
    chord_curr: str,
    chord_next: str,
    bar_index: int,
    target_midi: int,
    generation_seed: int,
) -> List[Dict[str, Any]]:
    _ = random.Random(
        generation_seed
        ^ ((bar_index + 1) * 1009)
        ^ sum(ord(c) for c in chord_curr)
    )
    t_idx = bar_index % len(EIGHTH_TEMPLATES)
    template = EIGHTH_TEMPLATES[t_idx]
    triplet_slots = _triplet_slot_indices(t_idx, list(template))

    root_curr = _parse_chord_root_pc(chord_curr)
    root_next = _parse_chord_root_pc(chord_next)

    # BUG 1: beat anchors always [0,4,8,12] (fixed grid; no logical_positions / dur=3 mapper)
    beat_pitch: Dict[int, int] = {}
    for bi, beat_pos in enumerate(BEAT_DIVISION_OFFSETS):
        beat_pitch[beat_pos] = _pick_next_chord_tone(root_curr, bi, target_midi)

    events: List[Dict[str, Any]] = []
    off = 0
    for si, dur in enumerate(template):
        if si in triplet_slots and dur == 4:
            trip_durs = [1, 1, 2]
            slot_beat = min(3, off // 4)
            target_pitch = _pick_next_chord_tone(root_curr, slot_beat, target_midi)
            above, below, t_pitch = _trip_pitches_scale_above_below_target(
                chord_curr, target_pitch
            )
            trip_pitches = [above, below, t_pitch]
            for j, wdur in enumerate(trip_durs):
                div = off + j
                events.append({
                    "offset": div,
                    "duration": wdur,
                    "type": "eighth",
                    "dot": False,
                    "pitch": trip_pitches[j],
                    "time_mod": {"actual": 3, "normal": 2},
                })
            off += dur
            continue

        ntype = "half" if dur >= 8 else ("quarter" if dur >= 4 else "eighth")
        events.append({
            "offset": off,
            "duration": dur,
            "type": ntype,
            "dot": False,
            "pitch": _pick_next_chord_tone(root_curr, min(3, off // 4), target_midi),
            "time_mod": None,
        })
        off += dur

    # BUG 1: chord tones on beats 0,4,8,12 — snap each beat to nearest attack (no extra duration)
    for beat_pos in BEAT_DIVISION_OFFSETS:
        ev_pick = min(events, key=lambda e: abs(e["offset"] - beat_pos))
        ev_pick["pitch"] = beat_pitch[beat_pos]

    events.sort(key=lambda e: (e["offset"], e["time_mod"] is not None))
    _apply_cross_bar_anticipation(events, root_next, target_midi)

    return events


def apply_bebop_phrasing(
    bar_notes: List[Dict[str, Any]],
    chord_symbol: str,
    next_chord_symbol: str,
    bar_index: int,
    prev_pitch: Optional[int] = None,
    generation_seed: int = 0,
) -> List[Dict[str, Any]]:
    """
    Build one full bar of bebop-oriented eighth rhythms.
    Replaces any prior per-note list: each returned dict has
    pitch, duration (divisions), offset (divisions), type, dot, time_mod.
    """
    _ = prev_pitch  # reserved for future voice-leading / enclosure direction
    target_midi = _clamp_melody_pitch(int(bar_notes[0]["pitch"])) if bar_notes else 60
    return _build_bar_note_events(
        bar_notes,
        chord_symbol,
        next_chord_symbol,
        bar_index,
        target_midi,
        generation_seed,
    )
