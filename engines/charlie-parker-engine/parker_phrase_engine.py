"""Phrase-level melody generation for the Charlie Parker engine."""

from __future__ import annotations

from collections import Counter
import hashlib
import json
import random
import re as _re
from typing import Any, Dict, List, Optional, Tuple

from parker_rhythm_engine import (
    RHYTHM_TEMPLATES,
    beats_to_divisions,
    get_strong_positions,
    get_weak_positions,
    select_rhythm_template,
)
from parker_vocabulary import PARKER_VOCABULARY, get_pattern

DIVISIONS = 4

# Alto register (Bird): clamp all phrase MIDI to this span.
_MIDI_LO = 58
_MIDI_HI = 82

NOTE_TO_PC = {"c": 0, "d": 2, "e": 4, "f": 5, "g": 7, "a": 9, "b": 11}

# Per (section, 4-bar phrase): last main pattern id and contour sign for alternation.
_last_pattern_id: Dict[Tuple[int, int], str] = {}
_last_contour_sign: Dict[Tuple[int, int], int] = {}

# GCE (Claude): cache keyed by chord_sequence_hash + generation_seed (deterministic replay).
_GCE_CACHE: Dict[str, List[Dict[str, Any]]] = {}

# GCE: full 8-bar section cache (sha256 of label + chords + seed).
_SECTION_CACHE: Dict[str, List[List[Dict[str, Any]]]] = {}

# GCE prompt context: previous bar chord (same composition), motif accumulation, chorus motif.
_GCE_PREV_CHORD: str = ""
_MOTIF_BAR_BUFFER: List[List[Dict[str, Any]]] = []
_MOTIF_ROOT_CHORD: str = ""
_CHORUS_MOTIF: Optional[Dict[str, Any]] = None

PARKER_RAG_TEMPLATES = [
    {
        "function": "ii-V-I",
        "role": "opening",
        "contour": "descending",
        "bars": 2,
        "anticipates": True,
        "intervals": [0, +2, -1, -2, -1, -1, -2, +1],
        "target_beat": "beat-2",
        "target_degree": "3rd-of-I",
        "entry_degree": "9th-of-ii",
        "description": "Opens on 9th of ii, descends chromatically through V, lands 3rd of I on beat 2",
    },
    {
        "function": "ii-V-I",
        "role": "cadence",
        "contour": "descending",
        "bars": 2,
        "anticipates": True,
        "intervals": [0, -1, -2, +1, -1, -2, -1, -2],
        "target_beat": "beat-1",
        "target_degree": "5th-of-I",
        "entry_degree": "3rd-of-ii",
        "description": "Opens on 3rd of ii, chromatic descent, resolves 5th of I",
    },
    {
        "function": "ii-V-I",
        "role": "continuation",
        "contour": "arch",
        "bars": 2,
        "anticipates": False,
        "intervals": [+2, +1, +2, -1, -2, -1, -2, -1],
        "target_beat": "beat-3",
        "target_degree": "3rd-of-I",
        "entry_degree": "root-of-ii",
        "description": "Climbs through ii, peaks on V, descends to 3rd of I",
    },
    {
        "function": "V-I",
        "role": "cadence",
        "contour": "descending",
        "bars": 1,
        "anticipates": True,
        "intervals": [-1, -1, +1, -2, -1, -1, -2],
        "target_beat": "and-of-4",
        "target_degree": "3rd-of-I",
        "entry_degree": "b9-of-V",
        "description": "Opens on b9 of V, chromatic approach, anticipates I on and-of-4",
    },
    {
        "function": "V-I",
        "role": "continuation",
        "contour": "descending",
        "bars": 1,
        "anticipates": False,
        "intervals": [0, -1, -2, -1, +1, -2, -1],
        "target_beat": "beat-2",
        "target_degree": "7th-of-I",
        "entry_degree": "3rd-of-V",
        "description": "3rd of V, chromatic descent, lands 7th of I on beat 2",
    },
    {
        "function": "turnaround",
        "role": "continuation",
        "contour": "descending",
        "bars": 4,
        "anticipates": True,
        "intervals": [-1, -2, -1, -1, -2, +1, -2, -1, -1, -2, -1, -2, -1, -1, -2],
        "target_beat": "beat-1",
        "target_degree": "3rd-of-I",
        "entry_degree": "5th-of-I",
        "description": "Continuous chromatic descent across I-VI-ii-V, treats VI as dominant",
    },
    {
        "function": "turnaround",
        "role": "cadence",
        "contour": "arch",
        "bars": 4,
        "anticipates": True,
        "intervals": [+2, +1, -1, -2, -1, -2, -1, +1, -2, -1, -2, -1, -1, -2],
        "target_beat": "beat-2",
        "target_degree": "3rd-of-I",
        "entry_degree": "9th-of-I",
        "description": "Arch over turnaround, peaks on VI, descends through ii-V to I",
    },
    {
        "function": "interior-dominant",
        "role": "opening",
        "contour": "rising",
        "bars": 2,
        "anticipates": False,
        "intervals": [+1, +2, +1, +2, -1, -2, -1, -2],
        "target_beat": "beat-1",
        "target_degree": "b7-of-V",
        "entry_degree": "3rd-of-V",
        "description": "Rises through altered dominant extensions, peaks at b7, begins descent",
    },
    {
        "function": "interior-tonic",
        "role": "continuation",
        "contour": "descending",
        "bars": 2,
        "anticipates": False,
        "intervals": [0, -1, -2, +1, -1, -2, +2, -1, -2, -1],
        "target_beat": "beat-3",
        "target_degree": "9th-of-I",
        "entry_degree": "13th-of-I",
        "description": "Upper extension line on tonic, favors 9/11/13, avoids plain arpeggio",
    },
    {
        "function": "ii-V-I",
        "role": "opening",
        "contour": "sawtooth",
        "bars": 2,
        "anticipates": True,
        "intervals": [-2, -1, +3, -2, -1, +2, -2, -1],
        "target_beat": "beat-2",
        "target_degree": "3rd-of-I",
        "entry_degree": "9th-of-ii",
        "description": "Sawtooth: chromatic descents interrupted by upward leaps, Bird blues feel",
    },
]

