"""
MusicXML Contracts — Validation and export-shape contracts.
Phase 1: contracts and stub only. Honest, minimal, contract-safe.
"""

from typing import Any, Dict, List, Optional

try:
    from .compiled_song_types import CompiledSong, CompiledSection
except ImportError:
    from compiled_song_types import CompiledSong, CompiledSection

ACCEPTED_EXTENSIONS = (".musicxml", ".xml", ".mxl")
REQUIRED_CORE_STRUCTURES = ["score-partwise", "part", "measure", "note"]
SUPPORTED_NOTE_DURATIONS = ["quarter", "eighth", "half", "whole", "16th"]
DEFAULT_DIVISIONS = 4


def validate_compiled_for_export(compiled: CompiledSong) -> Dict[str, Any]:
    """
    Validate compiled song meets MusicXML export constraints.
    Returns validation result with required fields, structure, errors.
    """
    result = {"valid": True, "errors": [], "warnings": []}
    if not compiled.sections:
        result["valid"] = False
        result["errors"].append("no sections")
    if not compiled.melody:
        result["warnings"].append("no melody events")
    for sec in compiled.sections:
        if not sec.melody_events:
            result["warnings"].append(f"section {sec.section_id} has no melody")
    return result


def compiled_song_to_musicxml_stub(compiled: CompiledSong) -> str:
    """
    Minimal MusicXML-safe stub. Honest implementation.
    Returns a simple XML string stub with basic structure.
    """
    v = validate_compiled_for_export(compiled)
    if not v["valid"]:
        return f"<!-- Invalid: {'; '.join(v['errors'])} -->"

    lines = []
    lines.append('<?xml version="1.0" encoding="UTF-8"?>')
    lines.append('<score-partwise version="4.0">')
    lines.append('  <work><work-title>' + _escape(compiled.title) + '</work-title></work>')
    lines.append('  <part-list>')
    lines.append('    <score-part id="P1"><part-name>Voice</part-name></score-part>')
    lines.append('  </part-list>')
    lines.append('  <part id="P1">')

    measure_map: Dict[int, List[Dict]] = {}
    for sec in compiled.sections:
        for e in sec.melody_events:
            m = e.get("measure", 0)
            if m not in measure_map:
                measure_map[m] = []
            measure_map[m].append(e)

    measures = sorted(measure_map.keys()) if measure_map else [0]
    for m in measures:
        lines.append(f'    <measure number="{m + 1}">')
        events = measure_map.get(m, [])
        for e in events:
            pitch = e.get("pitch", 60)
            step, alter, octave = _spell_pitch(pitch)
            alter_tag = f"<alter>{alter}</alter>" if alter != 0 else ""
            lines.append(f'      <note><pitch><step>{step}</step>{alter_tag}<octave>{octave}</octave></pitch>')
            lines.append(f'        <duration>{DEFAULT_DIVISIONS}</duration><type>quarter</type></note>')
        if not events:
            lines.append('      <note><rest/><duration>4</duration><type>whole</type></note>')
        lines.append('    </measure>')

    lines.append('  </part>')
    lines.append('</score-partwise>')
    return "\n".join(lines)


def _spell_pitch(midi: int) -> tuple:
    """Spell MIDI pitch as (step, alter, octave)."""
    ENHARMONIC = {0: ("C", 0), 1: ("C", 1), 2: ("D", 0), 3: ("D", 1), 4: ("E", 0), 5: ("F", 0),
                  6: ("F", 1), 7: ("G", 0), 8: ("G", 1), 9: ("A", 0), 10: ("A", 1), 11: ("B", 0)}
    pc = midi % 12
    octave = (midi // 12) - 1
    step, alter = ENHARMONIC.get(pc, ("C", 0))
    return step, alter, octave


def _escape(s: str) -> str:
    """Escape XML special chars."""
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def validate_musicxml_export(xml_string: str) -> None:
    """
    Validate exported MusicXML. Raises ValueError with clear message if invalid.
    """
    if not xml_string or not xml_string.strip():
        raise ValueError("MusicXML export is empty")
    if "<?xml" not in xml_string:
        raise ValueError("MusicXML must start with <?xml declaration")
    if "<score-partwise" not in xml_string:
        raise ValueError("MusicXML must contain score-partwise root")
    if "<work-title>" not in xml_string:
        raise ValueError("MusicXML must contain work-title")
    if "<part-list>" not in xml_string or "<score-part" not in xml_string:
        raise ValueError("MusicXML must contain part-list and score-part")
    if "<part " not in xml_string:
        raise ValueError("MusicXML must contain part element")
    if "<measure " not in xml_string:
        raise ValueError("MusicXML must contain at least one measure")
    if "<note>" not in xml_string and "<note " not in xml_string:
        raise ValueError("MusicXML must contain at least one note")
    if "<duration>" not in xml_string:
        raise ValueError("MusicXML notes must have duration")
