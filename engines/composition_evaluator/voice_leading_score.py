"""
Voice Leading Score — Melodic flow, interval leaps balance, direction changes.
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


def score_voice_leading(compiled_composition: Any) -> float:
    """Score 0–10: melodic flow, interval leaps balance, direction changes."""
    events = _get_all_events(compiled_composition)
    if not events:
        return 5.0
    intervals = _events_to_intervals(events)
    if not intervals:
        return 5.0
    leaps = [i for i in intervals if abs(i) >= 6]
    steps = [i for i in intervals if abs(i) <= 2]
    leap_ratio = len(leaps) / max(len(intervals), 1)
    step_ratio = len(steps) / max(len(intervals), 1)
    balance = 1.0 - abs(leap_ratio - 0.2) * 2.0
    direction_changes = sum(1 for i in range(1, len(intervals)) if (intervals[i] * intervals[i-1]) < 0)
    dir_ratio = direction_changes / max(len(intervals) - 1, 1)
    flow = min(2.0, dir_ratio * 4.0)
    raw = 5.0 + balance * 2.5 + flow * 2.5
    return max(0.0, min(10.0, raw))
