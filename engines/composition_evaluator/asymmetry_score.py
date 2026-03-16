"""
Asymmetry Score — Irregular phrase lengths, rhythmic unpredictability, structural contrast.
"""

from typing import Any, Dict, List


def _get_all_events(compiled: Any) -> List[Dict]:
    events = []
    for sec in getattr(compiled, "sections", []):
        events.extend(getattr(sec, "melody_events", []))
    if not events:
        melody = getattr(compiled, "melody", None)
        if melody:
            events = getattr(melody, "events", [])
    return events


def score_asymmetry(compiled_composition: Any) -> float:
    """Score 0–10: irregular phrase lengths, rhythmic unpredictability, structural contrast."""
    sections = getattr(compiled_composition, "sections", [])
    events = _get_all_events(compiled_composition)
    phrase_lengths = []
    for sec in sections:
        pl = getattr(sec, "phrase_lengths", [])
        if pl:
            phrase_lengths.extend(pl)
        else:
            bar_start = getattr(sec, "bar_start", 0)
            bar_end = getattr(sec, "bar_end", 0)
            if bar_end > bar_start:
                phrase_lengths.append(bar_end - bar_start)
    if not phrase_lengths:
        phrase_lengths = [getattr(sec, "bar_end", 8) - getattr(sec, "bar_start", 0) for sec in sections]
    irreg = 0.0
    if phrase_lengths:
        mn, mx = min(phrase_lengths), max(phrase_lengths)
        irreg = (mx - mn) / max(mx, 1) * 4.0
    odd_bonus = sum(1 for p in phrase_lengths if p % 2 == 1) / max(len(phrase_lengths), 1) * 2.0
    rhythm_var = 0.0
    if len(events) >= 4:
        durs = [e.get("duration", 1.0) for e in events]
        if durs:
            unique_dur = len(set(round(d, 2) for d in durs))
            rhythm_var = min(2.0, unique_dur * 0.5)
    beat_pos = [e.get("beat_position", 0) for e in events]
    if len(beat_pos) >= 4:
        offbeat = sum(1 for b in beat_pos if b % 1.0 != 0)
        rhythm_var += min(1.0, offbeat / max(len(beat_pos), 1) * 2.0)
    structure = len(set(getattr(sec, "role", "") for sec in sections)) * 0.5
    raw = 5.0 + irreg + odd_bonus + rhythm_var + structure
    return max(0.0, min(10.0, raw))
