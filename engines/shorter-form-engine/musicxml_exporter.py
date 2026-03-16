"""
Shorter Form MusicXML Exporter — Export form skeleton to MusicXML.
"""

from typing import Optional

try:
    from .compiled_composition_types import CompiledComposition, CompiledSection, CompiledMelodyBlueprint
except ImportError:
    from compiled_composition_types import CompiledComposition, CompiledSection, CompiledMelodyBlueprint

DURATION_MAP = {"whole": 4, "half": 2, "quarter": 1, "eighth": 0.5, "16th": 0.25}


def export_composition_to_musicxml(compiled_composition: CompiledComposition, path: Optional[str] = None) -> str:
    """Export to MusicXML. Returns XML string; optionally writes to path."""
    div = 4
    xml = ['<?xml version="1.0" encoding="UTF-8"?>']
    xml.append('<score-partwise version="4.0">')
    xml.append(f'  <work><work-title>{_esc(compiled_composition.title)}</work-title></work>')
    xml.append('  <part-list>')
    xml.append('    <score-part id="P1">')
    xml.append('      <part-name>Form</part-name>')
    xml.append('    </score-part>')
    xml.append('  </part-list>')
    xml.append('  <part id="P1">')
    m = 0
    for sec in compiled_composition.sections:
        for b in range(sec.bar_count):
            m += 1
            xml.append(f'    <measure number="{m}">')
            if m == 1:
                xml.append(f'      <attributes><divisions>{div}</divisions><time><beats>{compiled_composition.meter[0]}</beats><beat-type>{compiled_composition.meter[1]}</beat-type></time></attributes>')
                xml.append(f'      <direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>{compiled_composition.tempo}</per-minute></metronome></direction-type><sound tempo="{compiled_composition.tempo}"/></direction>')
            mb = sec.melody_blueprint
            dur_total = 0
            for i, d in enumerate(mb.durations):
                dval = DURATION_MAP.get(d, 1) * div
                pitch = 60 + (mb.intervals[i % len(mb.intervals)] if mb.intervals else 0)
                step, alter, octave = _pitch_step_alter(pitch)
                alt = f"<alter>{alter}</alter>" if alter else ""
                xml.append(f'      <note><pitch><step>{step}</step>{alt}<octave>{octave}</octave></pitch><duration>{int(dval)}</duration><type>{_type_from_dur(d)}</type></note>')
                dur_total += dval
            if dur_total < div * compiled_composition.meter[0]:
                xml.append(f'      <note><rest/><duration>{int(div * compiled_composition.meter[0] - dur_total)}</duration><type>quarter</type></note>')
            xml.append('    </measure>')
    xml.append('  </part>')
    xml.append('</score-partwise>')
    out = '\n'.join(xml)
    if path:
        with open(path, "w", encoding="utf-8") as f:
            f.write(out)
    return out


def _esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def _pitch_step_alter(midi: int) -> tuple:
    steps = ["C", "C", "D", "D", "E", "F", "F", "G", "G", "A", "A", "B"]
    alters = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0]
    pc = midi % 12
    return steps[pc], alters[pc], (midi // 12) - 1


def _type_from_dur(d: str) -> str:
    return {"whole": "whole", "half": "half", "quarter": "quarter", "eighth": "eighth", "16th": "16th"}.get(d, "quarter")


def _pitch_step(midi: int) -> str:
    return _pitch_step_alter(midi)[0]
