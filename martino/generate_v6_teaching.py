#!/usr/bin/env python3
"""
V6 Teaching Mode: ONE FILE PER ACTIVITY PER TUNE.
Exercise generator only; no solo phrasing. Strict chord grids; LFV 5-9.
Output: V6_Teaching_<TuneName>_<Activity>.musicxml (8 files).

TEACHING DEFAULT GUARDRAILS (all future Teaching Mode runs):
1) Section markers: every Teaching file MUST include rehearsal marks. Blues: A=1, B=5, C=9. AABA/AB: mark A and B explicitly.
2) A4 (ANCHOR_ARP): strong beats (1 and 3) must land on chord tones; non-chord tones only on weak beats. Clarity over sophistication.
3) A1 (LINEAR_CORE): single minor lane unless chord grid explicitly requires a change. Avoid colour tones that blur behaviour recognition.
4) Display hygiene: chord symbols ONLY via <harmony>. No per-bar chord-name <direction><words>. Words allowed only for rehearsal, LFV (*), header.
5) Teaching-first: optimise for behaviour recognition, clarity, repeatability. Musical polish secondary.
"""
from __future__ import annotations

import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

_ENGINE_DIR = Path(__file__).resolve().parent
_OUT_DIR = _ENGINE_DIR

# Import shared helpers and chord grids from V5
sys.path.insert(0, str(_ENGINE_DIR))
import generate_v5 as v5

try:
    from validation import next_version_prefix
except ImportError:
    next_version_prefix = None

def _el(tag: str, text: str | None = None, **attrib: Any) -> ET.Element:
    e = ET.Element(tag, attrib=attrib)
    if text is not None:
        e.text = str(text)
    return e

def _sub(parent: ET.Element, tag: str, text: str | None = None, **attrib: Any) -> ET.Element:
    e = _el(tag, text=text, **attrib)
    parent.append(e)
    return e

# --- Activities (A1-A4 + A5 FREE_MIX for single-tune Teaching) ---
ACTIVITIES = [
    ("A1", "LINEAR_CORE", "One continuous minor-based linear line spanning multiple measures without reacting to each chord."),
    ("A2", "DIAGONAL_BRIDGE", "Stepwise or arpeggiated motion that connects harmony by smooth directional movement rather than chord targets."),
    ("A3", "PIVOT_CELL", "A short 3-4 note cell repeated and shifted (by half-step or minor third) to hover over ambiguous harmony."),
    ("A4", "ANCHOR_ARP", "Stable arpeggio logic that outlines functional gravity (ii-V, pedal, or slash-bass areas) without scale running."),
    ("A5", "FREE_MIX", "Controlled combination of A1-A4 sparingly; intentional, not busy."),
]

LFV_RANGE = "5-9"

# --- Tune configs: 16-bar, one chorus only ---
ORBIT_16 = {
    "name": "Orbit 5X Version 2",
    "short": "Orbit5X_Version2",
    "chords": v5.ORBIT_CHORDS,
    "time": (3, 4),
    "rehearsal": {1: "A", 9: "B", 13: "C"},
    "repeat_forward": [1, 9],
    "repeat_backward": [8, 12],
    "divisions": 2,
}

BEATRICE_16 = {
    "name": "Beatrice",
    "short": "Beatrice",
    "chords": v5.BEATRICE_CHORDS,
    "bar_two_chords": v5.BEATRICE_BAR_TWO_CHORDS,
    "time": (4, 4),
    "rehearsal": {1: "A", 5: "B", 9: "C"},
    "repeat_forward": [1, 5],
    "repeat_backward": [4, 8],
    "divisions": 2,
}

