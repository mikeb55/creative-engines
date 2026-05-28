#!/usr/bin/env python3
"""
Martino Linear Expressions Engine.
Generate MusicXML linear overlays from tune_config (chords, form, activities, LFV).
API: generate_musicxml, build_activity_map, enforce_lfv, increment_version.
"""
from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

try:
    from master_loader import build_melody_bars
except ImportError:
    build_melody_bars = None  # type: ignore

_ENGINE_DIR = Path(__file__).resolve().parent
_SPEC_PATH = _ENGINE_DIR / "engine_spec.json"

# Default LFV pitch bounds (guitar frets 5-9, standard tuning)
STEP_TO_MIDI_BASE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def _load_spec() -> dict:
    with open(_SPEC_PATH, encoding="utf-8") as f:
        return json.load(f)


def _pitch_to_midi(step: str, octave: int, alter: int | None) -> int:
    s = step[0] if len(step) > 1 else step
    a = alter
    if a is None and isinstance(step, str):
        a = -1 if "b" in step else (1 if "#" in step else 0)
    a = a or 0
    base = STEP_TO_MIDI_BASE.get(s, 0)
    return (int(octave) + 1) * 12 + base + a


def _midi_to_lfv_bounds(lfv_config: dict) -> tuple[int, int]:
    """Return (min_midi, max_midi) for LFV fret range (guitar)."""
    spec = _load_spec()
    default_bounds = spec.get("lfv_default", {}).get("pitch_bounds", {})
    min_midi = default_bounds.get("min_midi", 38)
    max_midi = default_bounds.get("max_midi", 68)
    # Could override from lfv_config if we stored midi bounds per fret range
    return min_midi, max_midi


def increment_version(prefix: str, path_or_dir: Path | str) -> str:
    """
    If a file matching the version prefix already exists in the given path/dir, return next version.
    prefix: e.g. "V4.1"
    path_or_dir: output file path or directory to check for existing files with same stem pattern.
    Returns e.g. "V4.2" if V4.1_... exists, else "V4.1".
    """
    path_or_dir = Path(path_or_dir)
    if path_or_dir.is_file():
        directory = path_or_dir.parent
        stem = path_or_dir.stem
    else:
        directory = path_or_dir
        stem = ""
    m = re.match(r"^V(\d+)\.(\d+)(_.*)?$", prefix)
    if not m:
        return prefix
    x, y = int(m.group(1)), int(m.group(2))
    pattern = f"V{x}.{y}_*"
    existing = list(directory.glob(pattern + ".musicxml")) if directory.exists() else []
    if existing:
        return f"V{x}.{y + 1}"
    return prefix


def enforce_lfv(
    note_sequence: list[dict],
    lfv_config: dict,
) -> tuple[list[dict], list[tuple[int, bool]]]:
    """
    Enforce LFV pitch bounds on a note sequence.
    note_sequence: list of {"step", "octave", "alter", "duration"} (alter optional).
    lfv_config: {"min_fret": 5, "max_fret": 9} or may include min_midi/max_midi.
    Returns (adjusted_note_sequence, out_of_range_flags) where out_of_range_flags is list of (index, True) for notes that were out of range (after optional clamping).
    Engine does not transpose by default; it only flags. Caller can clamp octave to bring into range.
    """
    min_midi, max_midi = _midi_to_lfv_bounds(lfv_config)
    adjusted = []
    out_of_range_flags: list[tuple[int, bool]] = []
    for i, n in enumerate(note_sequence):
        step = n.get("step", "C")
        octave = int(n.get("octave", 4))
        alter = n.get("alter")
        if alter is not None:
            alter = int(alter)
        midi = _pitch_to_midi(step, octave, alter)
        in_range = min_midi <= midi <= max_midi
        if not in_range:
            out_of_range_flags.append((i, True))
        adjusted.append({**n, "midi": midi, "in_lfv": in_range})
    return adjusted, out_of_range_flags


