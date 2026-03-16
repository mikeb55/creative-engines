"""
Ensemble MusicXML Exporter — Export ensemble arrangement to valid multi-part MusicXML.
"""

from typing import Any, Dict, List

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


def export_ensemble_to_musicxml(ensemble_arrangement: Dict[str, Any]) -> str:
    """
    Export ensemble arrangement to valid multi-part MusicXML.
    """
    parts = ensemble_arrangement.get("parts", [])
    compiled = ensemble_arrangement.get("compiled")
    if not parts and compiled:
        title = getattr(compiled, "title", "Untitled")
        return f'<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>{_escape(title)}</work-title></work></score-partwise>'
    if not parts:
        return '<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>Untitled</work-title></work></score-partwise>'
    by_part_measure = {}
    for p in parts:
        idx = p.get("part_index", 0)
        inst = p.get("instrument_name", f"Part{idx+1}")
        events = p.get("events", [])
        for e in events:
            m = e.get("measure", 0)
            key = (idx, m)
            if key not in by_part_measure:
                by_part_measure[key] = []
            by_part_measure[key].append(e)
    total_bars = max((m for (_, m) in by_part_measure), default=0) + 1
    meta = getattr(compiled, "metadata", {}) or {} if compiled else {}
    tempo = meta.get("tempo", 90)
    title = getattr(compiled, "title", "Untitled") if compiled else "Untitled"
    divisions = 4
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<score-partwise version="4.0">',
        f'  <work><work-title>{_escape(title)}</work-title></work>',
        '  <part-list>',
    ]
    for p in parts:
        pid = f"P{p.get('part_index', 0) + 1}"
        name = p.get("instrument_name", "Part")
        lines.append(f'    <score-part id="{pid}"><part-name>{_escape(name)}</part-name></score-part>')
    lines.append('  </part-list>')
    for p in parts:
        idx = p.get("part_index", 0)
        pid = f"P{idx + 1}"
        lines.append(f'  <part id="{pid}">')
        for m in range(total_bars):
            evs = sorted(by_part_measure.get((idx, m), []), key=lambda x: x.get("beat_position", 0))
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
