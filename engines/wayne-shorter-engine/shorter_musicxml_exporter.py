"""
Shorter MusicXML Exporter — Valid MusicXML from CompiledComposition.
"""

import re as _re
from typing import Dict, List, Tuple

try:
    from .compiled_composition_types import CompiledComposition
except ImportError:
    from compiled_composition_types import CompiledComposition

ENHARMONIC = {
    0: ("C", 0), 1: ("C", 1), 2: ("D", 0), 3: ("D", 1), 4: ("E", 0), 5: ("F", 0),
    6: ("F", 1), 7: ("G", 0), 8: ("G", 1), 9: ("A", 0), 10: ("A", 1), 11: ("B", 0),
}

# divisions=4 => quarter=4, eighth=2, half=8, whole=16, dotted half=12, dotted quarter=6
DEFAULT_DIVISIONS = 4
DEFAULT_BEATS = 4


def validate_bar(notes: List[Dict], divisions: int = 4, beats: int = 4) -> List[Dict]:
    capacity = divisions * beats
    while True:
        total = sum(n["duration"] for n in notes if not n.get("is_chord"))
        if total > capacity:
            excess = total - capacity
            if not notes:
                break
            notes[-1]["duration"] -= excess
            while notes and notes[-1]["duration"] < 1:
                notes.pop()
            continue
        if total < capacity:
            notes.append({
                "type": "quarter",
                "duration": capacity - total,
                "is_rest": True,
            })
        break
    return notes


def _beats_to_divisions(beats: float, divisions: int) -> int:
    """Convert duration in quarter-note beats to MusicXML divisions (quarter = divisions)."""
    if beats <= 0:
        return 0
    return max(1, int(round(beats * divisions)))


def _type_and_dot_from_divisions(divs: int) -> Tuple[str, bool]:
    """Map duration in divisions to <type> and whether to emit <dot/>."""
    if divs >= 16:
        return "whole", False
    if divs == 12:
        return "half", True
    if divs == 8:
        return "half", False
    if divs == 6:
        return "quarter", True
    if divs == 4:
        return "quarter", False
    if divs == 3:
        return "eighth", True
    if divs == 2:
        return "eighth", False
    if divs == 1:
        return "16th", False
    return "quarter", False


