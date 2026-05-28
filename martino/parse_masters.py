#!/usr/bin/env python3
"""Parse Activity Chords MusicXML into frozen Gm master JSON (stdlib only)."""
from __future__ import annotations

import hashlib
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

ENGINE_DIR = Path(__file__).resolve().parent
SOURCE = ENGINE_DIR / "Activity Chords" / "Activity Chord in Pat Martino Linear Expressions Book.xml"
OUT_DIR = ENGINE_DIR / "masters" / "activities"
INV_OUT = ENGINE_DIR / "masters" / "inversions" / "gm7-forms.json"

TUNING = [(6, "E", 2), (5, "A", 2), (4, "D", 3), (3, "G", 3), (2, "B", 3), (1, "E", 4)]
STEP_SEMI = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]

ACTIVITY_META = {
    "A1": ("A1_LINEAR_CORE", "ascending", "burning", 1),
    "A2": ("A2_DIAGONAL_BRIDGE", "descending", "melodic", 2),
    "A3": ("A3_PIVOT_CELL", "arch", "melodic", 3),
    "A4": ("A4_ANCHOR_ARP", "wave", "ballad", 4),
    "A5": ("A5_FREE_MIX", "ascending", "burning", 1),
}

FORM_FIRST_FRET = {3: 1, 5: 2, 8: 3, 11: 4, 15: 5}


def _gp_to_technical(text: str) -> str:
    def repl(m: re.Match[str]) -> str:
        inner = m.group(1)
        s = re.search(r"<string>(\d+)</string>", inner)
        f = re.search(r"<fret>(\d+)</fret>", inner)
        if s and f:
            return f"<technical><string>{s.group(1)}</string><fret>{f.group(1)}</fret></technical>"
        return ""

    return re.sub(r"<\?GP\s*([\s\S]*?)\?>", repl, text)


def _fret_to_pitch(string_num: int, fret: int) -> tuple[str, int, int | None]:
    for s, step, octv in TUNING:
        if s == string_num:
            semi = STEP_SEMI[step[0]] + (octv + 1) * 12 + fret
            pc = semi % 12
            octave = semi // 12 - 1
            alter = -1 if "b" in NAMES[pc] else (1 if "#" in NAMES[pc] else None)
            return NAMES[pc], octave, alter
    return "C", 4, None


def _note_tuple(step: str, octave: int, alter: int | None, duration: int) -> list:
    return [step, octave, alter, duration]


def _parse_xml() -> list[dict]:
    text = _gp_to_technical(SOURCE.read_text(encoding="utf-8"))
    root = ET.fromstring(text)
    bars: list[dict] = []
    for meas in root.find("part").findall("measure"):
        frame = meas.find("harmony/frame")
        first_fret = int(frame.find("first-fret").text) if frame is not None and frame.find("first-fret") is not None else None
        bar_notes: list[list] = []
        for n in meas.findall("note"):
            if n.find("rest") is not None:
                continue
            dur = int(float(n.find("duration").text or 1))
            dur = 2 if dur >= 4 else 1
            tech = n.find("notations/technical")
            if tech is not None and tech.find("string") is not None:
                s = int(tech.find("string").text)
                f = int(tech.find("fret").text)
                step, octv, alt = _fret_to_pitch(s, f)
                bar_notes.append(_note_tuple(step, octv, alt, dur))
                continue
            p = n.find("pitch")
            if p is None:
                continue
            step = p.find("step").text or "C"
            octv = int(p.find("octave").text or 4)
            alt_el = p.find("alter")
            alt = int(float(alt_el.text)) if alt_el is not None else None
            bar_notes.append(_note_tuple(step, octv, alt, dur))
        if bar_notes:
            bars.append({"first_fret": first_fret, "notes": bar_notes})
    return bars


def _checksum(notes: list) -> str:
    payload = json.dumps(notes, sort_keys=True).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def main() -> None:
    bars = _parse_xml()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    INV_OUT.parent.mkdir(parents=True, exist_ok=True)

    by_form: dict[int, list[list]] = {1: [], 2: [], 3: [], 4: [], 5: []}
    for bar in bars:
        ff = bar["first_fret"]
        form = FORM_FIRST_FRET.get(ff)
        if form and len(bar["notes"]) >= 4:
            by_form[form].append(bar["notes"])

    for key, (aid, contour, feel, form_num) in ACTIVITY_META.items():
        template_bars = by_form.get(form_num) or by_form.get(1) or [[["G", 3, None, 1]]]
        flat = [n for bar in template_bars for n in bar]
        frets = []
        for bar in template_bars:
            for n in bar:
                pass
        notes_gm = []
        for bar in template_bars:
            for tup in bar:
                notes_gm.append(
                    {
                        "pitch": tup[0],
                        "octave": tup[1],
                        "alter": tup[2],
                        "duration": tup[3],
                        "beat_position": 0.0,
                    }
                )
        fret_vals = []
        for bar in bars:
            if FORM_FIRST_FRET.get(bar["first_fret"]) == form_num:
                for n in bar["notes"]:
                    pass
        master = {
            "id": aid,
            "sourceFile": str(SOURCE.relative_to(ENGINE_DIR)),
            "bars_gm": template_bars,
            "notes_gm": notes_gm,
            "fret_range": {"min": 3, "max": 11},
            "contour": contour,
            "feel": feel,
            "form": form_num,
            "checksum_sha256": _checksum(template_bars),
        }
        out = OUT_DIR / f"{key}.json"
        out.write_text(json.dumps(master, indent=2), encoding="utf-8")
        print(f"Wrote {out} ({len(template_bars)} bars)")

    inversions = {
        "forms": [
            {"form": 1, "voicing": "1-b7-b3-5", "first_fret": 3, "strings": "6-4-3-2", "activities": ["A1_LINEAR_CORE", "A5_FREE_MIX"]},
            {"form": 2, "voicing": "b3-1-5-b7", "first_fret": 5, "strings": "6-4-3-2", "activities": ["A2_DIAGONAL_BRIDGE"]},
            {"form": 3, "voicing": "5-b3-b7-1", "first_fret": 8, "strings": "6-4-3-2", "activities": ["A3_PIVOT_CELL"]},
            {"form": 4, "voicing": "b7-5-1-b3", "first_fret": 11, "strings": "6-4-3-2", "activities": ["A4_ANCHOR_ARP"]},
        ]
    }
    INV_OUT.write_text(json.dumps(inversions, indent=2), encoding="utf-8")
    print(f"Wrote {INV_OUT}")


if __name__ == "__main__":
    main()
