#!/usr/bin/env python3
"""
V5 Martino Linear Engine: form repeats (A and B repeat), <harmony> on every measure,
two full playthroughs, rehearsal A/B/C, LFV 5-9, activity maps, validation.
Output: V5.2_Orbit5X_TwoPlaythroughs_Martino.musicxml, V5.2_Beatrice_TwoPlaythroughs_Martino.musicxml
"""
from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

_ENGINE_DIR = Path(__file__).resolve().parent
_OUT_DIR = _ENGINE_DIR

try:
    from validation import run_validation, next_version_prefix
except ImportError:
    run_validation = None
    next_version_prefix = None

# --- Helpers ---
def _el(tag: str, text: str | None = None, **attrib: Any) -> ET.Element:
    e = ET.Element(tag, attrib=attrib)
    if text is not None:
        e.text = str(text)
    return e

def _sub(parent: ET.Element, tag: str, text: str | None = None, **attrib: Any) -> ET.Element:
    e = _el(tag, text=text, **attrib)
    parent.append(e)
    return e

def _parse_exact_chord(chord_text: str) -> tuple[str, int | None, str, str | None, int | None]:
    """Extract root (step, alter), kind_text EXACT from chart, bass if slash. No simplification."""
    s = chord_text.strip()
    if "/" in s:
        main, bass_part = s.split("/", 1)
        main, bass_part = main.strip(), bass_part.strip().split()[0] if bass_part else ""
    else:
        main, bass_part = s, ""
    root_step = main[0] if main else "C"
    root_alter = None
    i = 1
    while i < len(main) and main[i] in ("b", "♭", "#", "♯"):
        if main[i] in ("b", "♭"):
            root_alter = -1
        else:
            root_alter = 1
        i += 1
    kind_text = main[i:].strip() if i < len(main) else "7"
    bass_step = bass_part[0] if bass_part else None
    bass_alter = None
    if bass_part and len(bass_part) > 1 and bass_part[1] in ("b", "♭", "#", "♯"):
        bass_alter = -1 if bass_part[1] in ("b", "♭") else 1
    return (root_step, root_alter, kind_text, bass_step, bass_alter)

def _kind_base_quality(kind_text: str) -> str:
    """Map kind display text to MusicXML kind value. R4: ASCII hyphen -7 = minor-seventh."""
    k = kind_text.strip()
    if "\u00f8" in k or "o/" in k or "half-dim" in k:
        return "half-diminished"
    if "o7" in k or "dim7" in k or "diminished" in k.lower():
        return "diminished-seventh"
    if "\u2212\u0037" in k or "\u2212" in k or "min" in k or "-7" in k or "m7" in k:
        return "minor-seventh"
    if "-6" in k or "m6" in k:
        return "minor-sixth"
    if k == "-" or k in ("m", "min"):
        return "minor"
    if "m9" in k or "min9" in k:
        return "minor-ninth"
    if "7(b9)" in k or "7(b" in k or ("7" in k and "\u0394" not in k and "maj" not in k):
        return "dominant"
    if "\u0394" in k or "maj7" in k or "maj" in k or "Δ" in k:
        return "major-seventh"
    return "major-seventh"

def _add_harmony(meas: ET.Element, chord_text: str, add_words: bool = True) -> None:
    """Root + kind (base quality) + kind text=full symbol; optional direction words."""
    step, alter, kind_text, bass_step, bass_alter = _parse_exact_chord(chord_text)
    h = _el("harmony", default_y="50", placement="above")
    root_el = _sub(h, "root")
    _sub(root_el, "root-step", step)
    if alter is not None:
        _sub(root_el, "root-alter", str(alter))
    k = _sub(h, "kind")
    k.set("value", _kind_base_quality(kind_text))
    k.set("text", chord_text)
    if bass_step is not None:
        bass_el = _sub(h, "bass")
        _sub(bass_el, "bass-step", bass_step)
        if bass_alter is not None:
            _sub(bass_el, "bass-alter", str(bass_alter))
    meas.append(h)
    if add_words:
        _add_chord_words(meas, chord_text)


