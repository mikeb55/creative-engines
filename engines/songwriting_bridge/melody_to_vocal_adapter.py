"""
Melody to Vocal Adapter — Adapt melody to singable vocal range.
"""

from typing import Any, Dict, List

from .lead_sheet_types import VocalMelody

VOICE_RANGES = {
    "male_tenor": (55, 81),
    "male_baritone": (48, 72),
    "male_bass": (40, 67),
    "female_lead": (60, 88),
    "female_alto": (52, 76),
}


def adapt_melody_to_vocal_range(
    compiled_composition: Any,
    voice_type: str = "male_tenor",
) -> List[Dict[str, Any]]:
    """
    Adapt melody events to vocal range. Preserves contour where possible.
    """
    low, high = VOICE_RANGES.get(voice_type, VOICE_RANGES["male_tenor"])
    events = []
    for sec in getattr(compiled_composition, "sections", []):
        for e in getattr(sec, "melody_events", []):
            events.append(dict(e))
    if not events:
        return []
    pitches = [e.get("pitch", 60) for e in events if e.get("pitch") is not None]
    if not pitches:
        return events
    orig_min, orig_max = min(pitches), max(pitches)
    shift = 0
    if orig_max > high:
        shift = high - orig_max
    if orig_min + shift < low:
        shift = low - orig_min
    result = []
    for e in events:
        ev = dict(e)
        if ev.get("pitch") is not None:
            ev["pitch"] = max(low, min(high, ev["pitch"] + shift))
        result.append(ev)
    return result


def create_vocal_melody(
    compiled_composition: Any,
    voice_type: str = "male_tenor",
) -> VocalMelody:
    """
    Create VocalMelody from compiled composition.
    """
    adapted = adapt_melody_to_vocal_range(compiled_composition, voice_type)
    pitches = [e.get("pitch", 60) for e in adapted if e.get("pitch") is not None]
    orig_pitches = []
    for sec in getattr(compiled_composition, "sections", []):
        for e in getattr(sec, "melody_events", []):
            if e.get("pitch") is not None:
                orig_pitches.append(e["pitch"])
    orig_range = (min(orig_pitches), max(orig_pitches)) if orig_pitches else (60, 72)
    adapt_range = (min(pitches), max(pitches)) if pitches else (60, 72)
    return VocalMelody(
        events=adapted,
        voice_type=voice_type,
        original_range=orig_range,
        adapted_range=adapt_range,
    )
