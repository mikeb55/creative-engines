#!/usr/bin/env python3
"""Parse book melodic activities (Guitar Pro MusicXML) into frozen Gm master JSON."""
from __future__ import annotations

import hashlib
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

ENGINE_DIR = Path(__file__).resolve().parent
SOURCES_DIR = ENGINE_DIR / "masters" / "sources"
OUT_DIR = ENGINE_DIR / "masters" / "activities"
INV_OUT = ENGINE_DIR / "masters" / "inversions" / "gm7-forms.json"

ACTIVITY_META = {
    "A1": ("A1_LINEAR_CORE", "ascending", "burning", 1, 1),
    "A2": ("A2_DIAGONAL_BRIDGE", "descending", "melodic", 2, 2),
    "A3": ("A3_PIVOT_CELL", "arch", "melodic", 3, 3),
    "A4": ("A4_ANCHOR_ARP", "wave", "ballad", 4, 4),
    "A5": ("A5_FREE_MIX", "ascending", "burning", 5, 5),
}


def _gp_to_technical(text: str) -> str:
    def repl(m: re.Match[str]) -> str:
        inner = m.group(1)
        s = re.search(r"<string>(\d+)</string>", inner)
        f = re.search(r"<fret>(\d+)</fret>", inner)
        if s and f:
            return f"<technical><string>{s.group(1)}</string><fret>{f.group(1)}</fret></technical>"
        return ""

    return re.sub(r"<\?GP\s*([\s\S]*?)\?>", repl, text)


def _note_tuple(step: str, octave: int, alter: int | None, duration: int) -> list:
    return [step, octave, alter, duration]


def _duration_to_engine(raw_dur: int, divisions: int) -> int:
    """Map source divisions (typically 4) to engine divisions=2 units (2=quarter, 1=eighth)."""
    if raw_dur >= divisions:
        return 2
    if raw_dur >= max(1, divisions // 2):
        return 1
    return 1


def parse_melodic_activity(path: Path) -> tuple[list[list], list[dict], list[int]]:
    """
    Extract single-line melody from notation part (first <part>).
    Skips <chord/> stacked notes and rests. Preserves beat positions for phrase data.
    """
    text = _gp_to_technical(path.read_text(encoding="utf-8"))
    root = ET.fromstring(text)
    part = root.find("part")
    if part is None:
        raise ValueError(f"No part in {path}")

    bars_gm: list[list] = []
    notes_gm: list[dict] = []
    phrase_boundaries: list[int] = []
    global_bar = 0

    for meas in part.findall("measure"):
        divisions = 4
        att = meas.find("attributes")
        if att is not None:
            div_el = att.find("divisions")
            if div_el is not None:
                divisions = int(div_el.text or 4)

        bar_notes: list[list] = []
        beat = 0.0
        for n in meas.findall("note"):
            if n.find("chord") is not None:
                continue
            dur_el = n.find("duration")
            raw_dur = int(dur_el.text) if dur_el is not None else divisions
            if n.find("rest") is not None:
                beat += raw_dur / divisions
                continue

            p = n.find("pitch")
            if p is None:
                continue
            step = p.find("step").text or "C"
            octv = int(p.find("octave").text or 4)
            alt_el = p.find("alter")
            alter = int(float(alt_el.text)) if alt_el is not None else None
            eng_dur = _duration_to_engine(raw_dur, divisions)
            bar_notes.append(_note_tuple(step, octv, alter, eng_dur))
            notes_gm.append(
                {
                    "pitch": step,
                    "octave": octv,
                    "alter": alter,
                    "duration": eng_dur,
                    "beat_position": round(beat, 4),
                    "source_bar": global_bar,
                }
            )
            beat += raw_dur / divisions

        if bar_notes:
            bars_gm.append(bar_notes)
            if global_bar > 0:
                phrase_boundaries.append(global_bar)
            global_bar += 1

    return bars_gm, notes_gm, phrase_boundaries


def _checksum(bars: list) -> str:
    return hashlib.sha256(json.dumps(bars, sort_keys=True).encode("utf-8")).hexdigest()


def _fret_range_from_source(path: Path) -> dict[str, int]:
    """Best-effort fret span from TAB technical blocks in source file."""
    text = path.read_text(encoding="utf-8")
    frets = [int(m.group(1)) for m in re.finditer(r"<fret>(\d+)</fret>", text)]
    if not frets:
        return {"min": 3, "max": 11}
    return {"min": min(frets), "max": max(frets)}


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    INV_OUT.parent.mkdir(parents=True, exist_ok=True)

    for key, (aid, contour, feel, form_num, file_num) in ACTIVITY_META.items():
        src = SOURCES_DIR / f"A{file_num}.xml"
        if not src.exists():
            raise FileNotFoundError(f"Missing melodic source: {src}")
        bars_gm, notes_gm, phrase_boundaries = parse_melodic_activity(src)
        if not bars_gm or sum(len(b) for b in bars_gm) < 8:
            raise ValueError(f"{key}: parsed fewer than 8 notes — not a melodic master")

        master = {
            "id": aid,
            "sourceFile": str(src.relative_to(ENGINE_DIR)),
            "bars_gm": bars_gm,
            "notes_gm": notes_gm,
            "phrase_boundaries": phrase_boundaries,
            "fret_range": _fret_range_from_source(src),
            "contour": contour,
            "feel": feel,
            "form": form_num,
            "checksum_sha256": _checksum(bars_gm),
        }
        out = OUT_DIR / f"{key}.json"
        out.write_text(json.dumps(master, indent=2), encoding="utf-8")
        note_count = sum(len(b) for b in bars_gm)
        print(f"Wrote {out} ({len(bars_gm)} bars, {note_count} notes)")

    inversions = {
        "forms": [
            {
                "form": 1,
                "voicing": "1-b7-b3-5",
                "first_fret": 3,
                "strings": "6-4-3-2",
                "activities": ["A1_LINEAR_CORE", "A5_FREE_MIX"],
            },
            {
                "form": 2,
                "voicing": "b3-1-5-b7",
                "first_fret": 5,
                "strings": "6-4-3-2",
                "activities": ["A2_DIAGONAL_BRIDGE"],
            },
            {
                "form": 3,
                "voicing": "5-b3-b7-1",
                "first_fret": 8,
                "strings": "6-4-3-2",
                "activities": ["A3_PIVOT_CELL"],
            },
            {
                "form": 4,
                "voicing": "b7-5-1-b3",
                "first_fret": 11,
                "strings": "6-4-3-2",
                "activities": ["A4_ANCHOR_ARP"],
            },
        ]
    }
    INV_OUT.write_text(json.dumps(inversions, indent=2), encoding="utf-8")
    print(f"Wrote {INV_OUT}")


if __name__ == "__main__":
    main()