def _add_chord_words(meas: ET.Element, chord_text: str) -> None:
    """Add direction with words = chord symbol (required for display in many apps)."""
    d = _el("direction", placement="above")
    _sub(_sub(d, "direction-type"), "words", text=chord_text)
    meas.append(d)

def _add_barline(meas: ET.Element, direction: str, times: int | None = None) -> None:
    """direction = 'forward' or 'backward'. Append at end of measure."""
    loc = "left" if direction == "forward" else "right"
    bl = _el("barline", location=loc)
    r = _el("repeat", direction=direction)
    if times is not None and direction == "backward":
        r.set("times", str(times))
    bl.append(r)
    meas.append(bl)

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

def _add_rehearsal(meas: ET.Element, mark: str) -> None:
    """Rehearsal mark (V4.1: direction > direction-type > rehearsal, no font-weight)."""
    d = _el("direction", placement="above")
    _sub(_sub(d, "direction-type"), "rehearsal", mark)
    meas.append(d)

def _add_words(meas: ET.Element, text: str) -> None:
    d = _el("direction", placement="above")
    _sub(_sub(d, "direction-type"), "words", text=text)
    meas.append(d)

def _increment_v5(out_dir: Path, base_name: str, requested_prefix: str = "V5.2") -> str:
    """Use validation.next_version_prefix if available; else local fallback."""
    if next_version_prefix is not None:
        return next_version_prefix(requested_prefix, out_dir, base_name)
    for i in range(2, 25):
        prefix = f"V5.{i}_"
        cand = out_dir / f"{prefix}{base_name}.musicxml"
        if not cand.exists():
            return f"V5.{i}"
    return "V5.2"

# --- ORBIT 5X VERSION 2: 16-bar form. R4 ASCII hyphen in chord text; exact chart symbols. ---
ORBIT_CHORDS = [
    "F\u0394\u0037(#11)", "E\u266d\u0394\u0037(#5)", "D\u266d\u0394\u0037", "B\u0394\u0037", "B\u266dm9", "A\u266d\u0394\u0037", "G\u0394\u0037", "E\u0394\u0037",
    "G\u0394/F", "G\u0394/F", "E\u266d\u0394/F", "E\u266d\u0394/F",
    "D\u266d\u0394\u0037", "B\u266d7", "F\u0394\u0037", "F\u0394\u0037",
]
ORBIT_A_REPEAT_START = (1, 17)
ORBIT_A_REPEAT_END = (8, 24)
ORBIT_B_REPEAT_START = (9, 25)
ORBIT_B_REPEAT_END = (12, 28)
ORBIT_REHEARSAL = {1: "A", 9: "B", 13: "C", 17: "A", 25: "B", 29: "C"}
# R7: measures that are NOT primary activity get visible "*" in that measure.
ORBIT_ASTERISK_MEASURES = {9, 10, 11, 12, 14, 25, 26, 27, 28, 30}
# Section activity words at A/B/C (R6): "A: A1", "B: A4*", "C: A1"
ORBIT_SECTION_ACTIVITY = {1: "A: A1", 9: "B: A4*", 13: "C: A1", 17: "A: A1", 25: "B: A4*", 29: "C: A1"}
ORBIT_HEADER = "V5.3 Orbit 5X Version 2 | PT1: A1 LINEAR_CORE | PT2: A1+A4* (B) | LFV 5-9"

