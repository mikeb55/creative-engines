"""Compile Charlie Parker–style lead-sheet data from chord sequences."""

from __future__ import annotations

import re as _re
from typing import Any, Dict, List, Tuple

from parker_phrase_engine import (
    _midi_from_note_dict,
    detect_harmonic_context,
    generate_parker_chorus,
    generate_parker_phrase,
    generate_parker_section,
)

DIVISIONS = 4
CAPACITY = 16  # one 4/4 bar at divisions=4

NOTE_TO_PC = {"c": 0, "d": 2, "e": 4, "f": 5, "g": 7, "a": 9, "b": 11}

_DEFAULT_CHORDS = ["Dm7", "G7", "Cmaj7"]

_FORM_TARGET_BARS = {
    "aaba": 32,
    "abac": 32,
    "aba": 24,
    "ab": 16,
    "blues12": 12,
    "blues24": 24,
    "aab": 24,
    "abcb": 32,
}


def chord_function(sym: str) -> str:
    """Classify chord for vocabulary lookup (prompt rules)."""
    base = sym.split("/")[0].strip()
    lower = base.lower()
    if "ø" in base or "m7b5" in lower:
        return "ii"
    if "sus" in lower:
        return "dominant"
    if "maj7" in lower or "Δ" in base or ("maj" in lower and "7" in lower):
        return "I"
    if lower.endswith("m7") or "-7" in lower:
        if "b5" in lower or "ø" in base:
            return "ii"
        return "ii"
    if lower.endswith("7") and "maj" not in lower and "m7" not in lower:
        return "V"
    return "tonic"


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


def _slash_bass(sym: str) -> str | None:
    if "/" not in sym:
        return None
    right = sym.split("/", 1)[1].strip()
    m = _re.match(r"^([A-Ga-g])", right)
    return m.group(1).upper() if m else None