# Asterisk measures per (tune_short, activity_id): where activity doesn't fit or LFV exit
TEACHING_ASTERISK = {
    ("Orbit5X_Version2", "A1"): {9, 10, 11, 12, 14},
    ("Orbit5X_Version2", "A2"): {8, 12, 14},
    ("Orbit5X_Version2", "A3"): {9, 10, 11, 12, 14, 15},
    ("Orbit5X_Version2", "A4"): {1, 2, 3, 4, 5, 6, 7, 8, 13, 15, 16},
    ("Beatrice", "A1"): {2, 7, 11, 14},
    ("Beatrice", "A2"): {7, 11},
    ("Beatrice", "A3"): {7, 11, 14},
    ("Beatrice", "A4"): {1, 2, 3, 4, 9, 12, 13, 15, 16},
    ("C_Minor_Blues", "A1"): set(),
    ("C_Minor_Blues", "A2"): set(),
    ("C_Minor_Blues", "A3"): set(),
    ("C_Minor_Blues", "A4"): set(),
    ("C_Minor_Blues", "A5"): set(),
    ("BlueBossa", "A1"): set(),
    ("BlueBossa", "A2"): set(),
    ("BlueBossa", "A3"): set(),
    ("BlueBossa", "A4"): set(),
    ("BlueBossa", "A5"): set(),
    ("StolenMoments", "A1"): set(),
    ("StolenMoments", "A4"): set(),
    ("WorkSong", "A1"): set(),
    ("WorkSong", "A4"): set(),
}

# Stolen Moments: 22 bars, A(1-8) repeat x2, B(9-22). Exact iReal form.
STOLEN_MOMENTS_CHORDS = [
    "C-7", "D-7/C", "Eb\u0394\u0037/C", "D-7/C", "C-7", "C-6", "C-7", "C-6",
    "F-7", "F-6", "C-7", "C-6", "D-", "D#\u00f87", ("E-", "F-"), ("F#\u00f87", "F-"),
    "E-", "Eb-", ("D-7", "D#o7"), ("C7/E", "F-"), "C-", "G7",
]
STOLEN_MOMENTS_BAR_TWO = (14, 15, 18, 19)
STOLEN_MOMENTS_22 = {
    "name": "Stolen Moments",
    "short": "StolenMoments",
    "chords": STOLEN_MOMENTS_CHORDS,
    "bar_two_chords": STOLEN_MOMENTS_BAR_TWO,
    "time": (4, 4),
    "rehearsal": {1: "A", 9: "B"},
    "repeat_forward": [1],
    "repeat_backward": [8],
    "repeat_times": 2,
    "divisions": 2,
    "key_fifths": -3,
    "key_mode": "minor",
    "minor_lane": "C",
    "harmony_only": True,
}

# Work Song (Nat Adderley): 16 bars, A(1-8) repeat x2, B(9-16). F minor.
WORK_SONG_CHORDS = [
    "F-7", "F-7", "F-7", "F-7", "Bb-7", "Bb-7", "F-7", "F-7",
    "Db7", "Db7", "F-7", "F-7", "G\u00f87", "C7", "F-7", "C7",
]
WORK_SONG_16 = {
    "name": "Work Song",
    "short": "WorkSong",
    "chords": WORK_SONG_CHORDS,
    "time": (4, 4),
    "rehearsal": {1: "A", 5: "B", 9: "C"},
    "repeat_forward": [1],
    "repeat_backward": [8],
    "repeat_times": 2,
    "divisions": 2,
    "key_fifths": -4,
    "key_mode": "minor",
    "minor_lane": "F",
    "harmony_only": True,
}

# Blue Bossa: 16 bars, A(1-4) B(5-8) C(9-16), bar 16 split Dø7 | G7(b9)
BLUE_BOSSA_CHORDS = [
    "C-7", "C-7", "F-7", "F-7",
    "D\u00f87", "G7(b9)", "C-7", "C-7",
    "Eb-7", "Ab7", "Db\u0394\u0037", "Db\u0394\u0037",
    "D\u00f87", "G7(b9)", "C-7", ("D\u00f87", "G7(b9)"),
]
BLUE_BOSSA_BAR_TWO_CHORDS = (15,)  # bar 16
BLUE_BOSSA_16 = {
    "name": "Blue Bossa",
    "short": "BlueBossa",
    "chords": BLUE_BOSSA_CHORDS,
    "bar_two_chords": BLUE_BOSSA_BAR_TWO_CHORDS,
    "time": (4, 4),
    "rehearsal": {1: "A", 5: "B", 9: "C"},
    "repeat_forward": [],
    "repeat_backward": [],
    "divisions": 2,
    "key_fifths": -3,
    "key_mode": "minor",
    "minor_lane": "C",
}