def orbit_melody_bar(bar_0: int, playthrough: int) -> list[tuple[str, int, int | None, int]]:
    bars_p1 = [
        [("F",3,None,2),("G",3,None,1),("Ab",3,-1,1),("Bb",3,None,2)],
        [("C",4,None,1),("Bb",3,None,1),("Ab",3,-1,2),("G",3,None,1),("F",3,None,1)],
        [("Bb",3,None,2),("C",4,None,1),("Db",4,-1,1),("Eb",4,-1,2)],
        [("F",4,None,1),("Eb",4,-1,1),("F",4,None,2),("Ab",4,-1,1),("Bb",4,None,1)],
        [("C",4,None,2),("Bb",3,None,2),("Ab",3,-1,1),("G",3,None,1)],
        [("F",3,None,2),("Ab",3,-1,1),("Bb",3,None,1),("C",4,None,2)],
        [("Db",4,-1,1),("Eb",4,-1,1),("F",4,None,2),("Eb",4,-1,1),("Db",4,-1,1)],
        [("C",4,None,2),("Bb",3,None,1),("Ab",3,-1,1),("F",3,None,2)],
        [("G",3,None,2),("Bb",3,None,1),("C",4,None,1),("D",4,None,2)],
        [("Eb",4,-1,1),("D",4,None,1),("C",4,None,2),("Bb",3,None,1),("A",3,None,1)],
        [("G",3,None,2),("A",3,None,1),("Bb",3,None,1),("C",4,None,2)],
        [("D",4,None,1),("C",4,None,1),("Bb",3,None,2),("G",3,None,1),("F",3,None,1)],
        [("Db",4,-1,2),("Eb",4,-1,1),("F",4,None,1),("Ab",4,-1,2)],
        [("Bb",3,None,1),("C",4,None,1),("Bb",3,None,2),("Ab",3,-1,1),("G",3,None,1)],
        [("F",3,None,2),("Ab",3,-1,1),("Bb",3,None,1),("F",3,None,2)],
        [("F",3,None,2),("Ab",3,-1,1),("Bb",3,None,1),("F",3,None,2)],
    ]
    if playthrough == 1:
        return bars_p1[bar_0] if bar_0 < len(bars_p1) else bars_p1[0]
    bars_p2 = list(bars_p1)
    bars_p2[8] = [("G",3,None,1),("Bb",3,None,1),("C",4,None,1),("D",4,None,1),("Eb",4,-1,1),("D",4,None,1)]
    bars_p2[9] = [("C",4,None,2),("Bb",3,None,1),("G",3,None,2)]
    bars_p2[10] = [("A",3,None,1),("Bb",3,None,1),("C",4,None,2),("D",4,None,1),("C",4,None,1)]
    bars_p2[11] = [("Bb",3,None,2),("G",3,None,1),("F",3,None,2)]
    return bars_p2[bar_0] if bar_0 < len(bars_p2) else bars_p1[bar_0]

def build_orbit_v5(out_dir: Path, repeat_mode: str = "barlines", requested_version: str = "V5.3") -> Path:
    """R6 form boundaries; R7 asterisk in non-primary measures; header at m1 and m17."""
    root = ET.Element("score-partwise", version="3.1")
    _sub(root, "work").append(_el("work-title", "Orbit 5X Version 2 – Two Playthroughs (V5.3 Martino)"))
    plist = _sub(root, "part-list")
    sp = _el("score-part", id="P1")
    plist.append(sp)
    _sub(sp, "part-name", "Guitar")
    part = ET.SubElement(root, "part", id="P1")
    total_measures = 32
    base_name = "Orbit5X_Version2_TwoPlaythroughs_Martino"
    prefix = _increment_v5(out_dir, base_name, requested_version)
    for m in range(1, total_measures + 1):
        meas = ET.SubElement(part, "measure", number=str(m))
        if m == 1:
            att = _sub(meas, "attributes")
            _sub(att, "divisions", "2")
            k = _sub(att, "key")
            _sub(k, "fifths", "-1")
            _sub(k, "mode", "major")
            t = _sub(att, "time")
            _sub(t, "beats", "3")
            _sub(t, "beat-type", "4")
            c = _sub(att, "clef")
            _sub(c, "sign", "G")
            _sub(c, "line", "2")
            _add_words(meas, ORBIT_HEADER)
        if m == 17:
            _add_words(meas, ORBIT_HEADER)
        if m in ORBIT_REHEARSAL:
            _add_rehearsal(meas, ORBIT_REHEARSAL[m])
        if m in ORBIT_SECTION_ACTIVITY:
            _add_words(meas, ORBIT_SECTION_ACTIVITY[m])
        bar_0 = (m - 1) % 16
        _add_harmony(meas, ORBIT_CHORDS[bar_0])
        if m in ORBIT_ASTERISK_MEASURES:
            _add_words(meas, "*")
        playthrough = 1 if m <= 16 else 2
        for (st, oct, alt, dur) in orbit_melody_bar(bar_0, playthrough):
            _add_note(meas, st, oct, alt, dur)
        if repeat_mode == "barlines":
            if m in ORBIT_A_REPEAT_START:
                _add_barline(meas, "forward")
            elif m in ORBIT_A_REPEAT_END:
                _add_barline(meas, "backward", times=2)
            elif m in ORBIT_B_REPEAT_START:
                _add_barline(meas, "forward")
            elif m in ORBIT_B_REPEAT_END:
                _add_barline(meas, "backward", times=2)
    out_path = out_dir / f"{prefix}_{base_name}.musicxml"
    tree = ET.ElementTree(root)
    ET.indent(tree, space="  ")
    tree.write(out_path, encoding="UTF-8", xml_declaration=True, default_namespace="", method="xml")
    return out_path