def build_activity_map(tune_config: dict) -> str:
    """
    Build ACTIVITY MAP text from tune_config (same format as Prompt 1).
    Uses: tune_name, choruses, measures_per_chorus, rehearsal_marks, asterisk_measures,
          primary_activity, secondary_activities, activity_map_measure_ranges (optional),
          lfv (optional for LFV= line).
    """
    spec = _load_spec()
    lfv = tune_config.get("lfv", spec.get("lfv_default", {}))
    min_f = lfv.get("min_fret", 5)
    max_f = lfv.get("max_fret", 9)
    lines = [
        f"ACTIVITY MAP — {tune_config.get('tune_name', 'Tune')}",
        f"TUNE={tune_config.get('tune_name', 'Tune')}",
    ]
    choruses = int(tune_config.get("choruses", 1))
    mpc = int(tune_config.get("measures_per_chorus", 16))
    for c in range(choruses):
        start = c * mpc + 1
        end = (c + 1) * mpc
        ranges = tune_config.get("activity_map_measure_ranges") or []
        range_str = " | ".join(
            f"{r.get('range', '')} -> {r.get('activity', '')}" for r in (ranges if isinstance(ranges, list) else [ranges])
        )
        lines.append(f"CHORUS={c + 1}  MEASURE_RANGE {start}-{end} -> {range_str or 'PRIMARY'}")
    lines.append(f"ASTERISK_MEASURES={tune_config.get('asterisk_measures', [])}")
    lines.append(f"PRIMARY_ACTIVITY={tune_config.get('primary_activity', 'LINEAR_CORE')}")
    lines.append(f"SECONDARY_ACTIVITIES={tune_config.get('secondary_activities', [])}")
    lines.append(f"LFV=FRETS_{min_f}_TO_{max_f}")
    return "\n".join(lines)


def _build_lfv_map(tune_config: dict) -> str:
    spec = _load_spec()
    lfv = tune_config.get("lfv", spec.get("lfv_default", {}))
    min_f = lfv.get("min_fret", 5)
    max_f = lfv.get("max_fret", 9)
    name = tune_config.get("tune_name", "Tune")
    lines = [
        f"LFV MAP — {name}",
        f"A1 LINEAR_CORE -> LFV {min_f}-{max_f} STRINGS(4-3-2)",
        f"A2 DIAGONAL_BRIDGE -> LFV {min_f}-{max_f} STRINGS(5-4-3-2)",
        f"A3 PIVOT_CELL -> LFV {min_f}-{max_f} STRINGS(3-2)",
        f"A4 ANCHOR_ARP -> LFV {min_f}-{max_f} STRINGS(5-4-3)",
        "A5 FREE_MIX -> STRINGS(4-3-2)+MIX",
    ]
    return "\n".join(lines)


# --- MusicXML helpers ---
def _el(tag: str, text: str | None = None, **attrib: Any) -> ET.Element:
    e = ET.Element(tag, attrib=attrib)
    if text is not None:
        e.text = str(text)
    return e


def _sub(parent: ET.Element, tag: str, text: str | None = None, **attrib: Any) -> ET.Element:
    e = _el(tag, text=text, **attrib)
    parent.append(e)
    return e


def _strip_harmony_nonstandard(root: ET.Element) -> None:
    """Sibelius-safe harmony: no attrs; only root/kind/bass/degree children."""
    allowed_children = frozenset({"root", "kind", "bass", "degree"})
    for h in root.iter():
        if h.tag != "harmony" and not h.tag.endswith("}harmony"):
            continue
        h.attrib.clear()
        for child in list(h):
            local = child.tag.split("}")[-1] if "}" in child.tag else child.tag
            if local not in allowed_children:
                h.remove(child)


def _harmony_elem(measure_el: ET.Element, chord_text: str) -> None:
    h = _el("harmony")
    s = re.sub(r"[(#)/]", " ", chord_text).strip()
    parts = s.split()
    root_str = parts[0] if parts else "C"
    step = root_str[0]
    alter = None
    if len(root_str) > 1:
        alter = -1 if root_str[1] == "b" else (1 if root_str[1] == "#" else None)
    kind_text = "maj7"
    if "maj7" in chord_text or "Δ" in chord_text:
        kind_text = "maj7"
    elif "min7" in chord_text or "m7" in chord_text or "-7" in chord_text:
        kind_text = "min7"
    elif "7" in chord_text and "maj" not in chord_text and "min" not in chord_text:
        kind_text = "dominant"
    root_el = _sub(h, "root")
    _sub(root_el, "root-step", step)
    if alter is not None:
        _sub(root_el, "root-alter", str(alter))
    k = _sub(h, "kind")
    k.set("text", kind_text)
    measure_el.append(h)


def _chord_words_elem(measure_el: ET.Element, chord_text: str) -> None:
    d = _el("direction", placement="above")
    w = _sub(_sub(d, "direction-type"), "words")
    w.text = chord_text
    measure_el.append(d)


def _direction_words_elem(measure_el: ET.Element, words_text: str) -> None:
    d = _el("direction", placement="above")
    w = _sub(_sub(d, "direction-type"), "words")
    w.text = words_text
    measure_el.append(d)


def _asterisk_elem(measure_el: ET.Element, measure_number: int) -> None:
    _direction_words_elem(measure_el, f"m.{measure_number} *")


