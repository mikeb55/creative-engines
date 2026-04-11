"""
Shorter MusicXML Exporter — Valid MusicXML from CompiledComposition.
"""

from typing import Any, Dict, List

try:
    from .compiled_composition_types import CompiledComposition, CompiledSection
except ImportError:
    from compiled_composition_types import CompiledComposition, CompiledSection

ENHARMONIC = {
    0: ("C", 0), 1: ("C", 1), 2: ("D", 0), 3: ("D", 1), 4: ("E", 0), 5: ("F", 0),
    6: ("F", 1), 7: ("G", 0), 8: ("G", 1), 9: ("A", 0), 10: ("A", 1), 11: ("B", 0),
}


def _spell_pitch(midi: int) -> tuple:
    pc = midi % 12
    octave = (midi // 12) - 1
    step, alter = ENHARMONIC.get(pc, ("C", 0))
    return step, alter, octave


def _escape(s: str) -> str:
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def _kind_for(symbol: str) -> str:
    s = symbol.lower()
    if "maj7" in s:
        return "major-seventh"
    if "min7" in s or "m7" in s:
        return "minor-seventh"
    if "7" in s and "maj" not in s:
        return "dominant"
    if "min" in s or "m" in s:
        return "minor"
    if "dim" in s:
        return "diminished"
    if "aug" in s:
        return "augmented"
    if "sus" in s:
        return "suspended-fourth"
    return "major"


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
    divisions = 4
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
            root_step = chord_sym[0]
            root_alter = ""
            if len(chord_sym) > 1 and chord_sym[1] == "b":
                root_alter = "\n        <root-alter>-1</root-alter>"
            elif len(chord_sym) > 1 and chord_sym[1] == "#":
                root_alter = "\n        <root-alter>1</root-alter>"
            lines.append(
                f"        <root><root-step>{root_step}</root-step>"
                f"{root_alter}</root>"
            )
            lines.append(f'        <kind text="{chord_sym}">{_kind_for(chord_sym)}</kind>')
            lines.append("      </harmony>")
        evs = sorted(by_measure.get(m, []), key=lambda x: x.get("beat_position", 0))
        cursor = 0.0
        for e in evs:
            onset = e.get("beat_position", 0)
            dur = e.get("duration", 1.0)
            if onset > cursor:
                divs = max(1, int((onset - cursor) * divisions))
                lines.append(f'      <note><rest/><duration>{divs}</duration><type>quarter</type></note>')
                cursor = onset
            pitch = e.get("pitch", 60)
            step, alter, octave = _spell_pitch(pitch)
            alter_tag = f"<alter>{alter}</alter>" if alter != 0 else ""
            divs = max(1, int(dur * divisions))
            typ = "quarter" if divs <= 4 else "half" if divs <= 8 else "whole"
            lines.append(
                f'      <note><pitch><step>{step}</step>{alter_tag}<octave>{octave}</octave></pitch>'
                f'<duration>{divs}</duration><type>{typ}</type></note>'
            )
            cursor = onset + dur
        if cursor < 4.0:
            divs = max(1, int((4.0 - cursor) * divisions))
            lines.append(f'      <note><rest/><duration>{divs}</duration><type>quarter</type></note>')
        lines.append('    </measure>')
    lines.extend(['  </part>', '</score-partwise>'])
    return "\n".join(lines)