# --- BEATRICE: 16-bar form. R4 ASCII hyphen (D-7, C-7). Split-bar 7 and 11. ---
BEATRICE_CHORDS = [
    "F\u0394\u0037", "G\u266d\u0394\u0037(#11)", "F\u0394\u0037", "E\u266d\u0394\u0037(#11)",
    "D-7", "E\u266d\u0394\u0037(#11)", ("D-7", "C-7"), "B\u266d-7",
    "A-7", "B\u266d\u0394\u0037", ("E\u00f8\u0037", "A\u0037(b9)"), "D-7", "G-7", "G\u266d\u0394\u0037(#11)", "F-7", "G\u266d\u0394\u0037(#11)",
]
BEATRICE_BAR_TWO_CHORDS = (6, 10)  # bar index 6 = measure 7, 10 = measure 11
BEATRICE_A_REPEAT_START = (1, 17)
BEATRICE_A_REPEAT_END = (4, 20)
BEATRICE_B_REPEAT_START = (5, 21)
BEATRICE_B_REPEAT_END = (8, 24)
BEATRICE_REHEARSAL = {1: "A", 5: "B", 9: "C", 17: "A", 21: "B", 25: "C"}
BEATRICE_ASTERISK_MEASURES = {2, 5, 6, 7, 8, 14, 18, 21, 22, 23, 24, 30}
BEATRICE_SECTION_ACTIVITY = {1: "A: A1", 5: "B: A4*", 9: "C: A1", 17: "A: A1", 21: "B: A4*", 25: "C: A1"}
BEATRICE_HEADER = "V5.3 Beatrice | PT1: A1 LINEAR_CORE | PT2: A1+A4* (B) | LFV 5-9"