# 12-bar C minor blues (no repeats for Teaching)
C_MINOR_BLUES_CHORDS = [
    "C-7", "C-7", "C-7", "C-7",
    "F-7", "F-7", "C-7", "C-7",
    "Ab7", "G7", "C-7", "G7",
]
C_MINOR_BLUES_12 = {
    "name": "C Minor Blues (12-bar)",
    "short": "C_Minor_Blues",
    "chords": C_MINOR_BLUES_CHORDS,
    "time": (4, 4),
    "rehearsal": {1: "A", 5: "B", 9: "C"},
    "repeat_forward": [],
    "repeat_backward": [],
    "divisions": 2,
    "key_fifths": -3,
    "key_mode": "minor",
    "minor_lane": "C",
}

# --- LFV: frets 5-9 -> prefer G3 (55) to B4 (68) midi. Notes as (step, oct, alter). ---
_LFV_POOL = [
    ("G",3,None),("Ab",3,-1),("A",3,None),("Bb",3,None),("B",3,None),("C",4,None),("Db",4,-1),("D",4,None),
    ("Eb",4,-1),("E",4,None),("F",4,None),("Gb",4,-1),("G",4,None),("Ab",4,-1),("A",4,None),("Bb",4,None),("B",4,None),
]
# F minor lane (stepwise bias)
_F_MINOR = [("F",3,None),("G",3,None),("Ab",3,-1),("Bb",3,None),("C",4,None),("Db",4,-1),("Eb",4,-1),("F",4,None)]
# C minor lane (for 12-bar blues etc.)
_C_MINOR = [("C",3,None),("D",3,None),("Eb",3,-1),("F",3,None),("G",3,None),("Ab",4,-1),("Bb",4,None),("C",4,None)]
# Bb minor lane (blues context, Tenor Madness)
_BB_MINOR = [("Bb",3,None),("C",4,None),("Db",4,-1),("Eb",4,-1),("F",4,None),("Gb",4,-1),("Ab",4,-1),("Bb",4,None)]

def _chord_to_tones(chord_text: str) -> list[tuple[str, int, int | None]]:
    """Chord symbol -> 1,3,5,7 in LFV (oct 3-4). For A4."""
    root_step, root_alter, kind_text, _, _ = v5._parse_exact_chord(chord_text)
    quality = v5._kind_base_quality(kind_text)
    # Root to semitone (C=0)
    letter_to_st = {"C":0,"D":2,"E":4,"F":5,"G":7,"A":9,"B":11}
    st = letter_to_st.get(root_step.upper(), 0) + (root_alter or 0)
    if quality == "major-seventh":
        intervals = [0, 4, 7, 11]
    elif quality == "minor-seventh" or quality == "minor-ninth":
        intervals = [0, 3, 7, 10]
    elif quality == "minor":
        intervals = [0, 3, 7]
    elif quality == "dominant":
        intervals = [0, 4, 7, 10]
    elif quality == "diminished-seventh":
        intervals = [0, 3, 6, 9]
    else:  # half-diminished
        intervals = [0, 3, 6, 10]
    st_to_note = [(None,None)]*12
    st_to_note[0], st_to_note[1], st_to_note[2] = ("C",None), ("Db",-1), ("D",None)
    st_to_note[3], st_to_note[4], st_to_note[5] = ("Eb",-1), ("E",None), ("F",None)
    st_to_note[6], st_to_note[7], st_to_note[8] = ("Gb",-1), ("G",None), ("Ab",-1)
    st_to_note[9], st_to_note[10], st_to_note[11] = ("A",None), ("Bb",-1), ("B",None)
    out = []
    for i in intervals:
        p = (st + i) % 12
        step, alt = st_to_note[p]
        octave = 4 if p >= 5 else 3
        if step in ("C","D","E","F") and octave == 3:
            octave = 3
        elif step in ("G","A","B") and octave == 3:
            octave = 3
        out.append((step, octave, alt))
    return out

def _melody_a1_linear(bar_0: int, n_eighths: int, minor_lane: str = "F") -> list[tuple[str, int, int | None, int]]:
    """A1: Single minor lane (F, C, or Bb); stepwise + small 3rds. Guardrail 3: no lane change unless grid requires."""
    if minor_lane == "C":
        scale = _C_MINOR
    elif minor_lane == "Bb":
        scale = _BB_MINOR
    else:
        scale = _F_MINOR
    start = (bar_0 * 5) % 8
    out = []
    for i in range(n_eighths):
        idx = (start + i) % 8
        if i > 0 and i % 3 == 0 and idx < 6:
            idx = (idx + 2) % 8
        s, o, a = scale[idx]
        out.append((s, o, a, 1))
    return out

