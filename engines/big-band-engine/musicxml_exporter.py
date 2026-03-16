"""
Big Band MusicXML Exporter — Valid MusicXML blueprint.
"""

from typing import Any, Dict, List

try:
    from .compiled_composition_types import CompiledComposition
except ImportError:
    from compiled_composition_types import CompiledComposition

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


def export_composition_to_musicxml(compiled: CompiledComposition) -> str:
    """Export to MusicXML. Lead melody part; compact blueprint."""
    by_measure: Dict[int, List[Dict]] = {}
    for sec in compiled.sections:
        for e in sec.melody_events:
            m = e.get("measure", 0)
            if m not in by_measure:
                by_measure[m] = []
            by_measure[m].append(e)
    total_bars = max(by_measure.keys(), default=0) + 1
    divisions = 4
    key_hint = compiled.metadata.get("key_hint", "Bb")
    tempo = compiled.metadata.get("tempo", 120)
    fifths = {"C": 0, "G": 1, "D": 2, "A": 3, "E": 4, "B": 5, "F": -1, "Bb": -2, "Eb": -3, "F#": 6, "Ab": -4}.get(key_hint, -2)
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<score-partwise version="4.0">',
        '  <work><work-title>' + _escape(compiled.title) + '</work-title></work>',
        '  <part-list>',
        '    <score-part id="P1"><part-name>Lead</part-name></score-part>',
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
            typ = "eighth" if divs <= 2 else "quarter" if divs <= 4 else "half" if divs <= 8 else "whole"
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