def beatrice_melody_bar(bar_0: int, playthrough: int) -> list[tuple[str, int, int | None, int]]:
    bars_p1 = [
        [("F",3,None,2),("G",3,None,1),("Ab",3,-1,1),("F",3,None,2),("Eb",3,-1,1),("F",3,None,1)],
        [("Ab",3,-1,2),("Bb",3,None,1),("C",4,None,1),("Db",4,-1,2),("C",4,None,1),("Bb",3,None,1)],
        [("F",3,None,2),("Ab",3,-1,1),("Bb",3,None,1),("C",4,None,2),("Bb",3,None,1),("A",3,None,1)],
        [("Bb",3,None,2),("C",4,None,1),("Eb",4,-1,1),("F",4,None,2),("Eb",4,-1,1),("D",4,None,1)],
        [("D",4,None,2),("C",4,None,1),("Bb",3,None,1),("A",3,None,2),("G",3,None,1),("F",3,None,1)],
        [("Eb",3,-1,2),("F",3,None,1),("G",3,None,1),("Ab",3,-1,2),("Bb",3,None,1),("C",4,None,1)],
        [("D",4,None,2),("C",4,None,1),("Bb",3,None,1),("A",3,None,2),("G",3,None,1),("F",3,None,1)],
        [("Bb",3,None,2),("C",4,None,1),("D",4,None,1),("F",4,None,2),("Eb",4,-1,1),("D",4,None,1)],
        [("A",3,None,2),("C",4,None,1),("E",4,None,1),("G",4,None,2),("F",4,None,1),("E",4,None,1)],
        [("Bb",3,None,2),("D",4,None,1),("F",4,None,1),("G",4,None,2),("F",4,None,1),("Eb",4,-1,1)],
        [("D",4,None,2),("F",4,None,1),("G",4,None,1),("Bb",3,None,2),("A",3,None,1),("G",3,None,1)],
        [("F",3,None,2),("Ab",3,-1,1),("Bb",3,None,1),("C",4,None,2),("Eb",4,-1,1),("F",4,None,1)],
        [("Ab",3,-1,2),("Bb",3,None,1),("C",4,None,1),("Db",4,-1,2),("C",4,None,1),("Bb",3,None,1)],
        [("F",3,None,2),("G",3,None,1),("Ab",3,-1,1),("F",3,None,2),("Eb",3,-1,1),("F",3,None,1)],
        [("Bb",3,None,2),("C",4,None,1),("Eb",4,-1,1),("F",4,None,2),("Eb",4,-1,1),("D",4,None,1)],
        [("F",3,None,2),("Ab",3,-1,1),("Bb",3,None,1),("C",4,None,2),("Bb",3,None,1),("F",3,None,1)],
    ]
    if playthrough == 1:
        return bars_p1[bar_0] if bar_0 < len(bars_p1) else bars_p1[0]
    bars_p2 = list(bars_p1)
    bars_p2[8] = [("C",4,None,1),("E",4,None,1),("G",4,None,1),("Bb",3,None,2),("A",4,None,1),("G",4,None,1)]
    bars_p2[9] = [("F",4,None,2),("Eb",4,-1,1),("D",4,None,1),("F",4,None,2),("G",4,None,1),("F",4,None,1)]
    bars_p2[10] = [("D",4,None,2),("Bb",3,None,1),("A",3,None,1),("G",4,None,2),("F",4,None,1),("E",4,None,1)]
    bars_p2[11] = [("F",3,None,2),("Ab",3,-1,1),("Bb",3,None,1),("C",4,None,2),("Bb",3,None,1),("F",4,None,1)]
    return bars_p2[bar_0] if bar_0 < len(bars_p2) else bars_p1[bar_0]

def build_beatrice_v5(out_dir: Path, repeat_mode: str = "barlines", requested_version: str = "V5.3") -> Path:
    """R5 split-bar: two harmony + one words with both chord texts; R7 asterisk in non-primary measures."""
    root = ET.Element("score-partwise", version="3.1")
    _sub(root, "work").append(_el("work-title", "Beatrice – Two Playthroughs (V5.3 Martino)"))
    plist = _sub(root, "part-list")
    sp = _el("score-part", id="P1")
    plist.append(sp)
    _sub(sp, "part-name", "Guitar")
    part = ET.SubElement(root, "part", id="P1")
    total_measures = 32
    base_name = "Beatrice_TwoPlaythroughs_Martino"
    prefix = _increment_v5(out_dir, base_name, requested_version)
    for m in range(1, total_measures + 1):
        meas = ET.SubElement(part, "measure", number=str(m))
        if m == 1:
            att = _sub(meas, "attributes")
            _sub(att, "divisions", "2")
            k = _sub(att, "key")
            _sub(k, "fifths", "-1")
            _sub(k, "mode", "major")
            t = _sub(att, "time")
            _sub(t, "beats", "4")
            _sub(t, "beat-type", "4")
            c = _sub(att, "clef")
            _sub(c, "sign", "G")
            _sub(c, "line", "2")
            _add_words(meas, BEATRICE_HEADER)
        if m == 17:
            _add_words(meas, BEATRICE_HEADER)
        if m in BEATRICE_REHEARSAL:
            _add_rehearsal(meas, BEATRICE_REHEARSAL[m])
        if m in BEATRICE_SECTION_ACTIVITY:
            _add_words(meas, BEATRICE_SECTION_ACTIVITY[m])
        bar_0 = (m - 1) % 16
        chord_entry = BEATRICE_CHORDS[bar_0]
        if bar_0 in BEATRICE_BAR_TWO_CHORDS and isinstance(chord_entry, tuple):
            for ch in chord_entry:
                _add_harmony(meas, ch)
            _add_words(meas, chord_entry[0] + " | " + chord_entry[1])
        else:
            _add_harmony(meas, chord_entry)
        if m in BEATRICE_ASTERISK_MEASURES:
            _add_words(meas, "*")
        playthrough = 1 if m <= 16 else 2
        for (st, oct, alt, dur) in beatrice_melody_bar(bar_0, playthrough):
            _add_note(meas, st, oct, alt, dur)
        if repeat_mode == "barlines":
            if m in BEATRICE_A_REPEAT_START:
                _add_barline(meas, "forward")
            elif m in BEATRICE_A_REPEAT_END:
                _add_barline(meas, "backward", times=2)
            elif m in BEATRICE_B_REPEAT_START:
                _add_barline(meas, "forward")
            elif m in BEATRICE_B_REPEAT_END:
                _add_barline(meas, "backward", times=2)
    out_path = out_dir / f"{prefix}_{base_name}.musicxml"
    tree = ET.ElementTree(root)
    ET.indent(tree, space="  ")
    tree.write(out_path, encoding="UTF-8", xml_declaration=True, default_namespace="", method="xml")
    return out_path