def _add_note(meas: ET.Element, step: str, octave: int, alter: int | None, duration: int) -> None:
    n = _el("note")
    p = _sub(n, "pitch")
    s = step[0] if len(step) > 1 else step
    _sub(p, "step", s)
    if alter is not None:
        _sub(p, "alter", str(alter))
    elif isinstance(step, str) and "b" in step:
        _sub(p, "alter", "-1")
    elif isinstance(step, str) and "#" in step:
        _sub(p, "alter", "1")
    _sub(p, "octave", str(octave))
    _sub(n, "duration", str(duration))
    _sub(n, "type", "quarter" if duration == 2 else "eighth")
    _sub(n, "voice", "1")
    meas.append(n)


def _auto_melody_bar(
    bar_index: int,
    chorus: int,
    tune_config: dict,
    divisions_per_bar: int,
) -> list[tuple[str, int, int | None, int]]:
    """DEV ONLY — placeholder stepwise F minor when MARTINO_DEV_PLACEHOLDER=1."""
    import os

    if not os.environ.get("MARTINO_DEV_PLACEHOLDER"):
        return []
    # Simple stepwise in F minor: F,G,Ab,Bb,C,Db,Eb. Octave 3-4 for LFV.
    scale = [
        ("F", 3, None), ("G", 3, None), ("Ab", 3, -1), ("Bb", 3, None),
        ("C", 4, None), ("Db", 4, -1), ("Eb", 4, -1),
        ("F", 4, None), ("G", 4, None), ("Ab", 4, -1), ("Bb", 4, None),
    ]
    n_notes = min(6, divisions_per_bar)  # 3/4 -> 6 eighths, 4/4 -> 8
    d_quarter = 2
    d_eighth = 1
    out = []
    for i in range(n_notes):
        idx = (bar_index * 3 + i) % len(scale)
        step, oct, alt = scale[idx]
        dur = d_eighth if (i < n_notes - 1) else (d_quarter if n_notes <= 4 else d_eighth)
        out.append((step, oct, alt, dur))
    return out


def _normalize_melody_bars(tune_config: dict) -> None:
    """Ensure melody_bars is a list of bars (each bar list of (step, oct, alter, duration)) for mpc bars."""
    mpc = int(tune_config.get("measures_per_chorus", 16))
    mb = tune_config.get("melody_bars")
    if not mb:
        return
    if isinstance(mb, dict):
        tune_config["_melody_bars_list"] = [mb.get(str(i)) or mb.get(i) or [] for i in range(mpc)]
    else:
        tune_config["_melody_bars_list"] = list(mb) if len(mb) >= mpc else mb + [[]] * (mpc - len(mb))


# Re-build generate_musicxml to use _melody_bars_list when present (list of mpc bars)
def _add_melody_to_measure(meas: ET.Element, tune_config: dict, bar: int, chorus: int) -> None:
    mpc = int(tune_config.get("measures_per_chorus", 16))
    melody_bars = tune_config.get("melody_bars")
    melody_bars_list = tune_config.get("_melody_bars_list")
    if melody_bars_list and bar < len(melody_bars_list):
        bar_notes = melody_bars_list[bar]
        for no in bar_notes:
            if isinstance(no, (list, tuple)):
                st, oct = no[0], no[1]
                alt = no[2] if len(no) > 2 else None
                dur = no[3] if len(no) > 3 else 1
            else:
                st, oct = no.get("step"), no.get("octave")
                alt, dur = no.get("alter"), no.get("duration", 1)
            _add_note(meas, str(st), int(oct), int(alt) if alt is not None else None, int(dur))
        return
    if melody_bars and isinstance(melody_bars, dict):
        bar_notes = melody_bars.get(str(bar)) or melody_bars.get(bar)
        if bar_notes:
            for no in bar_notes:
                if isinstance(no, (list, tuple)):
                    st, oct = no[0], no[1]
                    alt = no[2] if len(no) > 2 else None
                    dur = no[3] if len(no) > 3 else 1
                else:
                    st, oct = no.get("step"), no.get("octave")
                    alt, dur = no.get("alter"), no.get("duration", 1)
                _add_note(meas, str(st), int(oct), int(alt) if alt is not None else None, int(dur))
            return
    # Auto
    divisions_per_bar = int(tune_config.get("divisions", 2)) * int(tune_config.get("time_signature", {}).get("beats", 4))
    bar_notes = _auto_melody_bar(bar, chorus, tune_config, divisions_per_bar)
    if not bar_notes:
        return
    for st, oct, alt, dur in bar_notes:
        _add_note(meas, st, oct, alt, dur)