def _spell_pitch(midi: int) -> tuple:
    pc = midi % 12
    octave = (midi // 12) - 1
    step, alter = ENHARMONIC.get(pc, ("C", 0))
    return step, alter, octave


def _escape(s: str) -> str:
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def _kind_for(suffix: str) -> str:
    s = suffix.lower().strip()
    if "maj7#11" in s or "maj7+11" in s:
        return "major-seventh"
    if "maj9" in s:
        return "major-ninth"
    if "maj7" in s:
        return "major-seventh"
    if "maj" in s:
        return "major"
    if "dim7" in s:
        return "diminished-seventh"
    if "dim" in s:
        return "diminished"
    if "m11" in s or "min11" in s:
        return "minor-11th"
    if "m9" in s or "min9" in s:
        return "minor-ninth"
    if "m7" in s or "min7" in s:
        return "minor-seventh"
    if "aug" in s:
        return "augmented"
    if "13sus" in s or "sus13" in s:
        return "suspended-fourth"
    if "7sus" in s or "sus7" in s:
        return "suspended-fourth"
    if "sus" in s:
        return "suspended-fourth"
    if "7alt" in s or "alt" in s:
        return "dominant"
    if "7b9" in s or "7#9" in s or "13b9" in s:
        return "dominant"
    if "13" in s:
        return "dominant-13th"
    if "11" in s:
        return "dominant-11th"
    if "9" in s:
        return "dominant-ninth"
    if "7" in s:
        return "dominant"
    if "m" in s or "min" in s:
        return "minor"
    return "major"


def _build_measure_note_dicts(
    evs: List[Dict],
    divisions: int,
    beats_per_measure: float,
) -> List[Dict]:
    """Build ordered note/rest dicts with duration in divisions (not yet validated)."""
    notes: List[Dict] = []
    cursor = 0.0
    for e in sorted(evs, key=lambda x: x.get("beat_position", 0)):
        onset = float(e.get("beat_position", 0))
        dur_beats = float(e.get("duration", 1.0))
        if onset > cursor:
            gap = onset - cursor
            gdivs = _beats_to_divisions(gap, divisions)
            if gdivs > 0:
                notes.append({"duration": gdivs, "is_rest": True})
            cursor = onset
        if e.get("is_rest") or e.get("pitch", 0) == 0:
            divs = _beats_to_divisions(dur_beats, divisions)
            notes.append({"duration": divs, "is_rest": True})
            cursor = onset + dur_beats
            continue
        pitch = int(e.get("pitch", 60))
        divs = _beats_to_divisions(dur_beats, divisions)
        notes.append({"duration": divs, "is_rest": False, "pitch": pitch})
        cursor = onset + dur_beats
    if cursor < beats_per_measure:
        tail = _beats_to_divisions(beats_per_measure - cursor, divisions)
        if tail > 0:
            notes.append({"duration": tail, "is_rest": True})
    return notes


def _emit_note_line(note: Dict) -> str:
    divs = int(note["duration"])
    typ, dot = _type_and_dot_from_divisions(divs)
    dot_tag = "<dot/>" if dot else ""
    if note.get("is_rest"):
        return (
            f'      <note><rest/><duration>{divs}</duration>'
            f'<type>{typ}</type>{dot_tag}</note>'
        )
    step, alter, octave = _spell_pitch(note["pitch"])
    alter_tag = f"<alter>{alter}</alter>" if alter != 0 else ""
    return (
        f'      <note><pitch><step>{step}</step>{alter_tag}<octave>{octave}</octave></pitch>'
        f'<duration>{divs}</duration><type>{typ}</type>{dot_tag}</note>'
    )


def export_composition_to_musicxml(compiled: CompiledComposition) -> str:
    """Export CompiledComposition to valid MusicXML string."""
    by_measure: Dict[int, List[Dict]] = {}
    for sec in compiled.sections:
        for e in sec.melody_events:
            m = e.get("measure", 0)
            if m not in by_measure:
                by_measure[m] = []
            by_measure[m].append(e)
    total_bars = max(by_measure.keys(), default=0) + 1
    # Build chord-per-measure lookup from section harmony
    by_measure_chord: Dict[int, str] = {}
    for sec in compiled.sections:
        for h in sec.harmony:
            bar = h.get("measure", h.get("bar", h.get("bar_index", None)))
            symbol = h.get("symbol", h.get("chord", h.get("name", None)))
            if bar is not None and symbol is not None:
                by_measure_chord[int(bar)] = str(symbol)
    # Fall back to CompiledComposition.harmony.chords if empty
    if not by_measure_chord:
        for h in compiled.harmony.chords:
            bar = h.get("measure", h.get("bar", h.get("bar_index", None)))
            symbol = h.get("symbol", h.get("chord", h.get("name", None)))
            if bar is not None and symbol is not None:
                by_measure_chord[int(bar)] = str(symbol)
    divisions = DEFAULT_DIVISIONS
    beats = DEFAULT_BEATS
    beats_per_measure = float(beats)
    key_hint = compiled.metadata.get("key_hint", "C")
    tempo = compiled.metadata.get("tempo", 90)
    fifths = {"C": 0, "G": 1, "D": 2, "A": 3, "E": 4, "B": 5, "F": -1, "Bb": -2, "Eb": -3, "Am": 0, "Em": 1, "Bm": 2, "Dm": -1, "Gm": -2}.get(key_hint, 0)
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<score-partwise version="4.0">',
        '  <work><work-title>' + _escape(compiled.title) + '</work-title></work>',
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
    for m in range(total_bars):
        lines.append(f'    <measure number="{m + 1}">')
        if m == 0:
            lines.append(f'      <attributes><divisions>{divisions}</divisions>')
            lines.append(f'        <key><fifths>{fifths}</fifths><mode>major</mode></key>')
            lines.append('        <time><beats>4</beats><beat-type>4</beat-type></time>')
            lines.append('        <clef><sign>G</sign><line>2</line></clef></attributes>')
            lines.append(f'      <sound tempo="{tempo}"/>')
        chord_sym = by_measure_chord.get(m)
        if chord_sym:
            lines.append("      <harmony>")
            _rm = _re.match(r"^([A-G](?:b|#)?)(.*)$", chord_sym)
            if _rm:
                root_full = _rm.group(1)
                kind_input = _rm.group(2)
                if root_full.endswith("b"):
                    root_step = root_full[0]
                    root_alter = "\n        <root-alter>-1</root-alter>"
                elif root_full.endswith("#"):
                    root_step = root_full[0]
                    root_alter = "\n        <root-alter>1</root-alter>"
                else:
                    root_step = root_full
                    root_alter = ""
            else:
                root_step = chord_sym[0]
                root_alter = ""
                kind_input = chord_sym[1:]
            lines.append(
                f"        <root>"
                f"<root-step>{root_step}</root-step>"
                f"{root_alter}</root>"
            )
            lines.append(
                f'        <kind text="{chord_sym}">'
                f"{_kind_for(kind_input)}</kind>"
            )
            lines.append("      </harmony>")
        evs = by_measure.get(m, [])
        measure_notes = _build_measure_note_dicts(evs, divisions, beats_per_measure)
        measure_notes = validate_bar(measure_notes, divisions=divisions, beats=beats)
        for n in measure_notes:
            lines.append(_emit_note_line(n))
        lines.append('    </measure>')
    lines.extend(['  </part>', '</score-partwise>'])
    return "\n".join(lines)