# --- Engine config (V5 patch) ---
def _load_engine_config() -> dict:
    spec_path = _ENGINE_DIR / "engine_spec.json"
    if not spec_path.exists():
        return {"REPEAT_MODE": "barlines", "default_version": "V5.2", "VALIDATION_MAX_RETRIES": 2}
    data = json.loads(spec_path.read_text(encoding="utf-8"))
    patch = data.get("v5_engine_patch_1", {})
    out = data.get("output", {})
    return {
        "REPEAT_MODE": patch.get("REPEAT_MODE", "barlines"),
        "default_version": out.get("default_version", "V5.2"),
        "VALIDATION_MAX_RETRIES": patch.get("VALIDATION_MAX_RETRIES", 2),
    }

def write_with_validation(
    tune_name: str,
    out_dir: Path,
    build_fn: Any,
    chord_grid: list,
    form_length_n: int,
    section_starts: dict[int, str],
    repeat_spec: dict[str, Any],
    base_name: str,
) -> Path:
    """Build, write, validate. On failure: retry up to VALIDATION_MAX_RETRIES; if repeat fails, retry with flatten once."""
    cfg = _load_engine_config()
    repeat_mode = cfg["REPEAT_MODE"]
    requested_version = cfg["default_version"]
    max_retries = cfg["VALIDATION_MAX_RETRIES"]
    for attempt in range(max_retries + 1):
        path = build_fn(out_dir, repeat_mode=repeat_mode, requested_version=requested_version)
        if run_validation is None:
            return path
        all_passed, report = run_validation(path, chord_grid, form_length_n, section_starts, repeat_spec, repeat_mode)
        for line in report:
            print(f"  {line}")
        if all_passed:
            print(f"  Validation: {tune_name} PASS")
            return path
        report_str = " ".join(report)
        if "REPEAT" in report_str and repeat_mode == "barlines":
            repeat_mode = "flatten"
            print(f"  Retrying with REPEAT_MODE=flatten")
            continue
    print(f"  Validation: {tune_name} FAIL (max retries reached)")
    return path