# Replace the inline melody block in generate_musicxml with a call to _add_melody_to_measure
def generate_musicxml(tune_config: dict) -> Path:
    spec = _load_spec()
    out_dir = tune_config.get("output_dir")
    if out_dir is None:
        out_dir = _ENGINE_DIR
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    tune_name = tune_config.get("tune_name", "Tune")
    choruses = int(tune_config.get("choruses", 1))
    mpc = int(tune_config.get("measures_per_chorus", 16))
    ts = tune_config.get("time_signature", {})
    beats = int(ts.get("beats", 4))
    beat_type = int(ts.get("beat_type", 4))
    divisions = int(tune_config.get("divisions", 2))
    key = tune_config.get("key", {"fifths": -1, "mode": "major"})
    chords = tune_config.get("chords", [])
    rehearsal_marks = tune_config.get("rehearsal_marks", {})
    asterisk_measures = set(tune_config.get("asterisk_measures", []))
    split_chord_measures = tune_config.get("split_chord_measures", {})

    _normalize_melody_bars(tune_config)

    if (
        tune_config.get("melody") == "auto"
        and not tune_config.get("melody_bars")
        and not tune_config.get("_melody_bars_list")
        and build_melody_bars is not None
    ):
        built = build_melody_bars(tune_config)
        if built:
            tune_config["_melody_bars_list"] = built

    version_prefix = tune_config.get("version_prefix") or spec.get("output", {}).get("default_version", "V4.1")
    suffix = spec.get("output", {}).get("suffix", "MartinoLinearExpressions")
    safe_name = re.sub(r"[^\w\-]", "", tune_name.replace(" ", "_"))
    chorus_label = f"{choruses}Choruses" if choruses > 1 else "1Chorus"
    base_name = f"{version_prefix}_{safe_name}_{chorus_label}_{suffix}.musicxml"
    out_path = out_dir / base_name
    version_prefix = increment_version(version_prefix, out_path)
    base_name = f"{version_prefix}_{safe_name}_{chorus_label}_{suffix}.musicxml"
    out_path = out_dir / base_name

    root = ET.Element("score-partwise", version="3.1")
    _sub(root, "work").append(_el("work-title", f"{tune_name} – Martino Linear Expressions ({version_prefix})"))
    plist = _sub(root, "part-list")
    _sub(_sub(plist, "score-part", id="P1"), "part-name", "Guitar")
    part = _sub(root, "part", id="P1")

    measure_num = 0
    for chorus in range(choruses):
        for bar in range(mpc):
            measure_num += 1
            meas = _sub(part, "measure", number=str(measure_num))
            if measure_num == 1:
                att = _sub(meas, "attributes")
                _sub(att, "divisions", str(divisions))
                k = _sub(att, "key")
                _sub(k, "fifths", str(key.get("fifths", -1)))
                _sub(k, "mode", key.get("mode", "major"))
                t = _sub(att, "time")
                _sub(t, "beats", str(beats))
                _sub(t, "beat-type", str(beat_type))
                c = _sub(att, "clef")
                _sub(c, "sign", "G")
                _sub(c, "line", "2")
                _direction_words_elem(meas, build_activity_map(tune_config))
                _direction_words_elem(meas, _build_lfv_map(tune_config))

            mark = rehearsal_marks.get(bar) or rehearsal_marks.get(str(bar))
            if mark is not None:
                d = _el("direction", placement="above")
                r = _sub(_sub(d, "direction-type"), "rehearsal")
                r.text = mark
                meas.append(d)

            bar_key = str(bar)
            if bar_key in split_chord_measures:
                for ch in split_chord_measures[bar_key]:
                    _harmony_elem(meas, ch)
                    _chord_words_elem(meas, ch)
            else:
                chord_entry = chords[bar] if bar < len(chords) else "Fmaj7"
                if isinstance(chord_entry, list):
                    for ch in chord_entry:
                        _harmony_elem(meas, ch)
                        _chord_words_elem(meas, ch)
                else:
                    _harmony_elem(meas, chord_entry)
                    _chord_words_elem(meas, chord_entry)

            if measure_num in asterisk_measures:
                _asterisk_elem(meas, measure_num)

            _add_melody_to_measure(meas, tune_config, bar, chorus)

    _strip_harmony_nonstandard(root)
    tree = ET.ElementTree(root)
    ET.indent(tree, space="  ")
    tree.write(out_path, encoding="UTF-8", xml_declaration=True, default_namespace="", method="xml")
    return out_path


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser(description="Martino Linear Expressions Engine")
    p.add_argument("--preset", choices=["beatrice", "orbit"], required=True)
    p.add_argument("--output-dir", type=Path, default=_ENGINE_DIR)
    p.add_argument("--version", default=None, help="Version prefix e.g. V4.1")
    args = p.parse_args()
    preset_path = _ENGINE_DIR / "presets" / f"{args.preset}.json"
    with open(preset_path, encoding="utf-8") as f:
        config = json.load(f)
    config["output_dir"] = args.output_dir
    if args.version:
        config["version_prefix"] = args.version
    path = generate_musicxml(config)
    print(path)
