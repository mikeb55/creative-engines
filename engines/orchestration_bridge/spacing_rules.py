"""
Spacing Rules — Apply spacing and score clarity for ensemble parts.
"""

from typing import Any, Dict, List

from .instrument_profiles import EnsembleProfile, get_ensemble_profile
from .range_allocator import assign_parts


def apply_spacing_rules(
    part_assignments: List[Dict[str, Any]],
    ensemble_profile: EnsembleProfile,
) -> List[Dict[str, Any]]:
    """
    Apply spacing rules: close/mid/open, low-register density limits, avoid mud.
    Returns updated part_assignments with spacing_applied flag.
    """
    profile = ensemble_profile if isinstance(ensemble_profile, EnsembleProfile) else get_ensemble_profile(str(ensemble_profile))
    if not profile:
        return part_assignments
    result = []
    low_threshold = 48
    for p in part_assignments:
        events = p.get("events", [])
        adjusted = []
        for e in events:
            pitch = e.get("pitch", 60)
            if pitch < low_threshold and profile.max_low_register_density < 0.5:
                if pitch < 40:
                    continue
            adjusted.append(e)
        result.append({
            **p,
            "events": adjusted,
            "spacing_applied": True,
        })
    return result


def score_spacing_clarity(part_assignments: List[Dict[str, Any]]) -> float:
    """
    Score spacing clarity 0–1. Higher = clearer, less mud.
    """
    if not part_assignments:
        return 0.5
    scores = []
    for p in part_assignments:
        events = p.get("events", [])
        if not events:
            scores.append(0.5)
            continue
        pitches = [e.get("pitch", 60) for e in events if e.get("pitch")]
        if not pitches:
            scores.append(0.5)
            continue
        span = max(pitches) - min(pitches)
        low_count = sum(1 for x in pitches if x < 48)
        density = low_count / len(pitches) if pitches else 0
        clarity = 1.0 - (density * 0.5)
        if span > 24:
            clarity *= 0.9
        scores.append(max(0.0, min(1.0, clarity)))
    return sum(scores) / len(scores) if scores else 0.5