# --- Validation ---
def validate_musicxml(path: Path) -> dict:
    tree = ET.parse(path)
    root = tree.getroot()
    part = root.find("part")
    measures = part.findall("measure") if part is not None else []
    total = len(measures)
    has_repeat_forward = 0
    has_repeat_backward = 0
    measures_with_harmony = 0
    rehearsal_marks_found = []
    note_count = 0
    for m in measures:
        num = m.get("number", "")
        for bl in m.findall("barline/repeat"):
            if bl.get("direction") == "forward":
                has_repeat_forward += 1
            elif bl.get("direction") == "backward":
                has_repeat_backward += 1
        if m.find("harmony") is not None:
            measures_with_harmony += 1
        for d in m.findall("direction"):
            r = d.find("direction-type/rehearsal")
            if r is not None and r.text:
                rehearsal_marks_found.append((num, r.text))
        note_count += len(m.findall("note"))
    return {
        "path": str(path),
        "measure_count": total,
        "repeat_forward_barlines": has_repeat_forward,
        "repeat_backward_barlines": has_repeat_backward,
        "every_measure_has_chord": measures_with_harmony == total,
        "measures_with_harmony": measures_with_harmony,
        "rehearsal_marks": rehearsal_marks_found,
        "A_B_C_present": (
            any(t[1] == "A" for t in rehearsal_marks_found) and
            any(t[1] == "B" for t in rehearsal_marks_found) and
            any(t[1] == "C" for t in rehearsal_marks_found)
        ),
        "total_notes": note_count,
    }

def print_activity_maps():
    print("ORBIT 5X Version 2 | Playthrough 1: 1-8 A1 | 9-12 A2/A3 * | 13-16 A1 (14 *) | Playthrough 2: 17-24 A1 | 25-28 A2/A3 * | 29-32 A1")
    print("BEATRICE | Playthrough 1: 1-4 A1 | 5-8 A1 | 9-16 A1 (2,14 *) | Playthrough 2: 17-20 A1 | 21-24 A1 | 25-32 A1+A4/A3 (18,30 *)")

def print_required_inputs_checklist():
    """FIX_07 / CONFIRMATION: Print what the engine needs per tune (no MusicXML output in this step)."""
    print("=" * 60)
    print("ENGINE REQUIRED INPUTS (per tune)")
    print("=" * 60)
    print("- Chord grid per measure (including split bars and slash bass).")
    print("  Example: bar 7 = (D-7, C-7); bar 11 = (Eo7, A7(b9)); GDelta/F for slash.")
    print("- Time signature (e.g. 3/4, 4/4).")
    print("- Section start measures for rehearsal marks (A, B, C).")
    print("  Example: A=1, B=9, C=13 for 16-bar form.")
    print("- REPEAT_MODE: 'barlines' (preferred) or allow 'flatten' fallback.")
    print("  Set in engine_spec.json v5_engine_patch_1.REPEAT_MODE.")
    print("- Desired version prefix (e.g. V5 or V5.2).")
    print("  Set in engine_spec.json output.default_version.")
    print("=" * 60)

def _validate_chords_and_bass(path: Path, tune: str) -> tuple[bool, bool]:
    tree = ET.parse(path)
    part = tree.getroot().find("part")
    measures = part.findall("measure") if part else []
    all_have_harmony = all(m.find("harmony") is not None for m in measures)
    bass_found = False
    for m in measures:
        for h in m.findall("harmony"):
            if h.find("bass") is not None:
                bass_found = True
                break
    return all_have_harmony, bass_found

def main():
    out_dir = Path(_OUT_DIR)
    out_dir.mkdir(parents=True, exist_ok=True)
    print_required_inputs_checklist()
    orbit_section_starts = {1: "A", 9: "B", 13: "C"}
    orbit_repeat_spec = {"forward_at": [1, 9, 17, 25], "backward_at": [8, 12, 24, 28]}
    beatrice_section_starts = {1: "A", 5: "B", 9: "C"}
    beatrice_repeat_spec = {"forward_at": [1, 5, 17, 21], "backward_at": [4, 8, 20, 24]}
    print("ORBIT:")
    p_orbit = write_with_validation(
        "Orbit", out_dir, build_orbit_v5,
        ORBIT_CHORDS, 16, orbit_section_starts, orbit_repeat_spec,
        "Orbit5X_Version2_TwoPlaythroughs_Martino",
    )
    print("BEATRICE:")
    p_beatrice = write_with_validation(
        "Beatrice", out_dir, build_beatrice_v5,
        BEATRICE_CHORDS, 16, beatrice_section_starts, beatrice_repeat_spec,
        "Beatrice_TwoPlaythroughs_Martino",
    )
    print(p_orbit)
    print(p_beatrice)
    print_activity_maps()
    return p_orbit, p_beatrice

if __name__ == "__main__":
    main()