PARKER_CONCRETE_PHRASES = {
    "ii-V": [
        {
            "source": "ko-ko",
            "chord_context": "Am7 → D7",
            "entry_degree": "5th",
            "exit_degree": "maj7",
            "contour": "descending",
            "intervals": [-2, -2, 4, 3, 4, -1, -1, -1, -1, -3, -4, -3, 10, -4],
            "notes": [
                {"pitch": "E", "octave": 5, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "D", "octave": 5, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "C", "octave": 5, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": True, "dot": False, "is_chord": False},
                {"pitch": "E", "octave": 5, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "G", "octave": 5, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": True, "dot": False, "is_chord": False},
                {"pitch": "B", "octave": 5, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "B", "octave": 5, "alter": -1, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "A", "octave": 5, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
            ],
        },
        {
            "source": "ko-ko",
            "chord_context": "Dm7 → G7",
            "entry_degree": "5th",
            "exit_degree": "maj7",
            "contour": "descending",
            "intervals": [-2, -2, 4, 3, 4, -1, -1, -1, -1, -3, -4, -3, 10, -4],
            "notes": [
                {"pitch": "A", "octave": 5, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "G", "octave": 5, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "F", "octave": 5, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": True, "dot": False, "is_chord": False},
                {"pitch": "A", "octave": 5, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "C", "octave": 6, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": True, "dot": False, "is_chord": False},
                {"pitch": "E", "octave": 6, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "E", "octave": 6, "alter": -1, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "D", "octave": 6, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
            ],
        },
    ],
    "iiø-V": [
        {
            "source": "confirmation",
            "chord_context": "Em7b5 → A7",
            "entry_degree": "b3",
            "exit_degree": "b9",
            "contour": "descending",
            "intervals": [-1, -2, -1, -2, 1, -1, -2, -1],
            "notes": [
                {"pitch": "G", "octave": 5, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "F", "octave": 5, "alter": 1, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "E", "octave": 5, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "D", "octave": 5, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "C", "octave": 5, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "C", "octave": 5, "alter": 1, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "B", "octave": 4, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "B", "octave": 4, "alter": -1, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
            ],
        },
    ],
    "interior-tonic": [
        {
            "source": "ornithology",
            "chord_context": "Fmaj7 (tonic)",
            "entry_degree": "9",
            "exit_degree": "3",
            "contour": "descending",
            "intervals": [-1, -2, 1, -1, -2, -1, -2, 1],
            "notes": [
                {"pitch": "G", "octave": 5, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "F", "octave": 5, "alter": 1, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "F", "octave": 5, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "E", "octave": 5, "alter": 0, "duration": 4, "type": "quarter", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "D", "octave": 5, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "C", "octave": 5, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "B", "octave": 4, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "A", "octave": 4, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
            ],
        },
    ],
    "V-I": [
        {
            "source": "ko-ko",
            "chord_context": "D7 → Gmaj7",
            "entry_degree": "11th",
            "exit_degree": "5th",
            "contour": "descending",
            "intervals": [-3, -4, -3, 10, -4, -3, -4, 10, 1, 1, 1, -3, 1, -5],
            "notes": [
                {"pitch": "G", "octave": 5, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "E", "octave": 5, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "C", "octave": 5, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "A", "octave": 4, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "G", "octave": 5, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "E", "octave": 5, "alter": -1, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "C", "octave": 5, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "A", "octave": 4, "alter": -1, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
            ],
        },
        {
            "source": "ko-ko",
            "chord_context": "G7 → Cmaj7",
            "entry_degree": "root",
            "exit_degree": "5th",
            "contour": "descending",
            "intervals": [-4, -4, -4, 2, -4, -3, 5, -3, 3, 2, 2, 3, -2, -1],
            "notes": [
                {"pitch": "G", "octave": 5, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "E", "octave": 5, "alter": -1, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "B", "octave": 4, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "G", "octave": 4, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "A", "octave": 4, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "F", "octave": 4, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "D", "octave": 4, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "G", "octave": 4, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
            ],
        },
    ],
    "turnaround": [
        {
            "source": "billies-bounce",
            "chord_context": "D → G7 (I-V turnaround)",
            "entry_degree": "root",
            "exit_degree": "11th",
            "contour": "descending",
            "intervals": [-2, -1, -2, -2, -1, -2, -1, -1, -2, -1, 3, 4, 3, -2],
            "notes": [
                {"pitch": "D", "octave": 5, "alter": 0, "duration": 4, "type": "quarter", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "C", "octave": 5, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "B", "octave": 4, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "A", "octave": 4, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "G", "octave": 4, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "F", "octave": 4, "alter": 1, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "E", "octave": 4, "alter": 0, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
                {"pitch": "E", "octave": 4, "alter": -1, "duration": 2, "type": "eighth", "is_rest": False, "triplet": False, "dot": False, "is_chord": False},
            ],
        },
    ],
}


def _phrase_group_key(section_index: int, bar_index: int) -> Tuple[int, int]:
    return (section_index, bar_index // 4)


def _contour_sign_from_intervals(ivs: List[int]) -> int:
    s = sum(ivs)
    if s > 0:
        return 1
    if s < 0:
        return -1
    return 0


def _pick_main_pattern_entry(
    main_key: str,
    generation_seed: int,
    rng: random.Random,
    phrase_key: Tuple[int, int],
) -> Tuple[str, List[int]]:
    pool = PARKER_VOCABULARY.get(main_key, PARKER_VOCABULARY["dominant"])
    last_id = _last_pattern_id.get(phrase_key)
    prev_c = _last_contour_sign.get(phrase_key)

    sel = generation_seed
    entry = pool[sel % len(pool)]
    if last_id is not None and entry["id"] == last_id:
        sel += 1
        entry = pool[sel % len(pool)]

    ivs = list(entry["intervals_from_root"])
    sign = _contour_sign_from_intervals(ivs)
    if (
        prev_c is not None
        and prev_c != 0
        and sign != 0
        and sign == prev_c
        and rng.random() < 0.6
    ):
        sel += 1
        entry = pool[sel % len(pool)]
        ivs = list(entry["intervals_from_root"])
        sign = _contour_sign_from_intervals(ivs)

    _last_pattern_id[phrase_key] = entry["id"]
    if sign != 0:
        _last_contour_sign[phrase_key] = sign
    return entry["id"], ivs


def _prepend_quarter_rest_trim(notes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Opening quarter rest (4 divisions); drop first 4 divisions of material."""
    rest_q = _note_shape(4, is_rest=True)
    consumed = 0
    out: List[Dict[str, Any]] = []
    for n in notes:
        if consumed >= 4:
            out.append(n)
            continue
        d = int(n["duration"])
        if consumed + d <= 4:
            consumed += d
            continue
        cut = 4 - consumed
        rem = d - cut
        consumed = 4
        if n.get("is_rest"):
            out.append(_note_shape(rem, is_rest=True))
        else:
            out.append(
                _note_shape(
                    rem,
                    is_rest=False,
                    step=n["pitch"],
                    alter=float(n.get("alter", 0.0)),
                    octv=int(n["octave"]),
                    triplet=bool(n.get("triplet")) and rem <= 1,
                )
            )
    return [rest_q] + out


def _maybe_half_note_bar_end(notes: List[Dict[str, Any]], bar_index: int) -> List[Dict[str, Any]]:
    """Every 4th bar (indices 3,7,…): first 8 divisions + closing half note on last pitch."""
    if bar_index % 4 != 3 or not notes:
        return notes
    pitched = [n for n in notes if not n.get("is_rest")]
    if not pitched:
        return notes
    last_p = pitched[-1]
    prefix: List[Dict[str, Any]] = []
    t = 0
    for n in notes:
        if t >= 8:
            break
        d = int(n["duration"])
        if t + d <= 8:
            prefix.append(n)
            t += d
        else:
            need = 8 - t
            if n.get("is_rest"):
                prefix.append(_note_shape(need, is_rest=True))
            else:
                prefix.append(
                    _note_shape(
                        need,
                        is_rest=False,
                        step=n["pitch"],
                        alter=float(n.get("alter", 0.0)),
                        octv=int(n["octave"]),
                        triplet=bool(n.get("triplet")) and need <= 1,
                    )
                )
            t = 8
            break
    half = _note_shape(
        8,
        is_rest=False,
        step=last_p["pitch"],
        alter=float(last_p.get("alter", 0.0)),
        octv=int(last_p["octave"]),
        triplet=False,
    )
    return prefix + [half]


def _norm_chord(sym: str) -> str:
    return (sym or "").split("/")[0].strip()


def _has_maj7(sym: str) -> bool:
    low = sym.lower()
    return "maj7" in low or "Δ" in sym or ("maj" in low and "7" in low)


def _has_min7(sym: str) -> bool:
    low = sym.lower()
    return "m7" in low or "-7" in low


def _is_half_dim(sym: str) -> bool:
    low = sym.lower()
    return "ø" in sym or "m7b5" in low


def _is_dom7(sym: str) -> bool:
    low = sym.lower()
    if not sym or "sus" in low:
        return "sus" in low
    if _has_maj7(sym):
        return False
    if _has_min7(sym) and "b5" not in low:
        return False
    if "m7" in low or low.endswith("m7"):
        return False
    return "7" in sym


def _is_min_tonic(sym: str) -> bool:
    low = sym.lower()
    if not sym.strip():
        return False
    if "7" in low or "maj" in low:
        return False
    return low.endswith("m") or low.endswith("min")


def detect_harmonic_context(
    chord: str,
    next_chord: str = "",
    next_next_chord: str = "",
) -> str:
    """
    Classify harmony for vocabulary / rhythm bias.
    ii m7 -> V7 => ii_V; standalone 7 => V/dominant; maj7 => tonic_major;
    minor tonic => tonic_minor; sus => dominant; turnaround fragment => turnaround.
    """
    c = _norm_chord(chord)
    n = _norm_chord(next_chord)
    nn = _norm_chord(next_next_chord)
    low = c.lower()

    if "sus" in low:
        return "dominant"
    if _is_half_dim(c):
        return "ii"
    if _has_maj7(c):
        if _has_min7(n) and _is_dom7(nn):
            return "turnaround"
        return "tonic_major"
    if _has_min7(c) and _is_dom7(n):
        return "ii_V"
    if _has_min7(c):
        return "ii"
    if _is_dom7(c):
        return "V"
    if _is_min_tonic(c):
        return "tonic_minor"
    return "dominant"


def _parse_root(sym: str) -> Tuple[str, int]:
    left = sym.split("/")[0].strip()
    m = _re.match(r"^([A-Ga-g])([#b♯♭]?)", left)
    if not m:
        return "C", 0
    step = m.group(1).upper()
    acc = m.group(2) or ""
    if acc in ("#", "♯"):
        return step, 1
    if acc in ("b", "♭"):
        return step, -1
    return step, 0


def _root_pc(sym: str) -> int:
    step, alt = _parse_root(sym)
    pc = NOTE_TO_PC[step.lower()]
    return (pc + alt) % 12


def _midi_for_interval(sym: str, interval_from_root: int, bar_seed: int) -> int:
    pc = _root_pc(sym)
    base = 60 + ((pc - (60 % 12) + 12) % 12)
    midi = base + interval_from_root
    while midi < _MIDI_LO:
        midi += 12
    while midi > _MIDI_HI:
        midi -= 12
    tweak = (bar_seed // 11) % 2
    if tweak and midi + 12 <= _MIDI_HI:
        midi += 12
    return max(_MIDI_LO, min(_MIDI_HI, midi))


def _midi_from_note_dict(n: Dict[str, Any]) -> int:
    """Inverse of _spell_pitch for register carry (small search)."""
    step = str(n["pitch"])
    want_alter = float(n.get("alter", 0.0))
    want_oct = int(n["octave"])
    for m in range(_MIDI_LO, _MIDI_HI + 1):
        s, al, o = _spell_pitch(m)
        if s == step and abs(al - want_alter) < 0.01 and o == want_oct:
            return m
    return (_MIDI_LO + _MIDI_HI) // 2


def _spell_pitch(midi: int) -> Tuple[str, float, int]:
    pc = midi % 12
    octave = (midi // 12) - 1
    table = [
        ("C", 0.0),
        ("C", 1.0),
        ("D", 0.0),
        ("D", 1.0),
        ("E", 0.0),
        ("F", 0.0),
        ("F", 1.0),
        ("G", 0.0),
        ("G", 1.0),
        ("A", 0.0),
        ("A", 1.0),
        ("B", 0.0),
    ]
    step, alter = table[pc]
    return step, alter, octave


def _note_shape(
    dur: int,
    *,
    is_rest: bool,
    step: str = "B",
    alter: float = 0.0,
    octv: int = 3,
    triplet: bool = False,
) -> Dict[str, Any]:
    if is_rest:
        if dur >= 16:
            typ = "whole"
        elif dur >= 8:
            typ = "half"
        elif dur >= 4:
            typ = "quarter"
        else:
            typ = "eighth"
        return {
            "pitch": step,
            "octave": octv,
            "alter": alter,
            "duration": dur,
            "type": typ,
            "is_rest": True,
            "is_chord": False,
            "dot": False,
            "triplet": triplet,
        }
    dot = False
    if dur >= 16:
        typ = "whole"
    elif dur >= 12:
        typ = "half"
        dot = True
    elif dur >= 8:
        typ = "half"
    elif dur >= 6:
        typ = "quarter"
        dot = True
    elif dur >= 4:
        typ = "quarter"
    elif dur >= 3:
        typ = "eighth"
        dot = True
    elif dur >= 2:
        typ = "eighth"
    else:
        typ = "eighth"
        triplet = triplet or dur == 1
    return {
        "pitch": step,
        "octave": octv,
        "alter": alter,
        "duration": dur,
        "type": typ,
        "is_rest": False,
        "is_chord": False,
        "dot": dot,
        "triplet": triplet,
    }


def _snap_register(prev: int, raw: int) -> int:
    m = raw
    for _ in range(4):
        if m - prev > 7:
            m -= 12
        elif prev - m > 7:
            m += 12
        else:
            break
    return max(_MIDI_LO, min(_MIDI_HI, m))


def _is_triplet_beat(beats: float) -> bool:
    return abs(beats - 0.333) < 0.02 or abs(beats - 1.0 / 3.0) < 0.02


def _template_eighth_ratio(template: Dict[str, Any]) -> float:
    ds = [float(d) for d in template["durations"] if d is not None]
    if not ds:
        return 0.0
    hits = sum(1 for d in ds if abs(d - 0.5) < 0.02 or _is_triplet_beat(d))
    return hits / len(ds)


def _pick_triplet_template(phrase_role: str, bar_index: int, generation_seed: int) -> Dict[str, Any]:
    trip_pool = [
        t
        for t in RHYTHM_TEMPLATES
        if t.get("triplet_count", 0) > 0 and t.get("id") != "rh_010"
    ]
    sub = [t for t in trip_pool if t["phrase_role"] == phrase_role]
    if not sub:
        sub = [t for t in trip_pool if t["phrase_role"] in ("continuation", "launch", "ending")]
    if not sub:
        sub = trip_pool
    return sub[(bar_index * 5 + generation_seed) % len(sub)]


def _pick_eighth_heavy_template(
    phrase_role: str,
    bar_index: int,
    generation_seed: int,
) -> Dict[str, Any]:
    pool = [t for t in RHYTHM_TEMPLATES if t["phrase_role"] == phrase_role]
    if not pool:
        pool = list(RHYTHM_TEMPLATES)
    scored = sorted(
        pool,
        key=lambda t: (_template_eighth_ratio(t), t.get("crossbar_bias", 0)),
        reverse=True,
    )
    top = [t for t in scored if _template_eighth_ratio(t) >= 0.55]
    if not top:
        top = scored[:5]
    return top[(bar_index * 3 + generation_seed) % len(top)]


def _chord_sequence_hash(chord_symbols: List[str]) -> str:
    seq = " | ".join(str(c).strip() for c in (chord_symbols or []) if c and str(c).strip())
    if not seq:
        seq = "?"
    return hashlib.sha256(seq.encode("utf-8")).hexdigest()


def _gce_cache_key(
    chord_symbols: List[str],
    generation_seed: int,
    bar_index: int,
    prompt_variant: str = "",
) -> str:
    base = f"{_chord_sequence_hash(chord_symbols)}:{generation_seed}:{bar_index}"
    if not prompt_variant:
        return base
    return f"{base}:{prompt_variant}"


def _root_interval_semitones(sym_a: str, sym_b: str) -> int:
    return (_root_pc(sym_b) - _root_pc(sym_a)) % 12


def _turnaround_chain_triple(chord: str, nxt: str, nn: str) -> bool:
    c, n, x = _norm_chord(chord), _norm_chord(nxt), _norm_chord(nn)
    if not c or not n or not x:
        return False
    return bool(
        _has_maj7(c)
        and _is_dom7(n)
        and _has_min7(x)
        and not _is_half_dim(x)
    )


def _tag_chord_function(
    chord_symbol: str,
    next_chord: str,
    bar_index: int,
    prev_chord: str = "",
    nn_chord: str = "",
) -> str:
    """
    Returns a function tag string for prompt injection.
    Logic:
    - If chord is dominant 7 and next chord is a 4th up
      or 5th down: tag as "V in ii-V-I"
    - If chord is minor 7 and next chord is dominant 7
      a 4th up: tag as "ii in ii-V-I"
    - If chord is major 7 and previous was V: tag as "I
      (tonic resolution)"
    - If pattern is maj7-dom7-min7-dom7 over 4 bars:
      tag all four as "turnaround chain"
    - Otherwise: tag as "interior dominant",
      "interior tonic", or "interior minor"
    """
    c = _norm_chord(chord_symbol)
    n = _norm_chord(next_chord)
    nn = _norm_chord(nn_chord)
    prev = _norm_chord(prev_chord)

    if c and n and nn and _turnaround_chain_triple(c, n, nn):
        return "turnaround chain"

    iv = _root_interval_semitones(c, n) if c and n else -1
    if _has_min7(c) and _is_dom7(n) and iv == 5:
        return "ii in ii-V-I"
    if _is_dom7(c) and n and iv == 5:
        return "V in ii-V-I"
    if _has_maj7(c) and prev and _is_dom7(prev):
        return "I (tonic resolution)"

    if _is_dom7(c) or "sus" in c.lower():
        return "interior dominant"
    if _has_maj7(c) or (c and "maj" in c.lower() and "7" in c.lower()):
        return "interior tonic"
    if _has_min7(c) or _is_min_tonic(c):
        return "interior minor"
    return "interior dominant"


def _degree_label_from_midi(midi: int, chord_sym: str) -> str:
    r = _root_pc(chord_sym)
    rel = (midi % 12 - r) % 12
    names = {
        0: "root",
        1: "b9",
        2: "9",
        3: "b3/3",
        4: "3/11",
        5: "4/11",
        6: "tritone/#11",
        7: "5",
        8: "b13",
        9: "13",
        10: "7",
        11: "7/b7",
    }
    return names.get(rel, f"alt({rel})")


def _extract_motif(notes: List[Dict[str, Any]], root_chord: str) -> Dict[str, Any]:
    """
    From the first 4 bars of generated notes, extract the
    first 3-5 pitched notes as a motif.
    Return:
    {
      'intervals': [int, ...],  # semitone intervals
      'rhythm': [str, ...],     # note types e.g. ['eighth','eighth','quarter']
      'start_degree': str       # scale degree of first note
    }
    """
    pitched = [x for x in notes if isinstance(x, dict) and not x.get("is_rest")]
    if len(pitched) < 3:
        return {"intervals": [], "rhythm": [], "start_degree": "?"}
    take = min(5, max(3, len(pitched)))
    chunk = pitched[:take]
    mids = [_midi_from_note_dict(n) for n in chunk]
    intervals = [mids[i] - mids[i - 1] for i in range(1, len(mids))]
    rhythm = [str(n.get("type", "eighth")) for n in chunk]
    start_degree = _degree_label_from_midi(mids[0], root_chord or "C")
    return {
        "intervals": intervals,
        "rhythm": rhythm,
        "start_degree": start_degree,
    }


def _append_motif_bar(notes: List[Dict[str, Any]], bar_index: int) -> None:
    """Accumulate bars 0–3 for motif extraction; store chorus motif once bar 3 lands."""
    global _MOTIF_BAR_BUFFER, _CHORUS_MOTIF, _MOTIF_ROOT_CHORD
    if bar_index > 3:
        return
    while len(_MOTIF_BAR_BUFFER) <= bar_index:
        _MOTIF_BAR_BUFFER.append([])
    _MOTIF_BAR_BUFFER[bar_index] = [dict(n) for n in notes]
    if bar_index == 3 and len(_MOTIF_BAR_BUFFER) >= 4:
        flat: List[Dict[str, Any]] = []
        for b in _MOTIF_BAR_BUFFER[:4]:
            flat.extend(b)
        _CHORUS_MOTIF = _extract_motif(flat, _MOTIF_ROOT_CHORD or "C")


def _build_rhythm_skeleton(
    bar_index: int,
    phrase_role: str,
    generation_seed: int,
) -> List[str]:
    """
    Returns a list of note durations for the bar.
    Rules:
    - phrase_role 'opening': start with eighth rest,
      then 7 eighths
    - phrase_role 'cadence' (every 4th bar):
      4 eighths then quarter then quarter
    - phrase_role 'interior': 8 eighths, but insert
      one eighth rest randomly on "and of 2" or
      "and of 3" in ~25% of bars
    - phrase_role 'turnaround': 8 eighths, no rests,
      continuous flow
    """
    pr = (phrase_role or "").strip().lower()
    if pr == "turnaround" or pr == "turn":
        return ["eighth"] * 8
    if pr == "interior":
        slot = generation_seed % 3  # 0,1,2
        if slot == 0:
            # quarter on beat 3 (slot 4)
            return ["eighth", "eighth", "eighth", "eighth", "quarter", "eighth", "eighth"]
        if slot == 1:
            # quarter on beat 2 (slot 2)
            return ["eighth", "eighth", "quarter", "eighth", "eighth", "eighth", "eighth"]
        # two quarters: beats 2 and 4
        return ["eighth", "eighth", "quarter", "eighth", "quarter", "eighth", "eighth"]
    if pr == "launch" or pr == "opening":
        return ["eighth_rest"] + ["eighth"] * 7
    if (bar_index % 4) == 3 or pr == "cadence":
        return ["eighth"] * 4 + ["quarter"] * 2
    rng = random.Random(generation_seed + bar_index * 31)
    sk = ["eighth"] * 8
    if rng.random() < 0.25:
        pos = 3 if rng.random() < 0.5 else 5
        sk[pos] = "eighth_rest"
    return sk


def _prompt_variant_hash(
    tag: str,
    skeleton: List[str],
    motif_line: str,
) -> str:
    h = hashlib.sha256(
        f"{tag}|{skeleton}|{motif_line}".encode("utf-8")
    ).hexdigest()
    return h[:16]


def _extract_json_array(text: str) -> Optional[str]:
    if not text:
        return None
    s = text.strip()
    fence = _re.search(r"```(?:json)?\s*(\[[\s\S]*?\])\s*```", s, _re.IGNORECASE)
    if fence:
        return fence.group(1).strip()
    lo = s.find("[")
    hi = s.rfind("]")
    if lo < 0 or hi <= lo:
        return None
    return s[lo : hi + 1]


def _extract_json_object(text: str) -> Optional[str]:
    if not text:
        return None
    s = text.strip()
    lo = s.find("{")
    if lo < 0:
        return None
    decoder = json.JSONDecoder()
    try:
        _, end = decoder.raw_decode(s[lo:])
        return s[lo : lo + end]
    except json.JSONDecodeError:
        return None


def _phrase_role_for_bar_local(bar_idx: int, total_bars: int) -> str:
    pos = bar_idx % 8
    if pos == 0:
        return "launch"
    if pos >= 6:
        return "ending"
    if total_bars >= 16 and bar_idx >= total_bars - 2:
        return "turnaround"
    return "continuation"


def _motif_line_for_bar_index(bar_index: int) -> str:
    global _CHORUS_MOTIF
    if bar_index not in (8, 16, 24) or not _CHORUS_MOTIF:
        return ""
    m = _CHORUS_MOTIF
    return (
        f'Motif to reuse or vary: interval sequence {m["intervals"]}, '
        f'rhythm {m["rhythm"]}. Transpose to fit current chord. '
        "You may displace by 1-2 eighths or invert the contour."
    )


def _retrieve_parker_templates(
    function_tag: str,
    phrase_role: str,
    n: int = 2,
) -> list[dict]:
    """
    Returns up to n templates matching function_tag and
    phrase_role. Falls back to function_tag match only
    if no role match found.
    """
    matches = [
        t
        for t in PARKER_RAG_TEMPLATES
        if t["function"] == function_tag and t["role"] == phrase_role
    ]
    if not matches:
        matches = [t for t in PARKER_RAG_TEMPLATES if t["function"] == function_tag]
    if not matches:
        matches = PARKER_RAG_TEMPLATES[:2]
    return matches[:n]


def _retrieve_concrete_phrases(function_tag: str, n: int = 1) -> list[dict]:
    """
    Maps function_tag to PARKER_CONCRETE_PHRASES key and
    returns up to n concrete phrase examples.
    """
    key_map = {
        "ii in ii-V-I": "ii-V",
        "iiø in iiø-V": "iiø-V",
        "V in ii-V-I": "V-I",
        "interior-tonic": "interior-tonic",
        "I (tonic resolution)": "interior-tonic",
        "turnaround chain": "turnaround",
        "turnaround": "turnaround",
    }
    key = key_map.get(function_tag)
    if not key:
        low = function_tag.lower()
        for k in PARKER_CONCRETE_PHRASES:
            if k.lower() in low:
                key = k
                break
    if not key:
        return []
    return PARKER_CONCRETE_PHRASES.get(key, [])[:n]


def _coerce_float_alter(v: Any) -> float:
    if v is None:
        return 0.0
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def _normalize_claude_note(obj: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(obj, dict):
        return None
    is_rest = bool(obj.get("is_rest"))
    try:
        dur = int(obj.get("duration", 0))
    except (TypeError, ValueError):
        return None
    if dur < 1:
        return None
    triplet = bool(obj.get("triplet", False))
    if is_rest:
        return _note_shape(dur, is_rest=True, triplet=triplet)
    pitch_raw = obj.get("pitch", "C")
    step = str(pitch_raw).strip()
    if not step:
        step = "C"
    step = step[0].upper()
    if step.lower() not in NOTE_TO_PC:
        return None
    try:
        octv = int(obj.get("octave", 4))
    except (TypeError, ValueError):
        octv = 4
    alter = _coerce_float_alter(obj.get("alter", 0))
    raw_midi = None
    for m in range(12 * 5, 12 * 11):
        s, al, o = _spell_pitch(m)
        if s == step and abs(al - alter) < 0.01 and o == octv:
            raw_midi = m
            break
    if raw_midi is None:
        pc = (NOTE_TO_PC[step.lower()] + int(round(alter))) % 12
        raw_midi = 12 * (octv + 1) + pc
    raw_midi = max(_MIDI_LO, min(_MIDI_HI, int(raw_midi)))
    step, alter, octv = _spell_pitch(raw_midi)
    return _note_shape(dur, is_rest=False, step=step, alter=alter, octv=octv, triplet=triplet)


def _fit_sixteen_divisions(notes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out = [dict(n) for n in notes if isinstance(n, dict)]
    total = sum(int(n.get("duration", 0)) for n in out)
    while total > 16 and out:
        excess = total - 16
        last = out[-1]
        ld = int(last.get("duration", 0))
        if ld > excess:
            new_d = ld - excess
            is_r = bool(last.get("is_rest"))
            if is_r:
                out[-1] = _note_shape(new_d, is_rest=True, triplet=bool(last.get("triplet")))
            else:
                out[-1] = _note_shape(
                    new_d,
                    is_rest=False,
                    step=str(last["pitch"]),
                    alter=float(last.get("alter", 0.0)),
                    octv=int(last["octave"]),
                    triplet=bool(last.get("triplet")) and new_d <= 1,
                )
            total = 16
            break
        out.pop()
        total -= ld
    if total < 16:
        out.append(_note_shape(16 - total, is_rest=True))
    return out


def _patch_unison_runs(
    notes: List[Dict[str, Any]],
    generation_seed: int,
) -> List[Dict[str, Any]]:
    """Break runs of 3+ consecutive identical MIDI pitches (pitched notes only)."""
    out = [dict(n) for n in notes]
    direction = 1 if (generation_seed % 2) == 0 else -1
    for _ in range(32):
        changed = False
        i = 0
        while i < len(out):
            if out[i].get("is_rest"):
                i += 1
                continue
            m0 = _midi_from_note_dict(out[i])
            run_idx: List[int] = [i]
            j = i + 1
            while j < len(out):
                if out[j].get("is_rest"):
                    break
                if _midi_from_note_dict(out[j]) != m0:
                    break
                run_idx.append(j)
                j += 1
            if len(run_idx) < 3:
                i += 1
                continue
            for r in range(2, len(run_idx)):
                idx = run_idx[r]
                dsemi = 1 + ((generation_seed // 2) + r) % 2
                m = _midi_from_note_dict(out[idx])
                m2 = m + direction * dsemi
                m2 = max(_MIDI_LO, min(_MIDI_HI, m2))
                if m2 == m:
                    m2 = max(_MIDI_LO, min(_MIDI_HI, m - direction * dsemi))
                s, al, oc = _spell_pitch(m2)
                d = int(out[idx]["duration"])
                trip = bool(out[idx].get("triplet"))
                out[idx] = _note_shape(
                    d, is_rest=False, step=s, alter=al, octv=oc, triplet=trip
                )
                changed = True
            i = run_idx[-1] + 1
        if not changed:
            break
    return out


def _cap_unison_frequency(notes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    If unison intervals exceed 3% of all consecutive pitched intervals,
    detune every unison pair beyond the first with alternating +/- 1 semitone.
    """
    out = [dict(n) for n in notes]
    idxs = [i for i, n in enumerate(out) if not n.get("is_rest")]
    if len(idxs) < 2:
        return out
    total_iv = len(idxs) - 1
    uni_second: List[int] = []
    for k in range(total_iv):
        i0, i1 = idxs[k], idxs[k + 1]
        if _midi_from_note_dict(out[i0]) == _midi_from_note_dict(out[i1]):
            uni_second.append(i1)
    if uni_second and total_iv > 0 and (len(uni_second) / total_iv) > 0.03:
        for j, note_i in enumerate(uni_second):
            if j <= 0:
                continue
            n = out[note_i]
            delta = 1 if (j % 2) == 0 else -1
            m = _midi_from_note_dict(n) + delta
            m = max(_MIDI_LO, min(_MIDI_HI, m))
            s, al, oc = _spell_pitch(m)
            d = int(n["duration"])
            trip = bool(n.get("triplet"))
            out[note_i] = _note_shape(
                d, is_rest=False, step=s, alter=al, octv=oc, triplet=trip
            )
    return out


def _enforce_opening_rest(
    notes: List[Dict[str, Any]],
    phrase_role: str,
    bar_index: int,
) -> List[Dict[str, Any]]:
    pr = (phrase_role or "").strip().lower()
    if pr not in ("opening", "launch") and bar_index not in (0, 8, 16, 24):
        return notes
    out = [dict(n) for n in notes]
    if not out or out[0].get("is_rest"):
        return out
    out.insert(0, _note_shape(2, is_rest=True))
    total = sum(int(n.get("duration", 0)) for n in out)
    excess = total - 16
    while excess > 0 and out:
        last = out[-1]
        ld = int(last.get("duration", 0))
        if ld <= excess:
            excess -= ld
            out.pop()
        else:
            new_d = ld - excess
            if last.get("is_rest"):
                out[-1] = _note_shape(
                    new_d, is_rest=True, triplet=bool(last.get("triplet"))
                )
            else:
                out[-1] = _note_shape(
                    new_d,
                    is_rest=False,
                    step=str(last["pitch"]),
                    alter=float(last.get("alter", 0.0)),
                    octv=int(last["octave"]),
                    triplet=bool(last.get("triplet")) and new_d <= 1,
                )
            excess = 0
    return out


def _enforce_cadence_quarter(
    notes: List[Dict[str, Any]],
    bar_index: int,
) -> List[Dict[str, Any]]:
    if (bar_index % 4) != 3:
        return notes
    out = [dict(n) for n in notes]
    if any(int(n.get("duration", 0)) >= 4 for n in out):
        return out
    if len(out) < 7:
        return out
    n4 = out[4]
    if n4.get("is_rest"):
        return out
    m = _midi_from_note_dict(n4)
    s, al, oc = _spell_pitch(m)
    quarter = _note_shape(4, is_rest=False, step=s, alter=al, octv=oc, triplet=False)
    new_list = out[:4] + [quarter] + out[7:]
    return new_list


def _enforce_syncopation(
    notes: List[Dict[str, Any]],
    bar_index: int,
    generation_seed: int,
) -> List[Dict[str, Any]]:
    """
    Shifts phrase forward by one eighth in ~40% of interior
    bars to create offbeat phrase starts.
    """
    # Apply to all interior, non-cadence bars.
    if bar_index % 4 == 3:
        return notes
    if bar_index in (0, 8, 16, 24):
        return notes

    pitched = [n for n in notes if not n.get("is_rest")]
    if not pitched:
        return notes

    first = notes[0]
    if first.get("is_rest"):
        return notes

    rng = random.Random(generation_seed + bar_index * 17)
    if rng.random() >= 0.4:
        return notes

    eighth_rest = _note_shape(2, is_rest=True)
    shifted = [eighth_rest] + [dict(n) for n in notes[:-1]]
    return shifted


def _enforce_midphrase_quarter(
    notes: List[Dict[str, Any]],
    bar_index: int,
    generation_seed: int,
) -> List[Dict[str, Any]]:
    """
    In interior bars (not cadence, not opening),
    force a quarter note landing mid-phrase.
    Runs on bars where generation_seed % 3 != 2
    (roughly 2/3 of interior bars).
    """
    if bar_index % 4 == 3:
        return notes
    if bar_index in (0, 8, 16, 24):
        return notes
    if generation_seed % 3 == 2:
        return notes

    pitched = [i for i, n in enumerate(notes) if not n.get("is_rest")]
    if len(pitched) < 5:
        return notes

    # Target slot 4 (beat 3) or slot 2 (beat 2)
    target = 4 if generation_seed % 2 == 0 else 2
    if target >= len(notes):
        return notes
    if notes[target].get("is_rest"):
        return notes

    # Merge notes[target] and notes[target+1] into a quarter
    if target + 1 < len(notes) and not notes[target + 1].get("is_rest"):
        quarter = dict(notes[target])
        quarter["duration"] = 4
        quarter["type"] = "quarter"
        quarter["dot"] = False
        new_notes = notes[:target] + [quarter] + notes[target + 2 :]
        return _fit_sixteen_divisions(new_notes)
    return notes


def _apply_post_validators(
    notes: List[Dict[str, Any]],
    phrase_role: str,
    bar_index: int,
    generation_seed: int,
) -> List[Dict[str, Any]]:
    n = _patch_unison_runs(notes, generation_seed)
    n = _cap_unison_frequency(n)
    n = _enforce_opening_rest(n, phrase_role, bar_index)
    n = _enforce_syncopation(n, bar_index, generation_seed)
    n = _enforce_midphrase_quarter(n, bar_index, generation_seed)
    n = _enforce_cadence_quarter(n, bar_index)
    return _fit_sixteen_divisions(n)


_GCE_SYSTEM_PROMPT = """You are Charlie Parker's fingers on the alto saxophone.
You do not follow rules. You play bebop.
"""


def _build_claude_prompt(
    chord_symbols: List[str],
    phrase_role: str,
    bar_index: int,
    *,
    function_tag: str,
    rhythm_skeleton: List[str],
    motif_line: str,
) -> str:
    chord_string = " | ".join(
        str(c).strip() for c in (chord_symbols or []) if c and str(c).strip()
    )
    if not chord_string:
        chord_string = "Cmaj7"
    sk_txt = ", ".join(rhythm_skeleton)
    skeleton_line = (
        f"Rhythm skeleton for this bar: [{sk_txt}]. "
        "Fill in pitches. Do not change the rhythm unless musically essential."
    )
    motif_block = motif_line.strip() if motif_line else ""
    return f"""Chord: {chord_string}
Bar: {bar_index} | Role: {phrase_role} | {function_tag}
{motif_block}
{skeleton_line}

Play a Charlie Parker bebop line over these changes.

You are Bird. Not a rule-follower. Not a textbook.
You anticipate chord changes by 1-2 eighths before the
barline. You start phrases on offbeats. You land on the
3rd or 7th of each chord, never the root. You use the
bebop scale with chromatic passing tones. You encircle
chord tones from above and below. You leap a 6th or
tritone and then fill back down stepwise. You play
over barlines like they don't exist. You breathe —
rests are part of the line, not gaps in it.

Your lines have shape: they climb, peak, and descend.
They start low or mid, peak around bar 2-3, and resolve
down. Or they explode high immediately and tumble down
chromatically. Never meander at one register.

On ii: enter on the 9th or 3rd.
On V: target the 3rd or b9, approach chromatically.
On I: resolve to 3rd or 5th, then keep moving.
On turnaround: one continuous line across all four chords,
treat VI as a dominant.

Use triplets as punctuation — a quick 3-note burst then
back to eighths. Not randomly. At peaks and cadences.

Do not be polite. Do not be safe. Play like you invented
this music because you did.

Return ONLY a JSON array of note objects:
[{{"pitch":"D","octave":4,"alter":0,"duration":2,
"type":"eighth","is_rest":false,"triplet":false,
"dot":false,"is_chord":false}}]

Rests: {{"pitch":"","octave":0,"alter":0,"duration":2,
"type":"eighth","is_rest":true,"triplet":false,
"dot":false,"is_chord":false}}
"""


def _claude_response_text(response: Any) -> str:
    blocks = getattr(response, "content", None) or []
    parts: List[str] = []
    for b in blocks:
        t = getattr(b, "text", None)
        if t:
            parts.append(str(t))
    return "".join(parts)


def _section_cache_key(
    section_label: str,
    chord_symbols: List[str],
    generation_seed: int,
) -> str:
    raw = section_label + ",".join(str(c).strip() for c in chord_symbols) + str(
        generation_seed
    )
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _build_section_prompt(
    chord_symbols: List[str],
    section_label: str,
    bar_start: int,
    function_tags: List[str],
    rhythm_skeletons: List[List[str]],
    motif_line: str,
) -> str:
    chords_lines = "\n".join(
        f"{i + 1}. {chord_symbols[i]}" for i in range(8)
    )
    func_lines = "\n".join(f"{i + 1}. {function_tags[i]}" for i in range(8))
    sk_lines = "\n".join(
        f"{i + 1}. [{', '.join(rhythm_skeletons[i])}]" for i in range(8)
    )
    dominant_function_raw = Counter(function_tags).most_common(1)[0][0]
    dominant_lower = dominant_function_raw.lower()
    if "ii-v-i" in dominant_lower:
        dominant_function = "ii-V-I"
    elif "turnaround" in dominant_lower:
        dominant_function = "turnaround"
    elif "interior dominant" in dominant_lower:
        dominant_function = "interior-dominant"
    elif "interior tonic" in dominant_lower:
        dominant_function = "interior-tonic"
    elif dominant_lower.startswith("v "):
        dominant_function = "V-I"
    else:
        dominant_function = "ii-V-I"
    section_role = (
        "opening" if bar_start == 0 else "cadence" if bar_start == 24 else "continuation"
    )
    templates = _retrieve_parker_templates(dominant_function, section_role)
    template_block = "\n".join(
        [
            f"Parker template ({t['function']}, {t['role']}, {t['contour']}): "
            f"intervals={t['intervals']}, enter on {t['entry_degree']}, "
            f"target {t['target_degree']} at {t['target_beat']}. "
            f"{t['description']}"
            for t in templates
        ]
    )
    rag_block = (
        "Real Parker phrase templates for this context:\n"
        f"{template_block}\n"
        "Generate new lines that echo these shapes without\n"
        "copying them literally. Use the interval patterns\n"
        "and target degrees as guides, not as transcriptions.\n\n"
    )
    concrete_lines: List[str] = []
    for i in range(0, 8, 2):
        if len(concrete_lines) >= 3:
            break
        pair_tags = function_tags[i : i + 2]
        dominant_pair_tag = Counter(pair_tags).most_common(1)[0][0]
        picks = _retrieve_concrete_phrases(dominant_pair_tag, n=1)
        if not picks:
            continue
        p = picks[0]
        note_names: List[str] = []
        for n in p.get("notes", []):
            if n.get("is_rest"):
                continue
            pitch = str(n.get("pitch", "")).strip().upper()[:1]
            if pitch not in NOTE_TO_PC:
                continue
            octv = int(n.get("octave", 4))
            note_names.append(f"{pitch}{octv}")
            if len(note_names) >= 6:
                break
        notes_preview = " ".join(note_names) if note_names else "N/A"
        concrete_lines.append(
            f"Real Bird phrase over {p.get('chord_context', 'unknown context')}\n"
            f"(entry: {p.get('entry_degree', '?')}, contour: {p.get('contour', '?')}):\n"
            f"Interval sequence: {p.get('intervals', [])}\n"
            "Note sequence (transpose to match your chord):\n"
            f"{notes_preview}\n"
            "Echo this shape and vocabulary. Do not copy literally —\n"
            "transpose to your chord context and vary the rhythm."
        )
    concrete_block = ""
    if concrete_lines:
        concrete_block = "\n\n".join(concrete_lines) + "\n\n"
    motif_block = (motif_line.strip() + "\n\n") if motif_line.strip() else ""
    return f"""Section: {section_label} | Bars {bar_start + 1}–{bar_start + 8}
Chords (one per bar):
{chords_lines}
Function tags (one per bar):
{func_lines}
Rhythm skeletons (one per bar):
{sk_lines}
{rag_block}\
{concrete_block}\
{motif_block}You are Charlie Parker. Generate a complete 8-bar bebop
phrase over these changes as one continuous musical thought.

Think in arcs:
- Where does this phrase start, peak, and resolve?
- Which chord changes do you anticipate early?
- Where do you breathe?
- What is the overall contour — descending, arch, climb?

Play across barlines. Start phrases on offbeats.
Land on 3rds and 7ths. Use chromatic approaches.
Leap a 6th or tritone then fill back down stepwise.
On turnarounds, play one continuous dominant chain.
Breathe — rests are part of the line.

Return ONLY a JSON object:
{{
  "bars": [
    {{"bar": 1, "notes": [...]}},
    {{"bar": 2, "notes": [...]}},
    {{"bar": 3, "notes": [...]}},
    {{"bar": 4, "notes": [...]}},
    {{"bar": 5, "notes": [...]}},
    {{"bar": 6, "notes": [...]}},
    {{"bar": 7, "notes": [...]}},
    {{"bar": 8, "notes": [...]}}
  ]
}}

Each notes array uses the same schema as before:
[{{"pitch":"D","octave":4,"alter":0,"duration":2,
"type":"eighth","is_rest":false,"triplet":false,
"dot":false,"is_chord":false}}]

All 8 bars must be present. Each bar must sum to
exactly 16 divisions.
"""


def _parse_section_json_to_bars(text: str) -> Optional[List[List[Dict[str, Any]]]]:
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    bars = data.get("bars")
    if not isinstance(bars, list) or len(bars) != 8:
        return None
    out: List[List[Dict[str, Any]]] = []
    for b in bars:
        if not isinstance(b, dict):
            return None
        notes_raw = b.get("notes")
        if not isinstance(notes_raw, list):
            return None
        notes: List[Dict[str, Any]] = []
        for item in notes_raw:
            n = _normalize_claude_note(item)
            if n:
                notes.append(n)
        if not notes:
            return None
        notes = _fit_sixteen_divisions(notes)
        if sum(int(x["duration"]) for x in notes) != 16:
            return None
        if not any(not x.get("is_rest") for x in notes):
            return None
        out.append(notes)
    return out


def _generate_parker_section_via_claude(
    chord_symbols: List[str],
    section_label: str,
    bar_start: int,
    generation_seed: int,
    total_bars: int,
) -> Optional[List[List[Dict[str, Any]]]]:
    try:
        import anthropic
    except ImportError:
        return None
    ch8 = [str(c).strip() for c in chord_symbols[:8]]
    while len(ch8) < 8:
        ch8.append(ch8[-1] if ch8 else "Cmaj7")
    ch8 = ch8[:8]
    function_tags: List[str] = []
    rhythm_skeletons: List[List[str]] = []
    for i in range(8):
        bar_idx = bar_start + i
        c0 = ch8[i]
        nxt = ch8[(i + 1) % 8]
        nn = ch8[(i + 2) % 8]
        prev = ch8[i - 1] if i > 0 else (_GCE_PREV_CHORD if bar_start > 0 else "")
        function_tags.append(
            _tag_chord_function(c0, nxt, bar_idx, prev_chord=prev, nn_chord=nn)
        )
        phrase_role = _phrase_role_for_bar_local(bar_idx, total_bars)
        hctx = detect_harmonic_context(c0, nxt, nn)
        if hctx == "turnaround" and phrase_role not in ("ending", "launch"):
            phrase_role = "turnaround"
        gen_seed_i = generation_seed + bar_idx * 17
        rhythm_skeletons.append(
            _build_rhythm_skeleton(bar_idx, phrase_role, gen_seed_i)
        )
    motif_line = _motif_line_for_bar_index(bar_start)
    prompt = _build_section_prompt(
        ch8,
        section_label,
        bar_start,
        function_tags,
        rhythm_skeletons,
        motif_line,
    )
    try:
        client = anthropic.Anthropic()
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=8192,
            temperature=1.2,
            system=_GCE_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_text = _claude_response_text(response)
        jo = _extract_json_object(raw_text)
        if not jo:
            return None
        return _parse_section_json_to_bars(jo)
    except Exception:
        return None


def generate_parker_section(
    chord_symbols: List[str],
    section_label: str,
    bar_start: int,
    generation_seed: int,
    *,
    total_bars: int = 32,
    start_pitch: int = 67,
) -> List[List[Dict[str, Any]]]:
    """
    Generates an entire 8-bar section in one GCE call.
    Returns a list of 8 note lists (one per bar).
    Falls back to calling generate_parker_phrase() 8x
    if GCE fails or returns invalid JSON.
    """
    global _GCE_PREV_CHORD, _MOTIF_BAR_BUFFER, _MOTIF_ROOT_CHORD, _CHORUS_MOTIF

    ch8 = [str(c).strip() for c in chord_symbols if c and str(c).strip()]
    while len(ch8) < 8:
        ch8.append(ch8[-1] if ch8 else "Cmaj7")
    ch8 = ch8[:8]

    if bar_start == 0:
        _GCE_PREV_CHORD = ""
        _MOTIF_BAR_BUFFER = []
        _MOTIF_ROOT_CHORD = ch8[0]
        _CHORUS_MOTIF = None

    cache_key = _section_cache_key(section_label, ch8, generation_seed)
    cached = _SECTION_CACHE.get(cache_key)
    if cached is not None:
        out = [[dict(n) for n in bar] for bar in cached]
        _GCE_PREV_CHORD = ch8[-1]
        for i in range(8):
            _append_motif_bar(out[i], bar_start + i)
        return out

    gce_bars = _generate_parker_section_via_claude(
        ch8,
        section_label,
        bar_start,
        generation_seed,
        total_bars,
    )

    result: List[List[Dict[str, Any]]] = []
    sp = start_pitch

    for i in range(8):
        bar_idx = bar_start + i
        c0 = ch8[i]
        nxt = ch8[(i + 1) % 8]
        nn = ch8[(i + 2) % 8]
        window = [c0, nxt, nn]
        phrase_role = _phrase_role_for_bar_local(bar_idx, total_bars)
        hctx = detect_harmonic_context(c0, nxt, nn)
        if hctx == "turnaround" and phrase_role not in ("ending", "launch"):
            phrase_role = "turnaround"
        gen_seed_i = generation_seed + bar_idx * 17
        section_index = bar_idx // 8

        bar_notes: Optional[List[Dict[str, Any]]] = None
        # Always run post-validators on every parsed GCE bar before acceptance.
        if gce_bars is not None and i < len(gce_bars):
            try:
                raw = [dict(n) for n in gce_bars[i]]
                v = _apply_post_validators(raw, phrase_role, bar_idx, gen_seed_i)
                v = _maybe_half_note_bar_end(v, bar_idx)
                if any(not n.get("is_rest") for n in v):
                    bar_notes = v
            except Exception:
                bar_notes = None

        if bar_notes is None:
            notes, sp = generate_parker_phrase(
                window,
                phrase_role,
                sp,
                gen_seed_i,
                section_index,
                bar_idx,
            )
            bar_notes = notes
        else:
            pitched = [n for n in bar_notes if not n.get("is_rest")]
            if pitched:
                sp = _midi_from_note_dict(pitched[-1])
            _append_motif_bar(bar_notes, bar_idx)

        result.append(bar_notes)

    _SECTION_CACHE[cache_key] = [[dict(n) for n in bar] for bar in result]
    _GCE_PREV_CHORD = ch8[-1]

    return result


def _generate_parker_phrase_via_claude(
    chord_symbols: List[str],
    phrase_role: str,
    start_pitch: int,
    generation_seed: int,
    section_index: int,
    bar_index: int,
    prev_chord: str,
    motif_line: str,
) -> Optional[List[Dict[str, Any]]]:
    try:
        import anthropic
    except ImportError:
        return None
    c0 = chord_symbols[0] if chord_symbols else "Cmaj7"
    nxt = chord_symbols[1] if len(chord_symbols) > 1 else ""
    nn = chord_symbols[2] if len(chord_symbols) > 2 else ""
    function_tag = _tag_chord_function(
        c0,
        nxt,
        bar_index,
        prev_chord=prev_chord,
        nn_chord=nn,
    )
    rhythm_skeleton = _build_rhythm_skeleton(
        bar_index,
        phrase_role,
        generation_seed,
    )
    prompt = _build_claude_prompt(
        chord_symbols,
        phrase_role,
        bar_index,
        function_tag=function_tag,
        rhythm_skeleton=rhythm_skeleton,
        motif_line=motif_line,
    )
    try:
        client = anthropic.Anthropic()
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            temperature=1.2,
            system=_GCE_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_text = _claude_response_text(response)
        js = _extract_json_array(raw_text)
        if not js:
            return None
        data = json.loads(js)
        if not isinstance(data, list):
            return None
        notes: List[Dict[str, Any]] = []
        for item in data:
            n = _normalize_claude_note(item)
            if n:
                notes.append(n)
        if not notes:
            return None
        notes = _fit_sixteen_divisions(notes)
        if sum(int(x["duration"]) for x in notes) != 16:
            return None
        pitched = [x for x in notes if not x.get("is_rest")]
        if not pitched:
            return None
        return notes
    except Exception:
        return None


def _generate_parker_phrase_deterministic(
    chord_symbols: List[str],
    phrase_role: str,
    start_pitch: int,
    generation_seed: int,
    section_index: int = 0,
    bar_index: int = 0,
) -> Tuple[List[Dict[str, Any]], int]:
    rng = random.Random(generation_seed)
    chord = chord_symbols[0] if chord_symbols else "Cmaj7"
    nxt = chord_symbols[1] if len(chord_symbols) > 1 else ""
    nn = chord_symbols[2] if len(chord_symbols) > 2 else ""

    hctx = detect_harmonic_context(chord, nxt, nn)
    role_rhythm = phrase_role
    up = detect_harmonic_context(nxt, nn, "")
    if rng.random() < 0.25 and (
        up in ("tonic_major", "tonic_minor", "I", "V", "dominant")
        or hctx == "turnaround"
    ):
        role_rhythm = "anticipation"

    want_triplet = ((bar_index + generation_seed + section_index) % 4) in (0, 2)

    if section_index == 2 and (bar_index % 8) == 0:
        main_key = "bridge_launch"
    elif phrase_role == "ending" or role_rhythm == "ending":
        main_key = "phrase_endings"
    else:
        main_key = hctx if hctx in PARKER_VOCABULARY else "dominant"

    phrase_key = _phrase_group_key(section_index, bar_index)
    rest_period = 4 + (abs(generation_seed) % 5)
    should_rest_open = (
        bar_index > 0
        and (bar_index % rest_period == 0)
        and rng.random() < 0.3
    )

    _, main_pat = _pick_main_pattern_entry(main_key, generation_seed, rng, phrase_key)

    notes: List[Dict[str, Any]] = []
    prev_midi = start_pitch

    for rebuild in range(4):
        if rebuild == 0 and want_triplet:
            template = _pick_triplet_template(phrase_role, bar_index, generation_seed)
        elif rebuild == 0:
            template = select_rhythm_template(
                bar_index, role_rhythm, generation_seed, hctx
            )
            if _template_eighth_ratio(template) < 0.5:
                template = _pick_eighth_heavy_template(
                    role_rhythm, bar_index, generation_seed
                )
        else:
            template = _pick_eighth_heavy_template(
                role_rhythm,
                bar_index + rebuild,
                generation_seed + rebuild * 29,
            )

        offset = 1 if template.get("starts_on") == "and" else 0
        strong_set = {
            i
            for i, d in enumerate(template["durations"])
            if d is not None and float(d) >= 0.5 and (i + offset) % 2 == 0
        }
        weak_set = {
            i
            for i, d in enumerate(template["durations"])
            if d is not None and float(d) <= 0.5 and (i + offset) % 2 == 1
        }
        if template.get("triplet_count", 0) > 0:
            strong_set |= set(get_strong_positions(template))
            weak_set = {i for i in weak_set if i not in strong_set}
        if not strong_set:
            strong_set = set(get_strong_positions(template))
        if not weak_set:
            weak_set = set(get_weak_positions(template)) - strong_set

        notes = []
        prev_midi = start_pitch
        strong_attack = 0

        for i, d in enumerate(template["durations"]):
            if d is None:
                rest_beats = 0.5
                dur = beats_to_divisions(rest_beats, DIVISIONS)
                notes.append(_note_shape(dur, is_rest=True))
                continue

            beats = float(d)
            is_trip = _is_triplet_beat(beats) or (
                template.get("triplet_count", 0) > 0 and 0.3 < beats < 0.5
            )
            dur = 1 if is_trip else beats_to_divisions(beats, DIVISIONS)

            if i in strong_set:
                iv = main_pat[strong_attack % len(main_pat)]
                strong_attack += 1
                raw_midi = _midi_for_interval(chord, iv, generation_seed + i * 13)
                src = "chord_tone"
            else:
                if rng.random() < 0.5:
                    mic = get_pattern("enclosures", generation_seed + i * 17)
                else:
                    mic = get_pattern("approach_cells", generation_seed + i * 19)
                iv = mic[(generation_seed + i * 3) % len(mic)]
                raw_midi = _midi_for_interval(chord, iv, generation_seed + i * 13)
                src = "approach"

            midi = _snap_register(prev_midi, raw_midi)
            prev_midi = midi
            step, alter, octv = _spell_pitch(midi)
            n = _note_shape(
                dur, is_rest=False, step=step, alter=alter, octv=octv, triplet=is_trip
            )
            if src == "approach":
                n["approach"] = True
            notes.append(n)

        attacks = [n for n in notes if not n.get("is_rest")]
        eighth_like = [
            n
            for n in attacks
            if int(n["duration"]) == 2
            or (bool(n.get("triplet")) and int(n["duration"]) <= 1)
        ]
        if not attacks or (len(eighth_like) / len(attacks)) >= 0.55:
            break

    if should_rest_open:
        notes = _prepend_quarter_rest_trim(notes)
    notes = _maybe_half_note_bar_end(notes, bar_index)
    attacks = [n for n in notes if not n.get("is_rest")]
    if attacks:
        prev_midi = _midi_from_note_dict(attacks[-1])
    else:
        prev_midi = start_pitch

    return notes, prev_midi


def generate_parker_phrase(
    chord_symbols: List[str],
    phrase_role: str,
    start_pitch: int,
    generation_seed: int,
    section_index: int = 0,
    bar_index: int = 0,
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Build one bar of notes plus carried register using Claude (GCE) when available,
    else deterministic vocabulary/rhythm. Note dicts match parker_section_compiler.

    Primary melody output is the note list; return value includes carried MIDI register
    for the next bar (parker_section_compiler contract).
    """
    global _GCE_PREV_CHORD, _MOTIF_BAR_BUFFER, _MOTIF_ROOT_CHORD, _CHORUS_MOTIF

    if bar_index == 0:
        _GCE_PREV_CHORD = ""
        _MOTIF_BAR_BUFFER = []
        _MOTIF_ROOT_CHORD = chord_symbols[0] if chord_symbols else "Cmaj7"
        _CHORUS_MOTIF = None

    prev = _GCE_PREV_CHORD if bar_index > 0 else ""
    c0 = chord_symbols[0] if chord_symbols else "Cmaj7"
    nxt = chord_symbols[1] if len(chord_symbols) > 1 else ""
    nn = chord_symbols[2] if len(chord_symbols) > 2 else ""
    function_tag = _tag_chord_function(
        c0,
        nxt,
        bar_index,
        prev_chord=prev,
        nn_chord=nn,
    )
    motif_line = ""
    if bar_index in (8, 16, 24) and _CHORUS_MOTIF:
        m = _CHORUS_MOTIF
        motif_line = (
            f'Motif to reuse or vary: interval sequence {m["intervals"]}, '
            f'rhythm {m["rhythm"]}. Transpose to fit current chord. '
            "You may displace by 1-2 eighths or invert the contour."
        )
    rhythm_skeleton = _build_rhythm_skeleton(
        bar_index,
        phrase_role,
        generation_seed,
    )
    prompt_variant = _prompt_variant_hash(
        function_tag,
        rhythm_skeleton,
        motif_line,
    )
    key = _gce_cache_key(chord_symbols, generation_seed, bar_index, prompt_variant)

    gce_notes: Optional[List[Dict[str, Any]]] = _GCE_CACHE.get(key)

    if gce_notes is None:
        gce_notes = _generate_parker_phrase_via_claude(
            chord_symbols,
            phrase_role,
            start_pitch,
            generation_seed,
            section_index,
            bar_index,
            prev,
            motif_line,
        )
        if gce_notes is not None:
            _GCE_CACHE[key] = [dict(n) for n in gce_notes]

    if gce_notes is not None:
        notes = [dict(n) for n in gce_notes]
        notes = _apply_post_validators(notes, phrase_role, bar_index, generation_seed)
        notes = _maybe_half_note_bar_end(notes, bar_index)
        attacks = [n for n in notes if not n.get("is_rest")]
        if attacks:
            next_pitch = _midi_from_note_dict(attacks[-1])
        else:
            next_pitch = start_pitch
        _append_motif_bar(notes, bar_index)
        _GCE_PREV_CHORD = c0
        return notes, next_pitch

    notes, next_pitch = _generate_parker_phrase_deterministic(
        chord_symbols,
        phrase_role,
        start_pitch,
        generation_seed,
        section_index,
        bar_index,
    )
    notes = _apply_post_validators(notes, phrase_role, bar_index, generation_seed)
    attacks = [n for n in notes if not n.get("is_rest")]
    if attacks:
        next_pitch = _midi_from_note_dict(attacks[-1])
    else:
        next_pitch = start_pitch
    _append_motif_bar(notes, bar_index)
    _GCE_PREV_CHORD = c0
    return notes, next_pitch
