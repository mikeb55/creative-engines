"""
Motif Coherence — Score motif reuse, variation, spacing, avoid random fragments.
"""

from typing import Any, Dict, List, Tuple


def _get_all_events(compiled: Any) -> List[Dict]:
    events = []
    for sec in getattr(compiled, "sections", []):
        events.extend(getattr(sec, "melody_events", []))
    if not events:
        melody = getattr(compiled, "melody", None)
        if melody:
            events = getattr(melody, "events", [])
    return events


def _events_to_intervals(events: List[Dict]) -> List[int]:
    if len(events) < 2:
        return []
    out = []
    prev = events[0].get("pitch", 60)
    for e in events[1:]:
        p = e.get("pitch", prev)
        out.append(p - prev)
        prev = p
    return out


def _find_repeated_cells(intervals: List[int], cell_len: int = 3) -> int:
    if len(intervals) < cell_len:
        return 0
    count = 0
    for i in range(len(intervals) - cell_len):
        cell = tuple(intervals[i:i + cell_len])
        for j in range(i + cell_len, len(intervals) - cell_len + 1):
            if tuple(intervals[j:j + cell_len]) == cell:
                count += 1
                break
    return count


def _motif_variation(intervals: List[int]) -> float:
    if len(intervals) < 4:
        return 0.5
    cells = [tuple(intervals[i:i+3]) for i in range(0, len(intervals)-2, 2)]
    unique = len(set(cells))
    return min(1.0, unique / max(len(cells), 1))


def _motif_spacing(events: List[Dict]) -> float:
    if len(events) < 4:
        return 0.5
    measures = [e.get("measure", 0) for e in events]
    gaps = [measures[i+1] - measures[i] for i in range(len(measures)-1) if measures[i+1] != measures[i]]
    if not gaps:
        return 0.5
    return min(1.0, 1.0 - (max(gaps) - min(gaps)) / 10.0) if max(gaps) > min(gaps) else 0.8


def _random_fragment_penalty(intervals: List[int]) -> float:
    if len(intervals) < 6:
        return 0.0
    step_count = sum(1 for i in intervals if abs(i) <= 2)
    leap_count = sum(1 for i in intervals if abs(i) >= 6)
    total = len(intervals)
    if total == 0:
        return 0.0
    step_ratio = step_count / total
    if step_ratio > 0.9:
        return 0.3
    if step_ratio < 0.2 and leap_count / total > 0.5:
        return 0.2
    return 0.0


def score_motif_coherence(compiled_composition: Any) -> float:
    """Score 0–10: motif reuse, variation, spacing, avoid random fragments."""
    events = _get_all_events(compiled_composition)
    if not events:
        return 5.0
    intervals = _events_to_intervals(events)
    reuse = min(1.0, _find_repeated_cells(intervals) / 3.0) * 2.5
    variation = _motif_variation(intervals) * 2.5
    spacing = _motif_spacing(events) * 2.5
    penalty = _random_fragment_penalty(intervals) * 2.5
    motif_refs = 0
    for sec in getattr(compiled_composition, "sections", []):
        motif_refs += len(getattr(sec, "motif_refs", []))
    ref_bonus = min(1.0, motif_refs / 3.0) * 2.5
    raw = reuse + variation + spacing + ref_bonus - penalty
    return max(0.0, min(10.0, 5.0 + (raw - 5.0)))
