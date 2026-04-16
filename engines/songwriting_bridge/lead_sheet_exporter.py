"""
Lead Sheet Exporter — Export lead sheet to MusicXML and summary.
"""

from typing import Any, Dict, List

from .lead_sheet_types import LeadSheet, VocalMelody, ChordSymbolTrack

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


def _parse_chord(cstr: str):
    if not cstr:
        return "C", "major", ""
    # Root step + optional accidental
    i = 1
    step = cstr[0]
    if len(cstr) > 1 and cstr[1] in ('#', 'b'):
        step += cstr[1]
        i = 2
    remainder = cstr[i:]
    # Quality
    if remainder.startswith('min') or remainder.startswith('m'):
        kind = 'minor'
    elif remainder.startswith('maj') or remainder.startswith('M'):
        kind = 'major'
    elif remainder.startswith('dim'):
        kind = 'diminished'
    elif remainder.startswith('aug'):
        kind = 'augmented'
    elif remainder.startswith('7') or remainder.startswith('9') \
         or remainder.startswith('11') or remainder.startswith('13'):
        kind = 'dominant'
    else:
        kind = 'major'
    # Extensions — keep as text for <kind text="...">
    ext = cstr[i:].strip()
    return step, kind, ext


def export_lead_sheet_to_musicxml(lead_sheet: LeadSheet) -> str:
    """
    Export lead sheet to MusicXML: vocal melody + chord symbols.
    """
    vm = lead_sheet.vocal_melody
    cs = lead_sheet.chord_symbols
    events = vm.events
    chords = cs.symbols if hasattr(cs, "symbols") else getattr(cs, "symbols", [])
    by_measure = {}
    for e in events:
        m = e.get("measure", 0)
        if m not in by_measure:
            by_measure[m] = {"notes": [], "chords": []}
        by_measure[m]["notes"].append(e)
    for c in chords:
        m = c.get("measure", 0)
        if m not in by_measure:
            by_measure[m] = {"notes": [], "chords": []}
        by_measure[m]["chords"].append(c)
    total_bars = max(by_measure.keys(), default=0) + 1
    divisions = 4
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<score-partwise version="4.0">',
        f'  <work><work-title>{_escape(lead_sheet.title)}</work-title></work>',
        '  <part-list>',
        '    <score-part id="P1"><part-name>Melody</part-name></score-part>',
        '  </part-list>',
        '  <part id="P1">',
    ]
    for m in range(total_bars):
        lines.append(f'    <measure number="{m + 1}">')
        if m == 0:
            lines.append(f'      <attributes><divisions>{divisions}</divisions>')
            lines.append('        <key><fifths>0</fifths><mode>major</mode></key>')
            lines.append('        <time><beats>4</beats><beat-type>4</beat-type></time>')
            lines.append('        <clef><sign>G</sign><line>2</line></clef></attributes>')
            lines.append('      <sound tempo="90"/>')
        bar_data = by_measure.get(m, {"notes": [], "chords": []})
        for ch in bar_data.get("chords", []):
            if ch.get("beat", 0) == 0:
                cstr = (ch.get("chord") or
                        f'{ch.get("root","C")}{ch.get("quality","") if ch.get("quality") != "major" else ""}').strip()
                step, kind, ext = _parse_chord(cstr)
                kind_tag = f'<kind text="{cstr[len(step):]}">{kind}</kind>' if ext else f'<kind>{kind}</kind>'
                letter = step[0]
                alter = -1 if len(step) > 1 and step[1] == 'b' else \
                         1 if len(step) > 1 and step[1] == '#' else 0
                alter_tag = f"<root-alter>{alter}</root-alter>" if alter != 0 else ""
                lines.append(
                    f'      <harmony><root><root-step>{letter}</root-step>{alter_tag}</root>{kind_tag}</harmony>'
                )
        evs = sorted(bar_data.get("notes", []), key=lambda x: x.get("beat_position", 0))
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
    lines.extend(['  </part>', '</score-partwise>'])
    return "\n".join(lines)


def export_lead_sheet_summary(lead_sheet: LeadSheet) -> Dict[str, Any]:
    """
    Export lead sheet as summary dict.
    """
    return {
        "title": lead_sheet.title,
        "voice_type": lead_sheet.vocal_melody.voice_type,
        "sections": [s.get("label", "verse") for s in lead_sheet.form_summary.sections],
        "chord_count": len(lead_sheet.chord_symbols.symbols if hasattr(lead_sheet.chord_symbols, "symbols") else []),
    }