def _melody_a2_diagonal(bar_0: int, n_eighths: int) -> list[tuple[str, int, int | None, int]]:
    """A2: Directional 2-4 bars; more 3rds/4ths (skip by 2 in pool)."""
    direction = 1 if (bar_0 // 2) % 2 == 0 else -1
    pool = _LFV_POOL
    L = len(pool)
    start_idx = (bar_0 * 4) % L
    out = []
    for i in range(n_eighths):
        step = 2 if direction == 1 else -2
        idx = (start_idx + i * step) % L
        if idx < 0:
            idx += L
        s, o, a = pool[idx]
        out.append((s, o, a, 1))
    return out

def _melody_a3_pivot_cell(bar_0: int, n_eighths: int) -> list[tuple[str, int, int | None, int]]:
    """A3: 3-note cell repeated, shift by half-step or m3 every 1-2 bars."""
    shift = bar_0 // 2
    cells = [
        [("C",4,None),("Eb",4,-1),("G",4,None)],
        [("Db",4,-1),("E",4,None),("Ab",4,-1)],
        [("D",4,None),("F",4,None),("A",4,None)],
        [("Eb",4,-1),("Gb",4,-1),("Bb",4,None)],
    ]
    cell = cells[shift % 4]
    out = []
    for i in range(n_eighths):
        s, o, a = cell[i % 3]
        out.append((s, o, a, 1))
    return out

def _melody_a4_anchor_arp(chord_entry: Any, n_eighths: int, beats_per_bar: int) -> list[tuple[str, int, int | None, int]]:
    """A4: Chord tones on strong beats (1 and 3); broken arpeggio 1-3-5-7. Guardrail 2: strong beats = chord tones only."""
    chord_text = chord_entry[0] if isinstance(chord_entry, (list, tuple)) else chord_entry
    tones = _chord_to_tones(chord_text)
    out = []
    for i in range(n_eighths):
        s, o, a = tones[i % len(tones)]
        out.append((s, o, a, 1))
    return out

def _melody_a5_free_mix(
    bar_0: int, n_eighths: int, chord_entry: Any, beats_per_bar: int, minor_lane: str,
) -> list[tuple[str, int, int | None, int]]:
    """A5: Combine A1 (0-2), A2 (3-5), A3 (6-8), A4 (9-11) by section."""
    if bar_0 <= 2:
        return _melody_a1_linear(bar_0, n_eighths, minor_lane)
    if bar_0 <= 5:
        return _melody_a2_diagonal(bar_0, n_eighths)
    if bar_0 <= 8:
        return _melody_a3_pivot_cell(bar_0, n_eighths)
    return _melody_a4_anchor_arp(chord_entry, n_eighths, beats_per_bar)

def _melody_bar(
    tune_short: str,
    activity_id: str,
    bar_0: int,
    beats_per_bar: int,
    chord_entry: Any = None,
    minor_lane: str = "F",
) -> list[tuple[str, int, int | None, int]]:
    """Activity-specific note stream. chord_entry used for A4/A5."""
    n = 6 if beats_per_bar == 3 else 8
    if activity_id == "A1":
        return _melody_a1_linear(bar_0, n, minor_lane)
    if activity_id == "A2":
        return _melody_a2_diagonal(bar_0, n)
    if activity_id == "A3":
        return _melody_a3_pivot_cell(bar_0, n)
    if activity_id == "A4":
        return _melody_a4_anchor_arp(chord_entry or "F", n, beats_per_bar)
    if activity_id == "A5":
        return _melody_a5_free_mix(bar_0, n, chord_entry or "C-7", beats_per_bar, minor_lane)
    return _melody_a1_linear(bar_0, n, minor_lane)

def _add_note(meas: ET.Element, step: str, octave: int, alter: int | None, duration: int, voice: int = 1) -> None:
    n = _el("note")
    p = _sub(n, "pitch")
    s = step[0] if len(step) > 1 else step
    _sub(p, "step", s)
    if alter is not None:
        _sub(p, "alter", str(alter))
    elif "b" in step:
        _sub(p, "alter", "-1")
    elif "#" in step:
        _sub(p, "alter", "1")
    _sub(p, "octave", str(octave))
    _sub(n, "duration", str(duration))
    _sub(n, "type", "quarter" if duration == 2 else "eighth")
    _sub(n, "voice", str(voice))
    meas.append(n)

def _next_v6_prefix(out_dir: Path, base_name: str) -> str:
    if next_version_prefix:
        return next_version_prefix("V6", out_dir, base_name)
    for i in range(0, 25):
        p = f"V6.{i}" if i > 0 else "V6"
        if not (out_dir / f"{p}_{base_name}.musicxml").exists():
            return p
    return "V6"

OVERWRITE_EXISTING = True  # V6_TEACHING_OVERWRITE: write exact filenames, replace if exists

def _teaching_output_path(out_dir: Path, tune_short: str, activity_id: str, output_prefix: str, overwrite: bool) -> Path:
    """Resolve path: Teaching_<tune>_<aid>.musicxml; if not overwrite and exists, use _2, _3..."""
    base = f"{output_prefix}_{tune_short}_{activity_id}.musicxml"
    path = out_dir / base
    if overwrite or not path.exists():
        return path
    for n in range(2, 50):
        path = out_dir / f"{output_prefix}_{tune_short}_{activity_id}_{n}.musicxml"
        if not path.exists():
            return path
    return out_dir / base

def build_teaching_file(
    out_dir: Path,
    tune_config: dict,
    tune_short: str,
    activity_id: str,
    activity_name: str,
    activity_def: str,
    overwrite: bool = False,
    output_prefix: str = "V6",
) -> Path:
    """Build one MusicXML: one chorus (measure count = len(chords)), one activity. output_prefix 'Teaching' -> Teaching_<tune>_<aid>.musicxml."""
    root = ET.Element("score-partwise", version="3.1")
    title = f"{tune_config['name']} – Teaching ({activity_id} {activity_name})"
    _sub(root, "work").append(_el("work-title", title))
    plist = _sub(root, "part-list")
    sp = _el("score-part", id="P1")
    plist.append(sp)
    _sub(sp, "part-name", "Guitar")
    part = ET.SubElement(root, "part", id="P1")
    chords = tune_config["chords"]
    num_measures = len(chords)
    beats_per_bar = tune_config["time"][0]
    asterisk_set = TEACHING_ASTERISK.get((tune_short, activity_id), set())
    bar_two = tune_config.get("bar_two_chords")
    minor_lane = tune_config.get("minor_lane", "F")
    key_fifths = tune_config.get("key_fifths", -1)
    key_mode = tune_config.get("key_mode", "major")
    # Guardrail 1: section markers mandatory; default blues A=1, B=5, C=9 if missing
    rehearsal = tune_config.get("rehearsal") or {1: "A", 5: "B", 9: "C"}

    if output_prefix in ("Teaching", "V1_Teaching"):
        out_path = _teaching_output_path(out_dir, tune_short, activity_id, output_prefix, overwrite)
    else:
        base_name = f"Teaching_{tune_short}_{activity_id}"
        prefix = "V6" if overwrite else _next_v6_prefix(out_dir, base_name)
        out_path = out_dir / f"{prefix}_{base_name}.musicxml"

    header = f"Teaching | {tune_config['name']} | {activity_id} {activity_name} | {activity_def} | LFV {LFV_RANGE}"

    for m in range(1, num_measures + 1):
        meas = ET.SubElement(part, "measure", number=str(m))
        if m == 1:
            att = _sub(meas, "attributes")
            _sub(att, "divisions", str(tune_config["divisions"]))
            k = _sub(att, "key")
            _sub(k, "fifths", str(key_fifths))
            _sub(k, "mode", key_mode)
            t = _sub(att, "time")
            _sub(t, "beats", str(tune_config["time"][0]))
            _sub(t, "beat-type", str(tune_config["time"][1]))
            c = _sub(att, "clef")
            _sub(c, "sign", "G")
            _sub(c, "line", "2")
            v5._add_words(meas, header)
        if m in rehearsal:
            v5._add_rehearsal(meas, rehearsal[m])
        bar_0 = m - 1
        chord_entry = chords[bar_0]
        # Guardrail 4: Teaching Mode — chords ONLY via <harmony>; no per-bar chord words
        add_words = False
        if bar_two is not None and bar_0 in bar_two and isinstance(chord_entry, tuple):
            for ch in chord_entry:
                v5._add_harmony(meas, ch, add_words=False)
            if add_words:
                v5._add_words(meas, chord_entry[0] + " | " + chord_entry[1])
        else:
            v5._add_harmony(meas, chord_entry, add_words=add_words)
        if m in asterisk_set:
            v5._add_words(meas, "*")
        for (st, oct, alt, dur) in _melody_bar(tune_short, activity_id, bar_0, beats_per_bar, chord_entry, minor_lane):
            _add_note(meas, st, oct, alt, dur)
        if m in tune_config.get("repeat_forward", []):
            v5._add_barline(meas, "forward")
        elif m in tune_config.get("repeat_backward", []):
            v5._add_barline(meas, "backward", times=tune_config.get("repeat_times", 2))
    tree = ET.ElementTree(root)
    ET.indent(tree, space="  ")
    tree.write(out_path, encoding="UTF-8", xml_declaration=True, default_namespace="", method="xml")
    return out_path

def _get_pitch_sequence_from_musicxml(path: Path) -> list[tuple[str, int, int | None]]:
    """Extract (step, octave, alter) for each note in order, per measure flattened."""
    tree = ET.parse(path)
    part = tree.getroot().find("part")
    out = []
    if part is None:
        return out
    for meas in part.findall("measure"):
        for note in meas.findall("note"):
            if note.find("rest") is not None:
                continue
            p = note.find("pitch")
            if p is None:
                continue
            step_el = p.find("step")
            oct_el = p.find("octave")
            alt_el = p.find("alter")
            step = step_el.text or "C"
            octave = int(oct_el.text or 4)
            alter = int(alt_el.text) if alt_el is not None and alt_el.text else None
            out.append((step, octave, alter))
    return out


def _count_asterisk_measures(path: Path) -> int:
    tree = ET.parse(path)
    part = tree.getroot().find("part")
    count = 0
    if part is None:
        return 0
    for meas in part.findall("measure"):
        for d in meas.findall("direction"):
            w = d.find("direction-type/words")
            if w is not None and w.text and w.text.strip() == "*":
                count += 1
                break
    return count


def _validate_a1_vs_a4_not_identical(out_dir: Path, tune_short: str, prefix: str = "V6_Teaching") -> bool:
    base_a1 = f"{prefix}_{tune_short}_A1.musicxml"
    base_a4 = f"{prefix}_{tune_short}_A4.musicxml"
    p1 = out_dir / base_a1
    p4 = out_dir / base_a4
    if not p1.exists():
        p1 = out_dir / f"Teaching_{tune_short}_A1.musicxml"
    if not p4.exists():
        p4 = out_dir / f"Teaching_{tune_short}_A4.musicxml"
    if not p1.exists() or not p4.exists():
        return False
    seq1 = _get_pitch_sequence_from_musicxml(p1)
    seq4 = _get_pitch_sequence_from_musicxml(p4)
    if len(seq1) != len(seq4):
        return True
    return seq1 != seq4


def main() -> None:
    out_dir = Path(_OUT_DIR)
    out_dir.mkdir(parents=True, exist_ok=True)
    overwrite = OVERWRITE_EXISTING
    tunes = [
        (ORBIT_16, "Orbit5X_Version2"),
        (BEATRICE_16, "Beatrice"),
    ]
    max_retries = 2
    for attempt in range(max_retries + 1):
        paths = []
        for tune_config, tune_short in tunes:
            for aid, aname, adef in ACTIVITIES:
                p = build_teaching_file(out_dir, tune_config, tune_short, aid, aname, adef, overwrite=overwrite)
                paths.append(p)
        a1_vs_a4_ok = all(_validate_a1_vs_a4_not_identical(out_dir, t[1]) for t in tunes)
        if a1_vs_a4_ok:
            break
    # Report
    print("Overwritten:" if overwrite else "Written:")
    for p in paths:
        print(f"  {p}")
    print("Asterisk count per file:")
    for p in paths:
        n = _count_asterisk_measures(p)
        print(f"  {p.name}: {n}")
    print("A1 vs A4 identical check:")
    for _, tune_short in tunes:
        ok = _validate_a1_vs_a4_not_identical(out_dir, tune_short)
        print(f"  {tune_short}: {'PASS' if ok else 'FAIL'}")


if __name__ == "__main__":
    main()
