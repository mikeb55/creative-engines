"""
MusicXML Exporter — Lead sheet with melody, chords, lyrics, section markers, melisma.
"""

from typing import Any, Dict, List, Optional

DIVISIONS = 4
ENHARMONIC = {
    0: ("C", 0), 1: ("C", 1), 2: ("D", 0), 3: ("D", 1), 4: ("E", 0), 5: ("F", 0),
    6: ("F", 1), 7: ("G", 0), 8: ("G", 1), 9: ("A", 0), 10: ("A", 1), 11: ("B", 0),
}


def _duration_to_xml(duration: float) -> tuple:
    divs = max(1, int(duration * DIVISIONS))
    if divs <= 1:
        return 1, "16th", False
    if divs <= 2:
        return 2, "eighth", False
    if divs <= 4:
        return 4, "quarter", False
    if divs <= 6:
        return 6, "quarter", True
    if divs <= 8:
        return 8, "half", False
    if divs <= 12:
        return 12, "half", True
    return 16, "whole", False


def _spell_pitch(midi: int) -> tuple:
    pc = midi % 12
    octave = (midi // 12) - 1
    step, alter = ENHARMONIC.get(pc, ("C", 0))
    return step, alter, octave


def _note_xml(pitch: int, duration: float, syllable: Optional[str] = None, syllabic: Optional[str] = None) -> str:
    divs, typ, dot = _duration_to_xml(duration)
    step, alter, octave = _spell_pitch(pitch)
    alter_tag = f"<alter>{alter}</alter>" if alter != 0 else ""
    dot_tag = "<dot/>" if dot else ""
    lyric = ""
    if syllable:
        syllabic_val = syllabic or "single"
        lyric = f"<lyric><syllabic>{syllabic_val}</syllabic><text>{syllable}</text></lyric>"
    elif syllabic in ("middle", "end"):
        lyric = f"<lyric><syllabic>{syllabic}</syllabic></lyric>"
    return (
        f"      <note><pitch><step>{step}</step>{alter_tag}<octave>{octave}</octave></pitch>"
        f"<duration>{divs}</duration><type>{typ}</type>{dot_tag}"
        f"{lyric}</note>"
    )


def _rest_xml(duration: float) -> str:
    divs, typ, dot = _duration_to_xml(duration)
    dot_tag = "<dot/>" if dot else ""
    return f"      <note><rest/><duration>{divs}</duration><type>{typ}</type>{dot_tag}</note>"


class MusicXMLExporter:
    """Export CandidateComposition to MusicXML lead sheet."""

    def export(
        self,
        candidate: Dict[str, Any],
        title: Optional[str] = None,
        key_center: str = "C",
    ) -> str:
        """Produce MusicXML string."""
        title = title or candidate.get("title", "Song")
        sections = candidate.get("sections", [])
        melody = candidate.get("melody", [])
        harmony = candidate.get("harmony", [])

        by_measure: Dict[int, List[Dict]] = {}
        for e in melody:
            m = e.get("measure", 0)
            if m not in by_measure:
                by_measure[m] = []
            by_measure[m].append(e)

        chords_by_measure: Dict[int, List[Dict]] = {}
        for h in harmony:
            m = h.get("measure", 0)
            if m not in chords_by_measure:
                chords_by_measure[m] = []
            chords_by_measure[m].append(h)

        section_markers = {}
        for s in sections:
            bar_start = s.get("bar_start", 0)
            sid = s.get("id", "verse")
            section_markers[bar_start] = sid

        total_bars = max(by_measure.keys(), default=0) + 1
        total_bars = max(total_bars, max(chords_by_measure.keys(), default=0) + 1)

        lines = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">',
            '<score-partwise version="3.1">',
            '  <work><work-title>' + title + '</work-title></work>',
            '  <identification><encoding><software>Songwriting Engine</software></encoding></identification>',
            '  <part-list>',
            '    <score-part id="P1"><part-name>Voice</part-name></score-part>',
            '  </part-list>',
            '  <part id="P1">',
        ]

        for m in range(total_bars):
            if m in section_markers:
                lines.append(f'    <measure number="{m + 1}">')
                lines.append(f'      <direction><direction-type><rehearsal>{section_markers[m]}</rehearsal></direction-type></direction>')
            else:
                lines.append(f'    <measure number="{m + 1}">')

            if m == 0:
                lines.append('      <attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>')

            # Chord symbols
            for h in chords_by_measure.get(m, []):
                sym = h.get("symbol", "C")
                lines.append(f'      <harmony><root><root-step>{sym[0] if sym else "C"}</root-step></root></harmony>')

            # Notes
            evs = sorted(by_measure.get(m, []), key=lambda x: x.get("beat_position", 0))
            cursor = 0.0
            for e in evs:
                onset = e.get("beat_position", 0)
                dur = e.get("duration", 1.0)
                if onset > cursor:
                    lines.append(_rest_xml(onset - cursor))
                    cursor = onset
                pitch = e.get("pitch", 60)
                syll = e.get("syllable")
                melisma = e.get("melisma", False)
                syllabic_val = None
                if syll:
                    syllabic_val = "begin" if melisma else "single"
                elif melisma:
                    syllabic_val = "middle"
                lines.append(_note_xml(pitch, dur, syll, syllabic_val))
                cursor = onset + dur

            if cursor < 4.0:
                lines.append(_rest_xml(4.0 - cursor))

            lines.append('    </measure>')

        lines.extend(['  </part>', '</score-partwise>'])
        return "\n".join(lines)