def _midi_for_interval(sym: str, interval_from_root: int, bar_seed: int) -> int:
    pc = _root_pc(sym)
    base = 60 + ((pc - (60 % 12) + 12) % 12)
    midi = base + interval_from_root
    while midi < 58:
        midi += 12
    while midi > 84:
        midi -= 12
    tweak = (bar_seed // 11) % 2
    if tweak and midi + 12 <= 84:
        midi += 12
    return max(55, min(84, midi))


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


def _fill_bar_capacity(notes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out = list(notes)
    while True:
        total = sum(int(n["duration"]) for n in out if not n.get("is_chord"))
        if total > CAPACITY:
            excess = total - CAPACITY
            if not out:
                break
            last = out[-1]
            last["duration"] = int(last["duration"]) - excess
            if last["duration"] < 1:
                out.pop()
            continue
        if total < CAPACITY:
            out.append(
                _note_shape(CAPACITY - total, is_rest=True),
            )
        break
    return out


def _phrase_role_for_bar(bar_idx: int, total_bars: int) -> str:
    pos = bar_idx % 8
    if pos == 0:
        return "launch"
    if pos >= 6:
        return "ending"
    if total_bars >= 16 and bar_idx >= total_bars - 2:
        return "turnaround"
    return "continuation"


def _section_label_for_block(bar_start: int, song_form: str, total_bars: int) -> str:
    """Labels for 8-bar GCE blocks; AABA 32-bar uses A1/A2/B/A3."""
    sf = (song_form or "aaba").strip().lower()
    if sf == "aaba" and total_bars >= 32:
        if bar_start == 0:
            return "A1"
        if bar_start == 8:
            return "A2"
        if bar_start == 16:
            return "B"
        if bar_start == 24:
            return "A3"
    return f"S{bar_start // 8 + 1}"


def compile_parker_composition(
    title: str,
    chord_sequence: List[str],
    seed: int = 42,
    song_form: str = "aaba",
) -> Dict[str, Any]:
    """
    Build composition dict:
      title, song_form, bars[] with bar_number, chord, chord_function,
      notes[{pitch, octave, alter, duration, type, is_rest, is_chord, dot, triplet}],
      bass_note.
    """
    seq = [str(c).strip() for c in (chord_sequence or []) if c and str(c).strip()]
    if not seq:
        seq = list(_DEFAULT_CHORDS)
    seq = seq[:64]

    sf = (song_form or "aaba").strip().lower()
    if sf not in _FORM_TARGET_BARS:
        sf = "aaba"
    form_target = _FORM_TARGET_BARS[sf]
    # len(chord_sequence) sets minimum length; extend up to song-form length by cycling; cap 64.
    total_bars = min(64, max(len(seq), form_target))
    if total_bars < 1:
        total_bars = 1
        seq = list(_DEFAULT_CHORDS)

    bars_out: List[Dict[str, Any]] = []
    start_pitch = 67

    # Try full-chorus generation first for 32-bar forms; fall back to section flow.
    if total_bars == 32:
        full_chords = [seq[i % len(seq)] for i in range(32)]
        chorus = generate_parker_chorus(full_chords, sf.upper(), seed)
        if len(chorus) == 32:
            bars_out = []
            for b in range(32):
                chord = seq[b % len(seq)]
                nxt = seq[(b + 1) % len(seq)]
                nn = seq[(b + 2) % len(seq)]
                hctx = detect_harmonic_context(chord, nxt, nn)
                notes = _fill_bar_capacity(chorus[b])
                pitched = [n for n in notes if not n.get("is_rest")]
                if not pitched:
                    half = min(8, CAPACITY)
                    pat0 = 0
                    midi = _midi_for_interval(chord, pat0, seed + b)
                    step, alter, octv = _spell_pitch(midi)
                    notes = [_note_shape(half, is_rest=False, step=step, alter=alter, octv=octv)]
                    if half < CAPACITY:
                        notes.append(_note_shape(CAPACITY - half, is_rest=True))
                bars_out.append(
                    {
                        "bar_number": b + 1,
                        "chord": chord,
                        "chord_function": hctx,
                        "notes": notes,
                        "bass_note": _slash_bass(chord),
                    }
                )
            return {
                "title": title,
                "song_form": sf,
                "bars": bars_out,
            }

    bar_idx = 0
    while bar_idx < total_bars:
        remaining = total_bars - bar_idx
        if remaining >= 8:
            label = _section_label_for_block(bar_idx, sf, total_bars)
            ch8 = [seq[(bar_idx + i) % len(seq)] for i in range(8)]
            eight = generate_parker_section(
                ch8,
                label,
                bar_idx,
                seed,
                total_bars=total_bars,
                start_pitch=start_pitch,
            )
            for j in range(8):
                b = bar_idx + j
                chord = seq[b % len(seq)]
                nxt = seq[(b + 1) % len(seq)]
                nn = seq[(b + 2) % len(seq)]
                hctx = detect_harmonic_context(chord, nxt, nn)
                notes = eight[j]

                notes = _fill_bar_capacity(notes)
                pitched = [n for n in notes if not n.get("is_rest")]
                if not pitched:
                    half = min(8, CAPACITY)
                    pat0 = 0
                    midi = _midi_for_interval(chord, pat0, seed + b)
                    step, alter, octv = _spell_pitch(midi)
                    notes = [_note_shape(half, is_rest=False, step=step, alter=alter, octv=octv)]
                    if half < CAPACITY:
                        notes.append(_note_shape(CAPACITY - half, is_rest=True))

                bars_out.append(
                    {
                        "bar_number": b + 1,
                        "chord": chord,
                        "chord_function": hctx,
                        "notes": notes,
                        "bass_note": _slash_bass(chord),
                    }
                )
            last_notes = eight[-1]
            lp = [n for n in last_notes if not n.get("is_rest")]
            if lp:
                start_pitch = _midi_from_note_dict(lp[-1])
            bar_idx += 8
            continue

        chord = seq[bar_idx % len(seq)]
        nxt = seq[(bar_idx + 1) % len(seq)]
        nn = seq[(bar_idx + 2) % len(seq)]
        window = [chord, nxt, nn]
        hctx = detect_harmonic_context(chord, nxt, nn)
        phrase_role = _phrase_role_for_bar(bar_idx, total_bars)
        if hctx == "turnaround" and phrase_role not in ("ending", "launch"):
            phrase_role = "turnaround"
        section_index = bar_idx // 8
        gen_seed = seed + bar_idx * 17
        notes, start_pitch = generate_parker_phrase(
            window,
            phrase_role,
            start_pitch,
            gen_seed,
            section_index,
            bar_idx,
        )

        notes = _fill_bar_capacity(notes)
        pitched = [n for n in notes if not n.get("is_rest")]
        if not pitched:
            half = min(8, CAPACITY)
            pat0 = 0
            midi = _midi_for_interval(chord, pat0, seed + bar_idx)
            step, alter, octv = _spell_pitch(midi)
            notes = [_note_shape(half, is_rest=False, step=step, alter=alter, octv=octv)]
            if half < CAPACITY:
                notes.append(_note_shape(CAPACITY - half, is_rest=True))

        bars_out.append(
            {
                "bar_number": bar_idx + 1,
                "chord": chord,
                "chord_function": hctx,
                "notes": notes,
                "bass_note": _slash_bass(chord),
            }
        )
        bar_idx += 1

    return {
        "title": title,
        "song_form": sf,
        "bars": bars_out,
    }
