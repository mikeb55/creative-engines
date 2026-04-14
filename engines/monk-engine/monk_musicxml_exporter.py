"""Export Thelonious Monk composition dict to MusicXML (divisions=4)."""

from __future__ import annotations

import re as _re
from typing import Any, Dict, List, Optional, Tuple

DIVISIONS = 4
CAPACITY = 16

REHEARSAL_MAP = {
    "aaba": {1: "A", 9: "A", 17: "B", 25: "A"},
    "abac": {1: "A", 9: "B", 17: "A", 25: "C"},
    "aba": {1: "A", 9: "B", 17: "A"},
    "ab": {1: "A", 9: "B"},
    "blues12": {1: "A"},
    "blues24": {1: "A", 13: "A'"},
    "aab": {1: "A", 9: "A'", 17: "B"},
    "abcb": {1: "A", 9: "B", 17: "C", 25: "B'"},
}

_ARTICULATION_TAGS = frozenset(
    ("staccato", "accent", "tenuto", "strong-accent", "staccatissimo", "breath-mark")
)


def _escape(s: str) -> str:
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def _kind_for_suffix(suffix: str) -> str:
    s = suffix.lower().strip()
    if "maj7" in s or "Δ" in s:
        return "major-seventh"
    if "m7b5" in s or "ø" in s:
        return "half-diminished"
    if "m7" in s or "-7" in s:
        return "minor-seventh"
    if "sus" in s:
        return "suspended-fourth"
    if "7" in s:
        return "dominant"
    if "maj" in s:
        return "major"
    if "m" in s or "min" in s:
        return "minor"
    return "major"


def _parse_chord_for_harmony(chord_sym: str) -> Tuple[str, str, str]:
    left = chord_sym.split("/")[0].strip() if chord_sym else "C"
    rm = _re.match(r"^([A-G])([#b]?)(.*)$", left)
    if rm:
        root_step = rm.group(1)
        acc = rm.group(2)
        kind_input = rm.group(3)
        if acc == "b":
            root_alter = "\n        <root-alter>-1</root-alter>"
        elif acc == "#":
            root_alter = "\n        <root-alter>1</root-alter>"
        else:
            root_alter = ""
    else:
        root_step = left[0] if left else "C"
        root_alter = ""
        kind_input = left[1:] if len(left) > 1 else ""
    return root_step, root_alter, kind_input


def _bass_xml(bass_note: str) -> str:
    m = _re.match(r"^([A-G])([#b]?)", bass_note.strip())
    if not m:
        return ""
    step = m.group(1)
    acc = m.group(2)
    alt = ""
    if acc == "b":
        alt = "\n          <bass-alter>-1</bass-alter>"
    elif acc == "#":
        alt = "\n          <bass-alter>1</bass-alter>"
    return (
        "        <bass>\n"
        f"          <bass-step>{step}</bass-step>{alt}\n"
        "        </bass>"
    )