def export_compiled_song_to_musicxml(compiled_song) -> str:
    """
    Export CompiledSong to full MusicXML.
    Includes work-title, part-list, measures, melody notes, lyrics, harmony.
    """
    try:
        from .musicxml_contracts import DEFAULT_DIVISIONS
    except ImportError:
        from musicxml_contracts import DEFAULT_DIVISIONS

    constraints = compiled_song.metadata.get("musicxml_constraints") if compiled_song.metadata else None
    hints = compiled_song.metadata.get("export_hints") if compiled_song.metadata else None
    divisions = getattr(constraints, "divisions", None) or DEFAULT_DIVISIONS
    key_center = getattr(hints, "key_center", "C") if hints else "C"
    tempo = getattr(hints, "tempo", 90) if hints else 90

    key_fifths = {"C": 0, "G": 1, "D": 2, "A": 3, "E": 4, "B": 5, "F": -1, "Bb": -2, "Eb": -3, "Ab": -4, "Db": -5,
                  "Am": 0, "Em": 1, "Bm": 2, "F#m": 3, "C#m": 4, "G#m": 5, "Dm": -1, "Gm": -2, "Cm": -3, "Fm": -4, "Bbm": -5}
    fifths = key_fifths.get(key_center, 0)

    by_measure: Dict[int, List[Dict]] = {}
    for sec in compiled_song.sections:
        for e in sec.melody_events:
            m = e.get("measure", 0)
            if m not in by_measure:
                by_measure[m] = []
            ev = dict(e)
            ev["_section_id"] = sec.section_id
            ev["_lyric_lines"] = sec.lyric_lines
            by_measure[m].append(ev)

    chords_by_measure: Dict[int, List[Dict]] = {}
    for sec in compiled_song.sections:
        for h in sec.harmony:
            m = h.get("measure", 0)
            if m not in chords_by_measure:
                chords_by_measure[m] = []
            chords_by_measure[m].append(h)

    total_bars = max(by_measure.keys(), default=0) + 1
    total_bars = max(total_bars, max(chords_by_measure.keys(), default=0) + 1)

    def _get_syllables(lyric_lines: List[str]) -> List[str]:
        words = []
        for line in lyric_lines or []:
            words.extend(str(line).split())
        return words

    syl_index_by_section: Dict[str, int] = {}
    syls_by_section: Dict[str, List[str]] = {}
    for sec in compiled_song.sections:
        syls_by_section[sec.section_id] = _get_syllables(sec.lyric_lines)
        syl_index_by_section[sec.section_id] = 0

    for m in range(total_bars):
        evs = sorted(by_measure.get(m, []), key=lambda x: (x.get("beat_position", 0), x.get("id", "")))
        for ev in evs:
            sid = ev.get("_section_id", "")
            if sid and syl_index_by_section.get(sid, 0) < len(syls_by_section.get(sid, [])):
                ev["_syllable"] = syls_by_section[sid][syl_index_by_section[sid]]
                syl_index_by_section[sid] += 1

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<score-partwise version="4.0">',
        '  <work><work-title>' + _escape(compiled_song.title) + '</work-title></work>',
        '  <identification><encoding><software>Song IR Engine</software></encoding></identification>',
        '  <part-list>',
        '    <score-part id="P1"><part-name>Voice</part-name></score-part>',
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

        evs = sorted(by_measure.get(m, []), key=lambda x: (x.get("beat_position", 0), x.get("id", "")))

        for h in chords_by_measure.get(m, []):
            sym = h.get("symbol", "C") or "C"
            root_step = sym[0] if sym and sym[0].isalpha() else "C"
            alter = 1 if len(sym) > 1 and sym[1] == "#" else -1 if len(sym) > 1 and sym[1] == "b" else 0
            alter_tag = f"<alter>{alter}</alter>" if alter != 0 else ""
            kind = "minor" if "m" in sym and "maj" not in sym else "major"
            lines.append(f'      <harmony><root><root-step>{root_step}</root-step>{alter_tag}</root><kind>{kind}</kind></harmony>')

        cursor = 0.0
        for ev in evs:
            onset = ev.get("beat_position", 0)
            dur = ev.get("duration", 1.0)
            if onset > cursor:
                divs = max(1, int((onset - cursor) * divisions / 4))
                lines.append(f'      <note><rest/><duration>{divs}</duration><type>quarter</type></note>')
                cursor = onset
            pitch = ev.get("pitch", 60)
            step, alter, octave = _spell_pitch(pitch)
            alter_tag = f"<alter>{alter}</alter>" if alter != 0 else ""
            divs = max(1, int(dur * divisions / 4))
            typ = "quarter" if divs <= 4 else "half" if divs <= 8 else "whole"
            syll = ev.get("_syllable")
            lyric = f'<lyric><syllabic>single</syllabic><text>{_escape(syll)}</text></lyric>' if syll else ""
            lines.append(
                f'      <note><pitch><step>{step}</step>{alter_tag}<octave>{octave}</octave></pitch>'
                f'<duration>{divs}</duration><type>{typ}</type>{lyric}</note>'
            )
            cursor = onset + dur

        if cursor < 4.0:
            divs = max(1, int((4.0 - cursor) * divisions / 4))
            lines.append(f'      <note><rest/><duration>{divs}</duration><type>quarter</type></note>')

        lines.append('    </measure>')

    lines.extend(['  </part>', '</score-partwise>'])
    return "\n".join(lines)


def _escape(s: str) -> str:
    """Escape XML special chars."""
    if not s:
        return ""
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")
