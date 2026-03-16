"""
Interval Language Score — Interval identity, characteristic intervals, avoid scalar monotony.
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


def score_interval_language(compiled_composition: Any) -> float:
    """Score 0–10: interval identity, characteristic intervals, avoid scalar monotony."""
    events = _get_all_events(compiled_composition)
    if not events:
        return 5.0
    intervals = _events_to_intervals(events)
    if not intervals:
        return 5.0
    abs_intervals = [abs(i) for i in intervals]
    characteristic = sum(1 for i in abs_intervals if i in (1, 2, 5, 6, 7, 11))
    char_ratio = characteristic / len(abs_intervals)
    scalar_only = sum(1 for i in abs_intervals if i in (1, 2))
    scalar_ratio = scalar_only / len(abs_intervals)
    monotony_penalty = scalar_ratio * 2.0 if scalar_ratio > 0.85 else 0.0
    identity_bonus = min(2.0, len(set(abs_intervals)) * 0.3)
    raw = 5.0 + char_ratio * 3.0 + identity_bonus - monotony_penalty
    return max(0.0, min(10.0, raw))
