"""
Hybrid MusicXML Exporter — Multi-part MusicXML: lead, counterline, optional inner voice.
"""

from typing import Any, Dict, List

import sys
import os
_base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _base not in sys.path:
    sys.path.insert(0, _base)
from shared_composer.engine_registry import get_engine, ensure_engines_loaded


def _spell_pitch(midi: int) -> tuple:
    ENHARMONIC = {0: ("C", 0), 1: ("C", 1), 2: ("D", 0), 3: ("D", 1), 4: ("E", 0), 5: ("F", 0),
                  6: ("F", 1), 7: ("G", 0), 8: ("G", 1), 9: ("A", 0), 10: ("A", 1), 11: ("B", 0)}
    pc = midi % 12
    octave = (midi // 12) - 1
    step, alter = ENHARMONIC.get(pc, ("C", 0))
    return step, alter, octave


def _escape(s: str) -> str:
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def export_hybrid_to_musicxml(compiled_result: Dict[str, Any]) -> str:
    """
    Export hybrid to MusicXML. Multi-part: lead, counterline, optional inner voice.
    Chamber-clear, compact.
    """
    ensure_engines_loaded()
    compiled = compiled_result.get("compiled")
    if not compiled:
        return '<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>Untitled</work-title></work></score-partwise>'
    counterline = compiled_result.get("counterline_events", [])
    inner = compiled_result.get("inner_voice_events", [])
    if not counterline and not inner:
        melody_engine = compiled_result.get("melody_engine", "wayne_shorter")
        eng = get_engine(melody_engine)
        return eng.export_musicxml(compiled)
    by_measure = {}
    for sec in compiled.sections:
        for e in sec.melody_events:
            m = e.get("measure", 0)
            if m not in by_measure:
                by_measure[m] = {"lead": [], "counterline": [], "inner": []}
            by_measure[m]["lead"].append(e)
    for e in counterline:
        m = e.get("measure", 0)
        if m not in by_measure:
            by_measure[m] = {"lead": [], "counterline": [], "inner": []}
        by_measure[m]["counterline"].append(e)
    for e in inner:
        m = e.get("measure", 0)
        if m not in by_measure:
            by_measure[m] = {"lead": [], "counterline": [], "inner": []}
        by_measure[m]["inner"].append(e)
    total_bars = max(by_measure.keys(), default=0) + 1
    meta = getattr(compiled, "metadata", {}) or {}
    tempo = meta.get("tempo", 90)
    title = getattr(compiled, "title", "Untitled")
    divisions = 4
    parts = [("P1", "Lead"), ("P2", "Counterline")]
    if inner:
        parts.append(("P3", "Inner voice"))
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<score-partwise version="4.0">',
        '  <work><work-title>' + _escape(title) + '</work-title></work>',
        '  <part-list>',
    ]
    for pid, pname in parts:
        lines.append(f'    <score-part id="{pid}"><part-name>{pname}</part-name></score-part>')
    lines.append('  </part-list>')
    for part_idx, (pid, pname) in enumerate(parts):
        voice_key = ["lead", "counterline", "inner"][part_idx]
        lines.append(f'  <part id="{pid}">')
        for m in range(total_bars):
            evs = sorted(by_measure.get(m, {}).get(voice_key, []), key=lambda x: x.get("beat_position", 0))
            lines.append(f'    <measure number="{m + 1}">')
            if m == 0:
                lines.append(f'      <attributes><divisions>{divisions}</divisions>')
                lines.append('        <key><fifths>0</fifths><mode>major</mode></key>')
                lines.append('        <time><beats>4</beats><beat-type>4</beat-type></time>')
                lines.append('        <clef><sign>G</sign><line>2</line></clef></attributes>')
                lines.append(f'      <sound tempo="{tempo}"/>')
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
                typ = "eighth" if divs <= 2 else "quarter" if divs <= 4 else "half"
                lines.append(f'      <note><pitch><step>{step}</step>{alter_tag}<octave>{octave}</octave></pitch><duration>{divs}</duration><type>{typ}</type></note>')
                cursor = onset + dur
            if cursor < 4.0:
                divs = max(1, int((4.0 - cursor) * divisions))
                lines.append(f'      <note><rest/><duration>{divs}</duration><type>quarter</type></note>')
            lines.append('    </measure>')
        lines.append('  </part>')
    lines.append('</score-partwise>')
    return "\n".join(lines)
