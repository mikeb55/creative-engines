"""
V5_ENGINE_PATCH_1: Validation pipeline.
Runs after generation. All checks must pass; on failure engine may retry (max VALIDATION_MAX_RETRIES)
or switch REPEAT_MODE to "flatten" and retry.
"""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

# Chord grid: list of chord entries per measure. Entry is str or tuple of str for split bar.
# Expected chord text is exact (e.g. "G\u266d\u0394\u0037(#11)", "E\u00f8\u0037").
def _get_chord_grid_for_measure(chord_grid: list, measure_1based: int, form_length_n: int) -> list[str]:
    """Return list of chord strings for this measure (1-based). Grid is 0..N-1, repeated for playthrough 2."""
    bar_0 = (measure_1based - 1) % form_length_n
    if bar_0 >= len(chord_grid):
        return []
    entry = chord_grid[bar_0]
    if isinstance(entry, (list, tuple)):
        return list(entry)
    return [str(entry)]

def _words_text_in_measure(meas: ET.Element) -> list[str]:
    """All <direction><direction-type><words> text in measure (chord symbols)."""
    out = []
    for d in meas.findall("direction"):
        w = d.find("direction-type/words")
        if w is not None and w.text:
            out.append(w.text.strip())
    return out

def _harmony_bass_in_measure(meas: ET.Element) -> list[bool]:
    """For each <harmony> in measure, whether it has <bass>."""
    return [h.find("bass") is not None for h in meas.findall("harmony")]

def _chord_has_slash(chord_text: str) -> bool:
    return "/" in chord_text

def validate_measure_count(part: ET.Element, expected: int) -> tuple[bool, str]:
    measures = part.findall("measure")
    n = len(measures)
    ok = n == expected
    return ok, f"MEASURE_COUNT: expected {expected}, got {n}" + (" PASS" if ok else " FAIL")

def validate_chords_present(part: ET.Element, chord_grid: list, form_length_n: int) -> tuple[bool, str]:
    measures = part.findall("measure")
    for i, meas in enumerate(measures):
        m1 = i + 1
        expected_chords = _get_chord_grid_for_measure(chord_grid, m1, form_length_n)
        if not expected_chords:
            return False, f"CHORDS_PRESENT: no grid entry for measure {m1}"
        harmonies = meas.findall("harmony")
        if len(harmonies) < len(expected_chords):
            return False, f"CHORDS_PRESENT: measure {m1} has {len(harmonies)} harmony, grid has {len(expected_chords)}"
    return True, "CHORDS_PRESENT: every measure has chord(s) from grid PASS"

def validate_chord_text_match(part: ET.Element, chord_grid: list, form_length_n: int) -> tuple[bool, str]:
    measures = part.findall("measure")
    for i, meas in enumerate(measures):
        m1 = i + 1
        expected = _get_chord_grid_for_measure(chord_grid, m1, form_length_n)
        words = _words_text_in_measure(meas)
        # Filter out credit/activity map words (long lines, header, section activity "A: A1")
        chord_words = [w for w in words if len(w) < 120 and not w.startswith("V5") and "PLAYTHROUGH" not in w and "LFV=" not in w and "LFV " not in w and not (len(w) <= 12 and ":" in w and w.strip()[0] in "ABC") and w.strip() != "*"]
        if len(chord_words) < len(expected):
            return False, f"CHORD_TEXT_MATCH: measure {m1} has {len(chord_words)} chord words, expected {len(expected)}"
        for j, ex in enumerate(expected):
            if j >= len(chord_words):
                return False, f"CHORD_TEXT_MATCH: measure {m1} chord {j+1} missing"
            if chord_words[j].strip() != ex.strip():
                return False, f"CHORD_TEXT_MATCH: measure {m1} expected '{ex}', got '{chord_words[j]}'"
    return True, "CHORD_TEXT_MATCH: exact string match to grid PASS"

def validate_slash_bass(part: ET.Element, chord_grid: list, form_length_n: int) -> tuple[bool, str]:
    measures = part.findall("measure")
    for i, meas in enumerate(measures):
        m1 = i + 1
        expected = _get_chord_grid_for_measure(chord_grid, m1, form_length_n)
        bass_flags = _harmony_bass_in_measure(meas)
        for j, ch in enumerate(expected):
            if _chord_has_slash(ch):
                if j >= len(bass_flags) or not bass_flags[j]:
                    return False, f"SLASH_BASS_PRESENT: measure {m1} chord '{ch}' has slash but <bass> missing"
    return True, "SLASH_BASS_PRESENT: slash chords have <bass> PASS"

