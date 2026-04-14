"""Phrase-level melody generation for the Thelonious Monk engine."""

from __future__ import annotations

from collections import Counter
import hashlib
import json
import random
import re as _re
import unicodedata as _ud
from typing import Any, Dict, List, Optional, Tuple

from monk_rhythm_engine import (
    RHYTHM_TEMPLATES,
    beats_to_divisions,
    get_strong_positions,
    get_weak_positions,
    select_rhythm_template,
)
from monk_vocabulary import MONK_VOCABULARY, get_pattern

DIVISIONS = 4
# One 4/4 bar in divisions; must match monk_musicxml_exporter (DIVISIONS=4 → CAPACITY=16).
CAPACITY = DIVISIONS * 4

# Alto register (Monk): clamp all phrase MIDI to this span.
_MIDI_LO = 58
_MIDI_HI = 82

NOTE_TO_PC = {"c": 0, "d": 2, "e": 4, "f": 5, "g": 7, "a": 9, "b": 11}
# Natural letter → PC; accidentals from _parse_root. Bb = B(11) + flat(-1) ≡ 10 (mod 12).
_LETTER_PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}

# Per (section, 4-bar phrase): last main pattern id and contour sign for alternation.
_last_pattern_id: Dict[Tuple[int, int], str] = {}
_last_contour_sign: Dict[Tuple[int, int], int] = {}

# GCE (Claude): cache keyed by chord_sequence_hash + generation_seed (deterministic replay).
_GCE_CACHE: Dict[str, List[Dict[str, Any]]] = {}

# GCE: full 8-bar section cache (sha256 of label + chords + seed).
_SECTION_CACHE: Dict[str, List[List[Dict[str, Any]]]] = {}
# GCE: full 32-bar chorus cache (sha256 of "chorus" + chords + seed).
_CHORUS_CACHE: Dict[str, List[List[Dict[str, Any]]]] = {}

# GCE prompt context: previous bar chord (same composition), motif accumulation, chorus motif.
_GCE_PREV_CHORD: str = ""
_MOTIF_BAR_BUFFER: List[List[Dict[str, Any]]] = []
_MOTIF_ROOT_CHORD: str = ""
_CHORUS_MOTIF: Optional[Dict[str, Any]] = None
# Set by callers immediately before _tag_chord_function (3-arg API) for lookahead / resolution.
_GCE_TAG_PREV: str = ""
_GCE_TAG_NN: str = ""

MONK_RAG_TEMPLATES = [
    {
        "function": "ii-V",
        "role": "opening",
        "contour": "desc",
        "bars": 2,
        "anticipates": False,
        "intervals": [-7, -1, -1, -1, 8, -5, 2, 1, 0, 0, 0, -1],
        "target_beat": "beat-1",
        "target_degree": "root",
        "entry_degree": "5th",
        "description": (
            "Quarter on 5th of ii, chromatic triplet descent, leap up to b7 of V, "
            "quarter landing on root"
        ),
    },
    {
        "function": "ii-V",
        "role": "continuation",
        "contour": "flat",
        "bars": 2,
        "anticipates": False,
        "intervals": [0, 0, 0, 0, 0, 0, 0],
        "target_beat": "beat-1",
        "target_degree": "b7",
        "entry_degree": "b7",
        "description": (
            "Monk obsessive repetition — hammer b7 as quarter notes across the bar"
        ),
    },
    {
        "function": "V-V",
        "role": "continuation",
        "contour": "desc",
        "bars": 2,
        "anticipates": True,
        "intervals": [3, -2, 4, -5, 3, -4, 3, -4, 3, -11, 5, 4],
        "target_beat": "beat-1",
        "target_degree": "root",
        "entry_degree": "13th",
        "description": (
            "Tritone + minor 3rd cells, descending with leaps, Monk's angular "
            "dominant language"
        ),
    },
    {
        "function": "turnaround",
        "role": "continuation",
        "contour": "desc",
        "bars": 2,
        "anticipates": True,
        "intervals": [9, -8, 9, -8, 9, -8, 9, -9],
        "target_beat": "beat-1",
        "target_degree": "5th",
        "entry_degree": "b7",
        "description": (
            "Monk's tritone oscillation — alternating minor 6th leaps up and down"
        ),
    },
    {
        "function": "interior-tonic",
        "role": "opening",
        "contour": "flat",
        "bars": 2,
        "anticipates": False,
        "intervals": [0, 0, 5, -5, 0, 0],
        "target_beat": "beat-3",
        "target_degree": "5th",
        "entry_degree": "root",
        "description": "Tonic pedal with tritone colour — Monk's #11 over major chords",
    },
    {
        "function": "interior-dominant",
        "role": "continuation",
        "contour": "asc",
        "bars": 2,
        "anticipates": False,
        "intervals": [1, 5, 4, 3, -3, -4, 10, -5],
        "target_beat": "beat-1",
        "target_degree": "b7",
        "entry_degree": "root",
        "description": (
            "Whole-tone cluster ascent then chromatic descent — Monk's signature "
            "dominant cell"
        ),
    },
]