def _validate_measure(notes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    n = [dict(x) for x in notes]
    while True:
        total = sum(int(x["duration"]) for x in n if not x.get("is_chord"))
        if total > CAPACITY:
            excess = total - CAPACITY
            if not n:
                break
            last = n[-1]
            last["duration"] = int(last["duration"]) - excess
            if last["duration"] < 1:
                n.pop()
            continue
        if total < CAPACITY:
            n.append(
                {
                    "pitch": "B",
                    "octave": 3,
                    "alter": 0.0,
                    "duration": CAPACITY - total,
                    "type": "quarter",
                    "is_rest": True,
                    "is_chord": False,
                    "dot": False,
                    "triplet": False,
                }
            )
        break
    return n


def _alter_tag(alter: float) -> str:
    if alter < -0.5:
        return "<alter>-1</alter>"
    if alter > 0.5:
        return "<alter>1</alter>"
    return ""


def _time_modification_xml(n: Dict[str, Any]) -> str:
    tm = n.get("time_mod")
    if isinstance(tm, dict):
        act = int(tm.get("actual", 3))
        norm = int(tm.get("normal", 2))
        return (
            "<time-modification>"
            f"<actual-notes>{act}</actual-notes>"
            f"<normal-notes>{norm}</normal-notes>"
            "</time-modification>"
        )
    if bool(n.get("triplet", False)):
        return (
            "<time-modification>"
            "<actual-notes>3</actual-notes>"
            "<normal-notes>2</normal-notes>"
            "</time-modification>"
        )
    return ""


def _notations_articulations_xml(n: Dict[str, Any]) -> str:
    raw = n.get("articulations")
    if not isinstance(raw, list) or not raw:
        return ""
    parts: List[str] = []
    for a in raw:
        if not isinstance(a, str):
            continue
        tag = a.strip().lower().replace(" ", "-")
        if tag in _ARTICULATION_TAGS:
            parts.append(f"<{tag}/>")
    if not parts:
        return ""
    inner = "".join(parts)
    return f"<notations><articulations>{inner}</articulations></notations>"


def _note_xml(n: Dict[str, Any]) -> str:
    dur = int(n["duration"])
    typ = str(n.get("type", "quarter"))
    dot = bool(n.get("dot", False))
    dot_tag = "<dot/>" if dot else ""
    tm = _time_modification_xml(n)
    arts = _notations_articulations_xml(n)
    if n.get("is_rest"):
        body = f"<rest/><duration>{dur}</duration><type>{typ}</type>{dot_tag}{tm}{arts}"
        return f"      <note>{body}</note>"
    step = str(n["pitch"])
    octv = int(n["octave"])
    at = _alter_tag(float(n.get("alter", 0.0)))
    pitch = f"<pitch><step>{step}</step>{at}<octave>{octv}</octave></pitch>"
    body = f"{pitch}<duration>{dur}</duration><type>{typ}</type>{dot_tag}{tm}{arts}"
    return f"      <note>{body}</note>"


def _rehearsal_xml(label: str) -> str:
    esc = _escape(label)
    return (
        '      <direction placement="above">\n'
        "        <direction-type>\n"
        f'          <rehearsal enclosure="square">{esc}</rehearsal>\n'
        "        </direction-type>\n"
        "      </direction>"
    )


def export_to_musicxml(
    composition: Dict[str, Any],
    song_form: str = "aaba",
    rehearsal_map: Optional[Dict[int, str]] = None,
) -> str:
    title = str(composition.get("title", "Untitled"))
    bars = composition.get("bars") or []
    max_bar_num = max((int(b["bar_number"]) for b in bars), default=0)

    if rehearsal_map is not None:
        rehearsal = dict(rehearsal_map)
    else:
        form = (song_form or "aaba").strip().lower()
        if form not in REHEARSAL_MAP:
            form = "aaba"
        raw = REHEARSAL_MAP[form]
        rehearsal = {k: v for k, v in raw.items() if k <= max_bar_num}

    lines: List[str] = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<score-partwise version="4.0">',
        '  <work><work-title>' + _escape(title) + '</work-title></work>',
        '  <part-list>',
        '    <score-part id="P1">',
        '      <part-name>Piano</part-name>',
        '      <score-instrument id="P1-I1">',
        '        <instrument-name>Piano</instrument-name>',
        '      </score-instrument>',
        '      <midi-instrument id="P1-I1">',
        '        <midi-channel>1</midi-channel>',
        '        <midi-program>1</midi-program>',
        '      </midi-instrument>',
        '    </score-part>',
        '  </part-list>',
        '  <part id="P1">',
    ]

    tempo = 180
    fifths = 0

    for b in bars:
        mnum = int(b["bar_number"])
        chord_sym = str(b.get("chord", "C"))
        bass_note = b.get("bass_note")
        notes = _validate_measure(list(b.get("notes") or []))

        lines.append(f'    <measure number="{mnum}">')
        if mnum == 1:
            lines.append(f'      <attributes><divisions>{DIVISIONS}</divisions>')
            lines.append(f'        <key><fifths>{fifths}</fifths><mode>major</mode></key>')
            lines.append('        <time><beats>4</beats><beat-type>4</beat-type></time>')
            lines.append('        <clef><sign>G</sign><line>2</line></clef></attributes>')
            lines.append(f'      <sound tempo="{tempo}"/>')

        rs, ra, kind_suf = _parse_chord_for_harmony(chord_sym)
        kind_text = _escape(chord_sym)
        lines.append("      <harmony>")
        lines.append(f"        <root><root-step>{rs}</root-step>{ra}</root>")
        lines.append(
            f'        <kind text="{kind_text}">' f"{_kind_for_suffix(kind_suf)}</kind>"
        )
        if bass_note and str(bass_note).strip():
            lines.append(_bass_xml(str(bass_note)))
        lines.append("      </harmony>")

        if mnum in rehearsal:
            lines.append(_rehearsal_xml(rehearsal[mnum]))

        for n in notes:
            lines.append(_note_xml(n))
        lines.append("    </measure>")

    lines.extend(["  </part>", "</score-partwise>"])
    return "\n".join(lines)