def validate_rehearsal_marks(part: ET.Element, section_starts_playthrough_1: dict[int, str], form_length_n: int) -> tuple[bool, str]:
    """section_starts_playthrough_1: {measure_1based: "A"|"B"|"C"}. Playthrough 2 same relative: N+1, N+2, ..."""
    measures = part.findall("measure")
    required = dict(section_starts_playthrough_1)
    for m1, mark in list(required.items()):
        required[form_length_n + m1] = mark
    found = {}
    for meas in measures:
        num = meas.get("number", "")
        try:
            m1 = int(num)
        except ValueError:
            continue
        for d in meas.findall("direction"):
            r = d.find("direction-type/rehearsal")
            if r is not None and r.text:
                found[m1] = r.text.strip()
                break
    for m1, mark in required.items():
        if m1 > len(measures):
            continue
        if found.get(m1) != mark:
            return False, f"REHEARSAL_MARKS_PRESENT: measure {m1} expected '{mark}', got '{found.get(m1)}'"
    return True, "REHEARSAL_MARKS_PRESENT: A/B/C at section starts both playthroughs PASS"

def validate_repeats(part: ET.Element, repeat_spec: dict[str, Any]) -> tuple[bool, str]:
    """repeat_spec: { forward_at: [1, 17, ...], backward_at: [8, 24, ...] }"""
    forward_at = set(repeat_spec.get("forward_at", []))
    backward_at = set(repeat_spec.get("backward_at", []))
    measures = part.findall("measure")
    for m1 in forward_at:
        if m1 > len(measures):
            continue
        meas = measures[m1 - 1]
        reps = [r for r in meas.findall("barline/repeat") if r.get("direction") == "forward"]
        if not reps:
            return False, f"REPEATS_CORRECT: measure {m1} missing forward repeat"
    for m1 in backward_at:
        if m1 > len(measures):
            continue
        meas = measures[m1 - 1]
        reps = [r for r in meas.findall("barline/repeat") if r.get("direction") == "backward"]
        if not reps:
            return False, f"REPEATS_CORRECT: measure {m1} missing backward repeat"
    return True, "REPEATS_CORRECT: repeat barlines at required measures PASS"

def run_validation(
    musicxml_path: Path,
    chord_grid: list,
    form_length_n: int,
    section_starts: dict[int, str],
    repeat_spec: dict[str, Any] | None,
    repeat_mode: str,
) -> tuple[bool, list[str]]:
    """Run full validation. Returns (all_passed, list of report lines)."""
    tree = ET.parse(musicxml_path)
    part = tree.getroot().find("part")
    if part is None:
        return False, ["VALIDATION: no <part> in MusicXML"]
    report = []
    ok1, msg1 = validate_measure_count(part, 2 * form_length_n)
    report.append(msg1)
    if not ok1:
        return False, report
    ok2, msg2 = validate_chords_present(part, chord_grid, form_length_n)
    report.append(msg2)
    if not ok2:
        return False, report
    ok3, msg3 = validate_chord_text_match(part, chord_grid, form_length_n)
    report.append(msg3)
    if not ok3:
        return False, report
    ok4, msg4 = validate_slash_bass(part, chord_grid, form_length_n)
    report.append(msg4)
    if not ok4:
        return False, report
    ok5, msg5 = validate_rehearsal_marks(part, section_starts, form_length_n)
    report.append(msg5)
    if not ok5:
        return False, report
    if repeat_mode == "barlines" and repeat_spec:
        ok6, msg6 = validate_repeats(part, repeat_spec)
        report.append(msg6)
        if not ok6:
            report.append("REPEAT_VALIDATION_FAIL: suggest REPEAT_MODE=flatten and retry")
            return False, report
    else:
        report.append("REPEATS_CORRECT: (flatten mode or no spec) skip")
    return True, report


def next_version_prefix(requested_prefix: str, output_dir: Path, base_name: str) -> str:
    """
    Resolve version prefix so filename is unique.
    requested_prefix: e.g. "V5" or "V5.2"
    output_dir: directory to check for existing files
    base_name: e.g. "Orbit5X_TwoPlaythroughs_Martino"
    Returns e.g. "V5.2" or "V5.3" if V5.2_... exists.
    """
    output_dir = Path(output_dir)
    m = re.match(r"^V(\d+)(?:\.(\d+))?$", requested_prefix.strip())
    if not m:
        return requested_prefix
    major = int(m.group(1))
    minor = int(m.group(2)) if m.group(2) else 0
    for attempt in range(minor, minor + 25):
        prefix = f"V{major}.{attempt}" if attempt > 0 else f"V{major}"
        cand = output_dir / f"{prefix}_{base_name}.musicxml"
        if not cand.exists():
            return f"V{major}.{attempt}" if attempt > 0 else f"V{major}"
    return f"V{major}.{minor + 24}"