MONK_CONCRETE_PHRASES = {
    "ii-V": [
        {
            "source": "round-midnight",
            "chord_context": "Fm7 → C7",
            "entry_degree": "5th",
            "exit_degree": "root",
            "contour": "desc",
            "intervals": [-7, -1, -1, -1, 8, -5, 2, 1, 0, 0, 0, -1],
            "notes": [
                {
                    "pitch": "C",
                    "octave": 5,
                    "alter": 0,
                    "duration": 4,
                    "type": "quarter",
                    "is_rest": False,
                    "triplet": False,
                    "dot": False,
                    "is_chord": False,
                },
                {
                    "pitch": "F",
                    "octave": 4,
                    "alter": 0,
                    "duration": 2,
                    "type": "eighth",
                    "is_rest": False,
                    "triplet": True,
                    "dot": False,
                    "is_chord": False,
                },
                {
                    "pitch": "E",
                    "octave": 4,
                    "alter": 0,
                    "duration": 2,
                    "type": "eighth",
                    "is_rest": False,
                    "triplet": False,
                    "dot": False,
                    "is_chord": False,
                },
                {
                    "pitch": "E",
                    "octave": 4,
                    "alter": -1,
                    "duration": 2,
                    "type": "eighth",
                    "is_rest": False,
                    "triplet": True,
                    "dot": False,
                    "is_chord": False,
                },
                {
                    "pitch": "D",
                    "octave": 4,
                    "alter": 0,
                    "duration": 2,
                    "type": "eighth",
                    "is_rest": False,
                    "triplet": False,
                    "dot": False,
                    "is_chord": False,
                },
                {
                    "pitch": "B",
                    "octave": 4,
                    "alter": -1,
                    "duration": 4,
                    "type": "quarter",
                    "is_rest": False,
                    "triplet": False,
                    "dot": False,
                    "is_chord": False,
                },
                {
                    "pitch": "F",
                    "octave": 4,
                    "alter": 0,
                    "duration": 2,
                    "type": "eighth",
                    "is_rest": False,
                    "triplet": False,
                    "dot": False,
                    "is_chord": False,
                },
                {
                    "pitch": "G",
                    "octave": 4,
                    "alter": 0,
                    "duration": 2,
                    "type": "eighth",
                    "is_rest": False,
                    "triplet": False,
                    "dot": False,
                    "is_chord": False,
                },
            ],
        },
        {
            "source": "blue-monk",
            "chord_context": "Cm7 → F7 (obsessive repetition)",
            "entry_degree": "b7",
            "exit_degree": "b7",
            "contour": "flat",
            "intervals": [0, 0, 0, 0, 0, 0, 0],
            "notes": [
                {
                    "pitch": "B",
                    "octave": 4,
                    "alter": -1,
                    "duration": 4,
                    "type": "quarter",
                    "is_rest": False,
                    "triplet": False,
                    "dot": False,
                    "is_chord": False,
                },
                {
                    "pitch": "B",
                    "octave": 4,
                    "alter": -1,
                    "duration": 4,
                    "type": "quarter",
                    "is_rest": False,
                    "triplet": False,
                    "dot": False,
                    "is_chord": False,
                },
                {
                    "pitch": "B",
                    "octave": 4,
                    "alter": -1,
                    "duration": 4,
                    "type": "quarter",
                    "is_rest": False,
                    "triplet": False,
                    "dot": False,
                    "is_chord": False,
                },
                {
                    "pitch": "B",
                    "octave": 4,
                    "alter": -1,
                    "duration": 4,
                    "type": "quarter",
                    "is_rest": False,
                    "triplet": False,
                    "dot": False,
                    "is_chord": False,
                },
            ],
        },
    ],
    "V-V": [
        {
            "source": "blue-monk",
            "chord_context": "F7 → Bb7 (tritone cells)",
            "entry_degree": "13th",
            "exit_degree": "root",
            "contour": "desc",
            "intervals": [3, -2, 4, -5, 3, -4, 3, -4, 3, -11, 5, 4],
            "notes": [
                {
                    "pitch": "D",
                    "octave": 4,
                    "alter": 0,
                    "duration": 2,
                    "type": "eighth",
                    "is_rest": False,
                    "triplet": True,
                    "dot": False,
                    "is_chord": False,
                },
                {
                    "pitch": "F",
                    "octave": 4,
                    "alter": 0,
                    "duration": 2,
                    "type": "eighth",
                    "is_rest": False,
                    "triplet": False,
                    "dot": False,
                    "is_chord": False,
                },
                {
                    "pitch": "E",
                    "octave": 4,
                    "alter": -1,
                    "duration": 2,
                    "type": "eighth",
                    "is_rest": False,
                    "triplet": True,
                    "dot": False,
                    "is_chord": False,
                },
                {
                    "pitch": "G",
                    "octave": 4,
                    "alter": 0,
                    "duration": 2,
                    "type": "eighth",
                    "is_rest": False,
                    "triplet": False,
                    "dot": False,
                    "is_chord": False,
                },
                {
                    "pitch": "D",
                    "octave": 4,
                    "alter": 0,
                    "duration": 2,
                    "type": "eighth",
                    "is_rest": False,
                    "triplet": False,
                    "dot": False,
                    "is_chord": False,
                },
                {
                    "pitch": "F",
                    "octave": 4,
                    "alter": 0,
                    "duration": 2,
                    "type": "eighth",
                    "is_rest": False,
                    "triplet": False,
                    "dot": False,
                    "is_chord": False,
                },
                {
                    "pitch": "C",
                    "octave": 4,
                    "alter": 1,
                    "duration": 2,
                    "type": "eighth",
                    "is_rest": False,
                    "triplet": False,
                    "dot": False,
                    "is_chord": False,
                },
                {
                    "pitch": "E",
                    "octave": 4,
                    "alter": 0,
                    "duration": 4,
                    "type": "quarter",
                    "is_rest": False,
                    "triplet": False,
                    "dot": False,
                    "is_chord": False,
                },
            ],
        },
    ],
    "turnaround": [
        {
            "source": "blue-monk",
            "chord_context": "Bb7 → Eb7 (tritone oscillation)",
            "entry_degree": "b7",
            "exit_degree": "5th",
            "contour": "desc",
            "intervals": [9, -8, 9, -8, 9, -8, 9, -9],
            "notes": [
                {
                    "pitch": "B",
                    "octave": 4,
                    "alter": -1,
                    "duration": 2,
                    "type": "eighth",
                    "is_rest": False,
                    "triplet": False,
                    "dot": False,
                    "is_chord": False,
                },
                {
                    "pitch": "G",
                    "octave": 4,
                    "alter": 0,
                    "duration": 2,
                    "type": "eighth",
                    "is_rest": False,
                    "triplet": False,
                    "dot": False,
                    "is_chord": False,
                },
                {
                    "pitch": "B",
                    "octave": 4,
                    "alter": 0,
                    "duration": 2,
                    "type": "eighth",
                    "is_rest": False,
                    "triplet": False,
                    "dot": False,
                    "is_chord": False,
                },
                {
                    "pitch": "A",
                    "octave": 4,
                    "alter": -1,
                    "duration": 2,
                    "type": "eighth",
                    "is_rest": False,
                    "triplet": False,
                    "dot": False,
                    "is_chord": False,
                },
                {
                    "pitch": "C",
                    "octave": 4,
                    "alter": 0,
                    "duration": 2,
                    "type": "eighth",
                    "is_rest": False,
                    "triplet": False,
                    "dot": False,
                    "is_chord": False,
                },
                {
                    "pitch": "A",
                    "octave": 4,
                    "alter": 0,
                    "duration": 2,
                    "type": "eighth",
                    "is_rest": False,
                    "triplet": False,
                    "dot": False,
                    "is_chord": False,
                },
                {
                    "pitch": "C",
                    "octave": 4,
                    "alter": 1,
                    "duration": 2,
                    "type": "eighth",
                    "is_rest": False,
                    "triplet": False,
                    "dot": False,
                    "is_chord": False,
                },
                {
                    "pitch": "B",
                    "octave": 4,
                    "alter": -1,
                    "duration": 4,
                    "type": "quarter",
                    "is_rest": False,
                    "triplet": False,
                    "dot": False,
                    "is_chord": False,
                },
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
    pool = MONK_VOCABULARY.get(main_key) or MONK_VOCABULARY.get("dominant") or []
    if not pool:
        return "EMPTY", [0, -1, 2, -3, 1, -2, 1, -1]
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
    left = _ud.normalize("NFKC", left)
    left = left.lstrip("\ufeff\u200b\u200c\u200d")
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
    pc = _LETTER_PC[step]
    return (pc + alt) % 12


def _is_full_diminished(sym: str) -> bool:
    """Fully diminished (dim / dim7 / °), not half-dim m7b5."""
    if _is_half_dim(sym):
        return False
    low = sym.lower()
    return "dim" in low or "°" in sym or "o7" in low


def _chord_root_and_kind(sym: str) -> Tuple[Optional[int], str]:
    """Pitch class 0–11 and a chord_kind string for consonance helpers."""
    c = _norm_chord(sym)
    if not c:
        return None, ""
    r = _root_pc(sym)
    if _is_half_dim(c):
        return r, "half-diminished"
    if _is_full_diminished(c):
        return r, "diminished"
    if _has_maj7(c):
        return r, "major-seventh"
    if _has_min7(c):
        return r, "minor seventh"
    if _is_dom7(c):
        return r, "dominant"
    return r, ""


def _chord_tone_pcs(chord_root: int, chord_kind: str) -> set:
    """
    Returns set of acceptable pitch classes for this chord.
    Generous — includes extensions (9, 11, 13, b9, #9)
    so chromatic colour tones are not flagged.
    """
    k = chord_kind.lower() if chord_kind else ""
    r = chord_root
    if "major-seventh" in k or "major seventh" in k:
        return {
            r,
            (r + 2) % 12,
            (r + 4) % 12,
            (r + 6) % 12,
            (r + 7) % 12,
            (r + 9) % 12,
            (r + 11) % 12,
        }
    elif "minor-seventh" in k or "minor seventh" in k:
        return {
            r,
            (r + 2) % 12,
            (r + 3) % 12,
            (r + 5) % 12,
            (r + 7) % 12,
            (r + 10) % 12,
            (r + 1) % 12,
        }
    elif "dominant" in k:
        return {
            r,
            (r + 1) % 12,
            (r + 2) % 12,
            (r + 3) % 12,
            (r + 4) % 12,
            (r + 6) % 12,
            (r + 7) % 12,
            (r + 8) % 12,
            (r + 9) % 12,
            (r + 10) % 12,
        }
    elif "half-diminished" in k:
        return {
            r,
            (r + 2) % 12,
            (r + 3) % 12,
            (r + 5) % 12,
            (r + 6) % 12,
            (r + 8) % 12,
            (r + 10) % 12,
        }
    elif "diminished" in k:
        return {
            r,
            (r + 2) % 12,
            (r + 3) % 12,
            (r + 6) % 12,
            (r + 8) % 12,
            (r + 9) % 12,
        }
    else:
        return {
            r,
            (r + 2) % 12,
            (r + 4) % 12,
            (r + 7) % 12,
            (r + 9) % 12,
            (r + 11) % 12,
        }


def _strict_tone_pcs(chord_root: int, chord_kind: str) -> set:
    """
    Strict chord tones only — root, 3rd, 5th, 7th, 9th.
    Used for long notes and downbeat enforcement.
    """
    k = chord_kind.lower() if chord_kind else ""
    r = chord_root
    if "major-seventh" in k or "major seventh" in k:
        return {r, (r + 2) % 12, (r + 4) % 12, (r + 7) % 12, (r + 11) % 12}
    elif "minor-seventh" in k or "minor seventh" in k:
        return {r, (r + 2) % 12, (r + 3) % 12, (r + 7) % 12, (r + 10) % 12}
    elif "dominant" in k:
        return {
            r,
            (r + 2) % 12,
            (r + 4) % 12,
            (r + 7) % 12,
            (r + 10) % 12,
            (r + 1) % 12,
            (r + 3) % 12,
        }
    elif "half-diminished" in k:
        return {r, (r + 3) % 12, (r + 6) % 12, (r + 10) % 12}
    elif "diminished" in k:
        return {r, (r + 3) % 12, (r + 6) % 12, (r + 9) % 12}
    else:
        return {r, (r + 4) % 12, (r + 7) % 12, (r + 11) % 12}


def _note_from_midi_like(n: Dict[str, Any], midi: int) -> Dict[str, Any]:
    """Re-spell a pitched note from MIDI; preserves duration and triplet flag."""
    m2 = max(_MIDI_LO, min(_MIDI_HI, int(midi)))
    s, al, oc = _spell_pitch(m2)
    d = int(n["duration"])
    trip = bool(n.get("triplet"))
    return _note_shape(d, is_rest=False, step=s, alter=al, octv=oc, triplet=trip)


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
        if dur >= CAPACITY:
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
    if dur >= CAPACITY:
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

    Callers must set module globals _GCE_TAG_PREV and _GCE_TAG_NN
    (previous and next-next chord symbols) before each call.
    """
    c = _norm_chord(chord_symbol)
    n = _norm_chord(next_chord)
    nn = _norm_chord(_GCE_TAG_NN)
    prev = _norm_chord(_GCE_TAG_PREV)

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


def _turnaround_hint_for_tag(function_tag: str) -> str:
    if "turnaround" in (function_tag or "").lower():
        return " This is a turnaround — treat as one continuous dominant chain."
    return ""


def _format_bar_function_prompt_line(bar_num: int, chord: str, function_tag: str) -> str:
    tw = _turnaround_hint_for_tag(function_tag)
    return f"Bar {bar_num}: {chord} — function: {function_tag}.{tw}"


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


def _extract_motif(notes: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    From the first 4 bars of generated notes, extract the
    first 3-5 pitched notes as a motif.
    Uses _MOTIF_ROOT_CHORD for start_degree labeling.
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
    root_chord = _MOTIF_ROOT_CHORD or "C"
    start_degree = _degree_label_from_midi(mids[0], root_chord)
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
        _CHORUS_MOTIF = _extract_motif(flat)


def _rhythm_skeleton_division_sum(skel: List[Dict[str, Any]]) -> int:
    total = 0
    for n in skel:
        if not isinstance(n, dict):
            continue
        try:
            total += int(n.get("duration", 0))
        except (TypeError, ValueError):
            continue
    return total


def _skeleton_rhythm_placeholder(dur: int) -> Dict[str, Any]:
    """Pitched placeholder for rhythm slots; duration in divisions (CAPACITY=16)."""
    return _note_shape(
        dur, is_rest=False, step="C", alter=0.0, octv=4, triplet=False
    )


def _skeleton_slot_prompt_label(n: Dict[str, Any]) -> str:
    if bool(n.get("is_rest")):
        d = int(n.get("duration", 0))
        if d >= 8:
            return "half_rest"
        if d >= 4:
            return "quarter_rest"
        return "eighth_rest"
    return str(n.get("type", "quarter")).lower()


def _format_rhythm_skeleton_for_prompt(skel: List[Dict[str, Any]]) -> str:
    return ", ".join(_skeleton_slot_prompt_label(x) for x in skel if isinstance(x, dict))


def _build_rhythm_skeleton(
    bar_index: int,
    phrase_role: str,
) -> List[Dict[str, Any]]:
    """Rhythm slots as note-shaped dicts; durations sum to CAPACITY (divisions=4)."""
    pr = (phrase_role or "").strip().lower()
    if pr in ("opening", "launch") or bar_index in (0, 8, 16, 24):
        sk = [
            _note_shape(4, is_rest=True),
            _skeleton_rhythm_placeholder(4),
            _skeleton_rhythm_placeholder(4),
            _skeleton_rhythm_placeholder(4),
        ]
    elif pr == "turnaround":
        # eighth+eighth+quarter+quarter = 12 divisions; need 16 at DIVISIONS=4.
        # Two eighth pickups + three quarter beats = 2+2+4+4+4.
        sk = [
            _skeleton_rhythm_placeholder(2),
            _skeleton_rhythm_placeholder(2),
            _skeleton_rhythm_placeholder(4),
            _skeleton_rhythm_placeholder(4),
            _skeleton_rhythm_placeholder(4),
        ]
    elif bar_index % 4 == 3:
        sk = [
            _skeleton_rhythm_placeholder(4),
            _skeleton_rhythm_placeholder(4),
            _note_shape(8, is_rest=False, step="C", alter=0.0, octv=4, triplet=False),
        ]
    else:
        sk = [
            _skeleton_rhythm_placeholder(4),
            _skeleton_rhythm_placeholder(4),
            _skeleton_rhythm_placeholder(4),
            _skeleton_rhythm_placeholder(4),
        ]
    if _rhythm_skeleton_division_sum(sk) != CAPACITY:
        sk = [_skeleton_rhythm_placeholder(4)] * 4
    return sk


def _skeleton_fingerprint(skel: List[Dict[str, Any]]) -> str:
    parts: List[str] = []
    for n in skel:
        if not isinstance(n, dict):
            continue
        d = int(n.get("duration", 0))
        rest = bool(n.get("is_rest"))
        parts.append(f"{d}:{'r' if rest else str(n.get('type', ''))}")
    return "|".join(parts)


def _prompt_variant_hash(
    tag: str,
    skeleton: List[Dict[str, Any]],
    motif_line: str,
) -> str:
    h = hashlib.sha256(
        f"{tag}|{_skeleton_fingerprint(skeleton)}|{motif_line}".encode("utf-8")
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
        f'rhythm {m["rhythm"]}. Adapt the shape to the current chord at concert pitch '
        "(do not relabel or transpose chord symbols). "
        "You may displace by 1-2 eighths or invert the contour."
    )


def _retrieve_monk_templates(
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
        for t in MONK_RAG_TEMPLATES
        if t["function"] == function_tag and t["role"] == phrase_role
    ]
    if not matches:
        matches = [t for t in MONK_RAG_TEMPLATES if t["function"] == function_tag]
    if not matches:
        matches = MONK_RAG_TEMPLATES[:2]
    return matches[:n]


def _retrieve_concrete_phrases(function_tag: str, n: int = 1) -> list[dict]:
    """
    Maps function_tag to MONK_CONCRETE_PHRASES key and
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
        for k in MONK_CONCRETE_PHRASES:
            if k.lower() in low:
                key = k
                break
    if not key:
        return []
    return MONK_CONCRETE_PHRASES.get(key, [])[:n]


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
    while total > CAPACITY and out:
        excess = total - CAPACITY
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
            total = CAPACITY
            break
        out.pop()
        total -= ld
    if total < CAPACITY:
        out.append(_note_shape(CAPACITY - total, is_rest=True))
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
    excess = total - CAPACITY
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


def _enforce_cadence_half(
    notes: List[Dict[str, Any]],
    bar_index: int,
) -> List[Dict[str, Any]]:
    if (bar_index % 4) != 3:
        return notes
    out = [dict(n) for n in notes]
    if any(int(n.get("duration", 0)) >= 8 for n in out):
        return out
    if len(out) < 9:
        return out
    n4 = out[4]
    if n4.get("is_rest"):
        return out
    m = _midi_from_note_dict(n4)
    s, al, oc = _spell_pitch(m)
    # divisions=4: half note = 8 divisions (quarter=4, eighth=2).
    half = _note_shape(8, is_rest=False, step=s, alter=al, octv=oc, triplet=False)
    return out[:4] + [half] + out[8:]


def _enforce_long_note_consonance(
    notes: List[Dict[str, Any]],
    bar_index: int,
    generation_seed: int,
    chord_root: Optional[int],
    chord_kind: str,
) -> List[Dict[str, Any]]:
    """
    Any note longer than an eighth (duration >= 4 at divisions=4: quarter+;
    half notes use duration 8) must be a strict chord tone.
    If not, find the nearest strict chord tone
    within ±2 semitones and shift to it.
    Preserves all rhythm and duration values.
    """
    if chord_root is None:
        return notes
    strict = _strict_tone_pcs(chord_root, chord_kind)
    out = [dict(n) for n in notes]
    for i, n in enumerate(out):
        if n.get("is_rest"):
            continue
        if int(n.get("duration", 2)) < 4:
            continue
        m = _midi_from_note_dict(n)
        pc = m % 12
        if pc in strict:
            continue
        for delta in (0, 1, -1, 2, -2):
            candidate_pc = (pc + delta) % 12
            if candidate_pc in strict:
                out[i] = _note_from_midi_like(n, m + delta)
                break
    return out


def _enforce_downbeat_consonance(
    notes: List[Dict[str, Any]],
    bar_index: int,
    generation_seed: int,
    chord_root: Optional[int],
    chord_kind: str,
) -> List[Dict[str, Any]]:
    """
    If the bar opens on a pitched note that is not a strict chord tone,
    prepend an eighth rest so that pitch becomes an offbeat entry
    (syncopated, chromatic approaches preserved). Trim the end of the bar
    by one eighth to compensate, matching _enforce_opening_rest.

    SYNCOPATION SAFE: if notes[0] is already a rest, skip.

    Every third bar (bar_index % 3 == 0), skip the rest insert and
    instead nudge pitch toward a strict tone for variety (legacy path).
    """
    if chord_root is None:
        return notes
    if not notes or notes[0].get("is_rest"):
        return notes

    strict = _strict_tone_pcs(chord_root, chord_kind)
    m0 = _midi_from_note_dict(notes[0])
    if (m0 % 12) in strict:
        return notes

    if bar_index % 3 == 0:
        out = [dict(n) for n in notes]
        for i, n in enumerate(out):
            if n.get("is_rest"):
                continue
            m = _midi_from_note_dict(n)
            pc = m % 12
            if pc in strict:
                break
            for delta in (1, -1, 2, -2, 3, -3):
                candidate_pc = (pc + delta) % 12
                if candidate_pc in strict:
                    out[i] = _note_from_midi_like(n, m + delta)
                    break
            break
        return out

    out = [dict(n) for n in notes]
    out.insert(0, _note_shape(2, is_rest=True))
    total = sum(int(n.get("duration", 0)) for n in out)
    excess = total - CAPACITY
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


def _enforce_no_chord_contradictions(
    notes: List[Dict[str, Any]],
    bar_index: int,
    generation_seed: int,
    chord_root: Optional[int],
    chord_kind: str,
) -> List[Dict[str, Any]]:
    """
    Removes hard contradictions — notes that imply
    the wrong chord mode — from long notes only
    (duration >= 4). Short passing tones are fine.

    Hard contradictions:
    - maj7 interval over major-seventh chord held long:
      (root-1)%12 e.g. Eb over Fmaj7
    - natural 7 over dominant held long:
      (root+11)%12 e.g. E over F7
    - natural 6 over minor-seventh held long:
      (root+9)%12 e.g. D over Cm7
    """
    # Disabled for Monk: intentional b9s and tritones must pass through.
    return notes


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


def _enforce_monk_density(
    notes: List[Dict[str, Any]],
    bar_index: int,
    generation_seed: int,
    chord_root: Optional[int] = None,
    chord_kind: Optional[str] = None,
) -> List[Dict[str, Any]]:
    pitched = [i for i, n in enumerate(notes) if not n.get("is_rest")]
    if len(pitched) <= 6:
        return notes
    to_remove = set(pitched[6::2])
    return [n for i, n in enumerate(notes) if i not in to_remove]


def _enforce_monk_rhythm_variety(
    notes: List[Dict[str, Any]],
    bar_index: int,
    generation_seed: int,
    chord_root: Optional[int] = None,
    chord_kind: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    If all pitched notes are eighths, convert every
    3rd note to a quarter (merge with next note).
    Monk never plays pure eighth-note runs.
    """
    pitched_idx = [i for i, n in enumerate(notes) if not n.get("is_rest")]
    all_eighths = all(notes[i].get("type") == "eighth" for i in pitched_idx)
    if not all_eighths:
        return notes
    if len(pitched_idx) < 4:
        return notes

    out = list(notes)
    for k, idx in enumerate(pitched_idx):
        if k % 3 == 2 and idx + 1 < len(out):
            if not out[idx + 1].get("is_rest"):
                out[idx] = dict(out[idx])
                out[idx]["duration"] = 8
                out[idx]["type"] = "half"
                out[idx]["dot"] = False
                out[idx + 1] = None
    out = [n for n in out if n is not None]
    return out


def _enforce_monk_breathing(
    notes: List[Dict[str, Any]],
    bar_index: int,
    generation_seed: int,
    chord_root: Optional[int] = None,
    chord_kind: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Monk leaves space. If a bar has no rests and
    more than 5 pitched notes, insert a quarter rest
    at beat 3 (slot 4 at div=4).
    """
    if bar_index in (0, 8, 16, 24):
        return notes
    has_rest = any(n.get("is_rest") for n in notes)
    pitched = [n for n in notes if not n.get("is_rest")]
    if has_rest or len(pitched) <= 5:
        return notes

    quarter_rest = {
        "pitch": "",
        "octave": 0,
        "alter": 0,
        "duration": 4,
        "type": "quarter",
        "is_rest": True,
        "triplet": False,
        "dot": False,
        "is_chord": False,
    }
    out = list(notes)
    out.insert(4, quarter_rest)
    return out[:8]


def _apply_post_validators(
    notes: List[Dict[str, Any]],
    phrase_role: str,
    bar_index: int,
    generation_seed: int,
    chord_root: Optional[int] = None,
    chord_kind: Optional[str] = None,
) -> List[Dict[str, Any]]:
    n = _patch_unison_runs(notes, generation_seed)
    n = _cap_unison_frequency(n)
    n = _enforce_opening_rest(n, phrase_role, bar_index)
    n = _enforce_syncopation(n, bar_index, generation_seed)
    n = _enforce_midphrase_quarter(n, bar_index, generation_seed)
    n = _enforce_cadence_half(n, bar_index)
    ck = chord_kind if chord_kind is not None else ""
    n = _enforce_long_note_consonance(
        n, bar_index, generation_seed, chord_root, ck
    )
    n = _enforce_downbeat_consonance(
        n, bar_index, generation_seed, chord_root, ck
    )
    n = _enforce_no_chord_contradictions(
        n, bar_index, generation_seed, chord_root, ck
    )
    n = _enforce_monk_density(n, bar_index, generation_seed, chord_root, ck)
    n = _enforce_monk_rhythm_variety(n, bar_index, generation_seed, chord_root, ck)
    n = _enforce_monk_breathing(n, bar_index, generation_seed, chord_root, ck)
    return _fit_sixteen_divisions(n)


_GCE_SYSTEM_PROMPT = """You are Thelonious Monk's hands on the piano,
transcribed for a single melodic line.
You play SLOWLY. You leave SPACE.
You use QUARTER NOTES and HALF NOTES, not eighth notes.
You repeat the same note or short cell obsessively.
You use tritone leaps and flat 9ths deliberately.
You NEVER play more than 6 notes in a bar.
You rest for entire beats. Silence is your instrument.
"""

_GCE_USER_PROMPT_PREFIX = (
    "IMPORTANT: Use quarter notes and half notes.\n"
    "Maximum 6 pitched notes per bar.\n"
    "Leave at least one full beat of rest per bar.\n"
    "Do NOT play eighth-note runs longer than 4 notes.\n\n"
)


def _build_claude_prompt(
    chord_symbols: List[str],
    phrase_role: str,
    bar_index: int,
    *,
    function_tag: str,
    rhythm_skeleton: List[Dict[str, Any]],
    motif_line: str,
) -> str:
    chord_string = " | ".join(
        str(c).strip() for c in (chord_symbols or []) if c and str(c).strip()
    )
    if not chord_string:
        chord_string = "Cmaj7"
    c0 = chord_symbols[0] if chord_symbols else "Cmaj7"
    func_line = _format_bar_function_prompt_line(bar_index + 1, c0, function_tag)
    sk_txt = _format_rhythm_skeleton_for_prompt(rhythm_skeleton)
    skeleton_line = (
        f"Rhythm skeleton for this bar: [{sk_txt}].\n"
        "Fill in pitches following Monk rules above.\n"
        "Do not change the rhythm unless musically essential."
    )
    motif_block = motif_line.strip() if motif_line else ""
    return f"""{func_line}

Chord window: {chord_string}
Bar index: {bar_index} | Role: {phrase_role}
{motif_block}
{skeleton_line}

Play a Thelonious Monk monk-style line over these changes.

You are Monk. Not a rule-follower. Not a textbook.
You anticipate chord changes by 1-2 eighths before the
barline. You start phrases on offbeats. You land on the
3rd or 7th of each chord, never the root. You use the
monk-style scale with chromatic passing tones. You encircle
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


def _chorus_cache_key(chord_symbols: List[str], generation_seed: int) -> str:
    raw = "chorus" + ",".join(str(c).strip() for c in chord_symbols) + str(generation_seed)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _normalize_dominant_function(function_tag: str) -> str:
    low = (function_tag or "").lower()
    if "ii-v-i" in low:
        return "ii-V-I"
    if "turnaround" in low:
        return "turnaround"
    if "interior dominant" in low:
        return "interior-dominant"
    if "interior tonic" in low:
        return "interior-tonic"
    if low.startswith("v "):
        return "V-I"
    return "ii-V-I"


def _build_concrete_phrase_block(
    function_tags: List[str],
    max_examples: int,
) -> str:
    concrete_lines: List[str] = []
    seen: set[str] = set()
    for ft, _ in Counter(function_tags).most_common():
        picks = _retrieve_concrete_phrases(ft, n=max_examples)
        for p in picks:
            key = f"{p.get('source','')}|{p.get('chord_context','')}|{p.get('intervals',[])}"
            if key in seen:
                continue
            seen.add(key)
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
                f"Real Monk phrase over {p.get('chord_context', 'unknown context')}\n"
                f"(entry: {p.get('entry_degree', '?')}, contour: {p.get('contour', '?')}):\n"
                f"Interval sequence: {p.get('intervals', [])}\n"
                "Note sequence (adapt pitches to your chord at concert pitch):\n"
                f"{notes_preview}\n"
                "Echo this shape and vocabulary. Do not copy literally —\n"
                "match the printed chord symbols; vary the rhythm."
            )
            if len(concrete_lines) >= max_examples:
                break
        if len(concrete_lines) >= max_examples:
            break
    if not concrete_lines:
        return ""
    return "\n\n".join(concrete_lines) + "\n\n"


def _build_section_prompt(
    chord_symbols: List[str],
    section_label: str,
    bar_start: int,
    function_tags: List[str],
    rhythm_skeletons: List[List[Dict[str, Any]]],
    motif_line: str,
) -> str:
    chords_lines = "\n".join(f"{i + 1}. {chord_symbols[i]}" for i in range(8))
    func_lines = "\n".join(f"{i + 1}. {function_tags[i]}" for i in range(8))
    sk_lines = "\n".join(
        f"{i + 1}. [{_format_rhythm_skeleton_for_prompt(rhythm_skeletons[i])}]"
        for i in range(8)
    )
    concrete_block = _build_concrete_phrase_block(function_tags, max_examples=3)
    motif_block = (motif_line.strip() + "\n\n") if motif_line.strip() else ""
    return f"""{_GCE_USER_PROMPT_PREFIX}Section: {section_label} | Bars {bar_start + 1}-{bar_start + 8}
Chords:
{chords_lines}
Function tags:
{func_lines}
Rhythm skeletons:
{sk_lines}
{motif_block}
You are Thelonious Monk. Generate a complete melody
over these changes.

Monk's rules — follow these exactly:
- Leave space. More space than you think. Rests are
  your most important notes.
- Use flat 9ths (b9) as signature tension intervals,
  especially on dominant chords.
- Use tritone leaps deliberately — they are not mistakes.
- Repeat short motifs (2-4 notes) obsessively.
  Play the same cell 2-3 times before moving on.
- Displace rhythms — play phrases a beat late or early.
  Never land exactly where expected.
- Use wide interval leaps (7ths, 9ths) in the melody.
- Avoid smooth stepwise lines. Prefer angular shapes.
- On tonic chords, use the major 7th and #11 as
  colour notes.
- Quarter notes and half notes dominate.
  Eighth note runs are rare and short (max 4 in a row).
- When in doubt, play less.

{concrete_block}
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

Each notes array uses the same schema as before (quarters/halves preferred):
[{{"pitch":"D","octave":4,"alter":0,"duration":4,
"type":"quarter","is_rest":false,"triplet":false,
"dot":false,"is_chord":false}}]

Rests: {{"pitch":"","octave":0,"alter":0,"duration":4,
"type":"quarter","is_rest":true,"triplet":false,
"dot":false,"is_chord":false}}

All 8 bars must be present. Each bar must sum to
exactly {CAPACITY} divisions.
"""


def _build_chorus_prompt(
    chord_symbols: List[str],
    form: str,
    function_tags: List[str],
    rhythm_skeletons: List[List[Dict[str, Any]]],
    motif_line: str,
) -> str:
    chords_lines = "\n".join(f"{i + 1}. {chord_symbols[i]}" for i in range(32))
    func_lines = "\n".join(f"{i + 1}. {function_tags[i]}" for i in range(32))
    sk_lines = "\n".join(
        f"{i + 1}. [{_format_rhythm_skeleton_for_prompt(rhythm_skeletons[i])}]"
        for i in range(32)
    )
    concrete_block = _build_concrete_phrase_block(function_tags, max_examples=2)
    motif_block = (motif_line.strip() + "\n\n") if motif_line.strip() else ""
    return f"""{_GCE_USER_PROMPT_PREFIX}Section: {form} | Bars 1-32
Chords:
{chords_lines}
Function tags:
{func_lines}
Rhythm skeletons:
{sk_lines}
{motif_block}
You are Thelonious Monk. Generate a complete melody
over these changes.

Monk's rules — follow these exactly:
- Leave space. More space than you think. Rests are
  your most important notes.
- Use flat 9ths (b9) as signature tension intervals,
  especially on dominant chords.
- Use tritone leaps deliberately — they are not mistakes.
- Repeat short motifs (2-4 notes) obsessively.
  Play the same cell 2-3 times before moving on.
- Displace rhythms — play phrases a beat late or early.
  Never land exactly where expected.
- Use wide interval leaps (7ths, 9ths) in the melody.
- Avoid smooth stepwise lines. Prefer angular shapes.
- On tonic chords, use the major 7th and #11 as
  colour notes.
- Quarter notes and half notes dominate.
  Eighth note runs are rare and short (max 4 in a row).
- When in doubt, play less.

{concrete_block}
Return ONLY a JSON object:
{{
  "bars": [
    {{"bar": 1, "notes": [...]}},
    {{"bar": 2, "notes": [...]}},
    ...
    {{"bar": 32, "notes": [...]}}
  ]
}}

Each notes array uses the same schema as before (quarters/halves preferred):
[{{"pitch":"D","octave":4,"alter":0,"duration":4,
"type":"quarter","is_rest":false,"triplet":false,
"dot":false,"is_chord":false}}]

Rests: {{"pitch":"","octave":0,"alter":0,"duration":4,
"type":"quarter","is_rest":true,"triplet":false,
"dot":false,"is_chord":false}}

All 32 bars must be present.
Each bar must sum to exactly {CAPACITY} divisions.
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
        if sum(int(x["duration"]) for x in notes) != CAPACITY:
            return None
        if not any(not x.get("is_rest") for x in notes):
            return None
        out.append(notes)
    return out


def _parse_chorus_json_to_bars_partial(text: str) -> Dict[int, List[Dict[str, Any]]]:
    out: Dict[int, List[Dict[str, Any]]] = {}
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return out
    if not isinstance(data, dict):
        return out
    bars = data.get("bars")
    if not isinstance(bars, list):
        return out
    for item in bars:
        if not isinstance(item, dict):
            continue
        bar_num_raw = item.get("bar", 0)
        try:
            bar_num = int(bar_num_raw)
        except (TypeError, ValueError):
            continue
        if bar_num < 1 or bar_num > 32:
            continue
        notes_raw = item.get("notes")
        if not isinstance(notes_raw, list):
            continue
        notes: List[Dict[str, Any]] = []
        for n in notes_raw:
            nn = _normalize_claude_note(n)
            if nn:
                notes.append(nn)
        if not notes:
            continue
        notes = _fit_sixteen_divisions(notes)
        if sum(int(x["duration"]) for x in notes) != CAPACITY:
            continue
        if not any(not x.get("is_rest") for x in notes):
            continue
        out[bar_num - 1] = notes
    return out


def _generate_monk_section_via_claude(
    chord_symbols: List[str],
    section_label: str,
    bar_start: int,
    generation_seed: int,
    total_bars: int,
) -> Optional[List[List[Dict[str, Any]]]]:
    global _GCE_TAG_PREV, _GCE_TAG_NN
    try:
        import anthropic
    except ImportError:
        return None
    ch8 = [str(c).strip() for c in chord_symbols[:8]]
    while len(ch8) < 8:
        ch8.append(ch8[-1] if ch8 else "Cmaj7")
    ch8 = ch8[:8]
    function_tags: List[str] = []
    rhythm_skeletons: List[List[Dict[str, Any]]] = []
    for i in range(8):
        bar_idx = bar_start + i
        c0 = ch8[i]
        nxt = ch8[(i + 1) % 8]
        nn = ch8[(i + 2) % 8]
        prev = ch8[i - 1] if i > 0 else (_GCE_PREV_CHORD if bar_start > 0 else "")
        _GCE_TAG_PREV = prev
        _GCE_TAG_NN = nn
        function_tags.append(_tag_chord_function(c0, nxt, bar_idx))
        phrase_role = _phrase_role_for_bar_local(bar_idx, total_bars)
        hctx = detect_harmonic_context(c0, nxt, nn)
        if hctx == "turnaround" and phrase_role not in ("ending", "launch"):
            phrase_role = "turnaround"
        rhythm_skeletons.append(_build_rhythm_skeleton(bar_idx, phrase_role))
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
            temperature=0.9,
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


def _generate_monk_chorus_via_claude(
    chord_symbols: List[str],
    form: str,
    generation_seed: int,
) -> Dict[int, List[Dict[str, Any]]]:
    try:
        import anthropic
    except ImportError:
        return {}
    ch32 = [str(c).strip() for c in chord_symbols[:32]]
    while len(ch32) < 32:
        ch32.append(ch32[-1] if ch32 else "Cmaj7")
    ch32 = ch32[:32]
    function_tags: List[str] = []
    rhythm_skeletons: List[List[Dict[str, Any]]] = []
    global _GCE_TAG_PREV, _GCE_TAG_NN
    for i in range(32):
        c0 = ch32[i]
        nxt = ch32[(i + 1) % 32]
        nn = ch32[(i + 2) % 32]
        prev = ch32[i - 1] if i > 0 else ""
        _GCE_TAG_PREV = prev
        _GCE_TAG_NN = nn
        function_tags.append(_tag_chord_function(c0, nxt, i))
        phrase_role = _phrase_role_for_bar_local(i, 32)
        hctx = detect_harmonic_context(c0, nxt, nn)
        if hctx == "turnaround" and phrase_role not in ("ending", "launch"):
            phrase_role = "turnaround"
        rhythm_skeletons.append(_build_rhythm_skeleton(i, phrase_role))
    prompt = _build_chorus_prompt(
        ch32,
        form,
        function_tags,
        rhythm_skeletons,
        _motif_line_for_bar_index(8),
    )
    try:
        client = anthropic.Anthropic()
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            temperature=0.9,
            system=_GCE_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_text = _claude_response_text(response)
        jo = _extract_json_object(raw_text)
        if not jo:
            return {}
        return _parse_chorus_json_to_bars_partial(jo)
    except Exception:
        return {}


def generate_monk_section(
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
    Falls back to calling generate_monk_phrase() 8x
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

    gce_bars = _generate_monk_section_via_claude(
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
        chord_root, chord_kind = _chord_root_and_kind(c0)
        # Always run post-validators on every parsed GCE bar before acceptance.
        if gce_bars is not None and i < len(gce_bars):
            try:
                raw = [dict(n) for n in gce_bars[i]]
                v = _apply_post_validators(
                    raw, phrase_role, bar_idx, gen_seed_i, chord_root, chord_kind
                )
                v = _maybe_half_note_bar_end(v, bar_idx)
                if any(not n.get("is_rest") for n in v):
                    bar_notes = v
            except Exception:
                bar_notes = None

        if bar_notes is None:
            notes, sp = generate_monk_phrase(
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


def generate_monk_chorus(
    chord_symbols: list[str],  # all 32 chords
    form: str,  # 'AABA'
    generation_seed: int,
) -> list[list[dict]]:
    """
    Generates the entire 32-bar chorus in one GCE call.
    Falls back to generate_monk_section() per section
    if GCE fails or returns invalid JSON.
    """
    ch32 = [str(c).strip() for c in chord_symbols if c and str(c).strip()]
    while len(ch32) < 32:
        ch32.append(ch32[-1] if ch32 else "Cmaj7")
    ch32 = ch32[:32]

    cache_key = _chorus_cache_key(ch32, generation_seed)
    cached = _CHORUS_CACHE.get(cache_key)
    if cached is not None and len(cached) == 32:
        return [[dict(n) for n in bar] for bar in cached]

    parsed = _generate_monk_chorus_via_claude(ch32, form, generation_seed)
    out: List[List[Dict[str, Any]]] = []
    start_pitch = 67
    for block_start in (0, 8, 16, 24):
        block_ok = all((block_start + i) in parsed for i in range(8))
        if block_ok:
            block_bars: List[List[Dict[str, Any]]] = []
            for i in range(8):
                bar_idx = block_start + i
                raw = [dict(n) for n in parsed[bar_idx]]
                role = _phrase_role_for_bar_local(bar_idx, 32)
                gen_seed_i = generation_seed + bar_idx * 17
                ch_sym = ch32[bar_idx]
                chord_root, chord_kind = _chord_root_and_kind(ch_sym)
                v = _apply_post_validators(
                    raw, role, bar_idx, gen_seed_i, chord_root, chord_kind
                )
                v = _maybe_half_note_bar_end(v, bar_idx)
                if not any(not n.get("is_rest") for n in v):
                    block_ok = False
                    break
                block_bars.append(v)
            if block_ok:
                out.extend(block_bars)
                lp = [n for n in block_bars[-1] if not n.get("is_rest")]
                if lp:
                    start_pitch = _midi_from_note_dict(lp[-1])
                continue

        label = "A1" if block_start == 0 else "A2" if block_start == 8 else "B" if block_start == 16 else "A3"
        sec = generate_monk_section(
            ch32[block_start : block_start + 8],
            label,
            block_start,
            generation_seed,
            total_bars=32,
            start_pitch=start_pitch,
        )
        out.extend(sec)
        lp = [n for n in sec[-1] if not n.get("is_rest")]
        if lp:
            start_pitch = _midi_from_note_dict(lp[-1])

    if len(out) > 32:
        out = out[:32]
    while len(out) < 32:
        out.append([_note_shape(CAPACITY, is_rest=True)])
    _CHORUS_CACHE[cache_key] = [[dict(n) for n in bar] for bar in out]
    return out


def _generate_monk_phrase_via_claude(
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
    global _GCE_TAG_PREV, _GCE_TAG_NN
    _GCE_TAG_PREV = prev_chord
    _GCE_TAG_NN = nn
    function_tag = _tag_chord_function(c0, nxt, bar_index)
    pr_rhythm = phrase_role
    hctx = detect_harmonic_context(c0, nxt, nn)
    if hctx == "turnaround" and pr_rhythm not in ("ending", "launch"):
        pr_rhythm = "turnaround"
    rhythm_skeleton = _build_rhythm_skeleton(bar_index, pr_rhythm)
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
            temperature=0.9,
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
        if sum(int(x["duration"]) for x in notes) != CAPACITY:
            return None
        pitched = [x for x in notes if not x.get("is_rest")]
        if not pitched:
            return None
        return notes
    except Exception:
        return None


def _generate_monk_phrase_deterministic(
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
        main_key = hctx if hctx in MONK_VOCABULARY else "dominant"

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


def generate_monk_phrase(
    chord_symbols: List[str],
    phrase_role: str,
    start_pitch: int,
    generation_seed: int,
    section_index: int = 0,
    bar_index: int = 0,
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Build one bar of notes plus carried register using Claude (GCE) when available,
    else deterministic vocabulary/rhythm. Note dicts match monk_section_compiler.

    Primary melody output is the note list; return value includes carried MIDI register
    for the next bar (monk_section_compiler contract).
    """
    global _GCE_PREV_CHORD, _MOTIF_BAR_BUFFER, _MOTIF_ROOT_CHORD, _CHORUS_MOTIF
    global _GCE_TAG_PREV, _GCE_TAG_NN

    if bar_index == 0:
        _GCE_PREV_CHORD = ""
        _MOTIF_BAR_BUFFER = []
        _MOTIF_ROOT_CHORD = chord_symbols[0] if chord_symbols else "Cmaj7"
        _CHORUS_MOTIF = None

    prev = _GCE_PREV_CHORD if bar_index > 0 else ""
    c0 = chord_symbols[0] if chord_symbols else "Cmaj7"
    chord_root, chord_kind = _chord_root_and_kind(c0)
    nxt = chord_symbols[1] if len(chord_symbols) > 1 else ""
    nn = chord_symbols[2] if len(chord_symbols) > 2 else ""
    _GCE_TAG_PREV = prev
    _GCE_TAG_NN = nn
    function_tag = _tag_chord_function(c0, nxt, bar_index)
    motif_line = ""
    if bar_index in (8, 16, 24) and _CHORUS_MOTIF:
        m = _CHORUS_MOTIF
        motif_line = (
            f'Motif to reuse or vary: interval sequence {m["intervals"]}, '
            f'rhythm {m["rhythm"]}. Adapt the shape to the current chord at concert pitch '
            "(do not relabel or transpose chord symbols). "
            "You may displace by 1-2 eighths or invert the contour."
        )
    pr_rhythm = phrase_role
    hctx_r = detect_harmonic_context(c0, nxt, nn)
    if hctx_r == "turnaround" and pr_rhythm not in ("ending", "launch"):
        pr_rhythm = "turnaround"
    rhythm_skeleton = _build_rhythm_skeleton(bar_index, pr_rhythm)
    prompt_variant = _prompt_variant_hash(
        function_tag,
        rhythm_skeleton,
        motif_line,
    )
    key = _gce_cache_key(chord_symbols, generation_seed, bar_index, prompt_variant)

    gce_notes: Optional[List[Dict[str, Any]]] = _GCE_CACHE.get(key)

    if gce_notes is None:
        gce_notes = _generate_monk_phrase_via_claude(
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
        notes = _apply_post_validators(
            notes,
            phrase_role,
            bar_index,
            generation_seed,
            chord_root,
            chord_kind,
        )
        notes = _maybe_half_note_bar_end(notes, bar_index)
        attacks = [n for n in notes if not n.get("is_rest")]
        if attacks:
            next_pitch = _midi_from_note_dict(attacks[-1])
        else:
            next_pitch = start_pitch
        _append_motif_bar(notes, bar_index)
        _GCE_PREV_CHORD = c0
        return notes, next_pitch

    notes, next_pitch = _generate_monk_phrase_deterministic(
        chord_symbols,
        phrase_role,
        start_pitch,
        generation_seed,
        section_index,
        bar_index,
    )
    notes = _apply_post_validators(
        notes,
        phrase_role,
        bar_index,
        generation_seed,
        chord_root,
        chord_kind,
    )
    attacks = [n for n in notes if not n.get("is_rest")]
    if attacks:
        next_pitch = _midi_from_note_dict(attacks[-1])
    else:
        next_pitch = start_pitch
    _append_motif_bar(notes, bar_index)
    _GCE_PREV_CHORD = c0
    return notes, next_pitch
