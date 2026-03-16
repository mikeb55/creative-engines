"""
Range Allocator — Assign registers and parts to ensemble.
"""

from typing import Any, Dict, List, Optional

from .instrument_profiles import EnsembleProfile, get_ensemble_profile


def _collect_events(compiled: Any, hybrid_result: Optional[Dict] = None) -> List[Dict]:
    """Collect melody/counterline events from compiled or hybrid result."""
    events = []
    src = hybrid_result.get("compiled") if hybrid_result else compiled
    if src is None:
        src = compiled
    if hybrid_result:
        for e in hybrid_result.get("counterline_events", []):
            events.append({**e, "voice": "counterline"})
        for e in hybrid_result.get("inner_voice_events", []):
            events.append({**e, "voice": "inner"})
    if src:
        for sec in getattr(src, "sections", []):
            for e in getattr(sec, "melody_events", []):
                events.append({**e, "voice": "lead"})
    return events


def allocate_registers(
    compiled_composition: Any,
    ensemble_profile: EnsembleProfile,
    hybrid_result: Optional[Dict] = None,
) -> List[Dict[str, Any]]:
    """
    Allocate register ranges to each part based on composition and ensemble.
    Returns list of {part_index, instrument_name, midi_low, midi_high, role}.
    """
    profile = ensemble_profile if isinstance(ensemble_profile, EnsembleProfile) else get_ensemble_profile(str(ensemble_profile))
    if not profile:
        return []
    events = _collect_events(compiled_composition, hybrid_result)
    pitches = [e.get("pitch", 60) for e in events if e.get("pitch") is not None]
    pitch_min = min(pitches) if pitches else 48
    pitch_max = max(pitches) if pitches else 72
    span = pitch_max - pitch_min
    allocated = []
    for i, inst in enumerate(profile.instruments):
        role = inst.preferred_role
        low = max(inst.midi_low, pitch_min - 12)
        high = min(inst.midi_high, pitch_max + 12)
        if role == "melody":
            low = max(low, pitch_min - 5)
            high = min(high, pitch_max + 5)
        elif role == "bass":
            high = min(high, pitch_min + 12)
            low = max(low, pitch_min - 12)
        allocated.append({
            "part_index": i,
            "instrument_name": inst.name,
            "midi_low": low,
            "midi_high": high,
            "role": role,
        })
    return allocated


def assign_parts(
    compiled_composition: Any,
    ensemble_profile: EnsembleProfile,
    hybrid_result: Optional[Dict] = None,
) -> List[Dict[str, Any]]:
    """
    Assign source material to ensemble parts.
    Returns list of {part_index, instrument_name, role, events}.
    """
    profile = ensemble_profile if isinstance(ensemble_profile, EnsembleProfile) else get_ensemble_profile(str(ensemble_profile))
    if not profile:
        return []
    events = _collect_events(compiled_composition, hybrid_result)
    if not events and hasattr(compiled_composition, "sections"):
        for sec in compiled_composition.sections:
            for e in getattr(sec, "melody_events", []):
                events.append({**e, "voice": "lead"})
    allocated = allocate_registers(compiled_composition, profile, hybrid_result)
    voice_map = {"lead": 0, "counterline": 1, "inner": 2}
    by_voice = {}
    for e in events:
        v = e.get("voice", "lead")
        if v not in by_voice:
            by_voice[v] = []
        by_voice[v].append(e)
    parts = []
    melody_parts = [i for i, a in enumerate(allocated) if profile.instruments[i].preferred_role == "melody"]
    harmony_parts = [i for i, a in enumerate(allocated) if profile.instruments[i].preferred_role == "harmony"]
    counter_parts = [i for i, a in enumerate(allocated) if profile.instruments[i].preferred_role == "counterline"]
    bass_parts = [i for i, a in enumerate(allocated) if profile.instruments[i].preferred_role == "bass"]
    for i, inst in enumerate(profile.instruments):
        role = inst.preferred_role
        part_events = []
        if role == "melody" and melody_parts and melody_parts[0] == i:
            part_events = by_voice.get("lead", [])
        elif role == "counterline" and counter_parts and counter_parts[0] == i:
            part_events = by_voice.get("counterline", by_voice.get("inner", []))
        elif role == "harmony" and harmony_parts:
            part_events = []
        elif role == "bass" and bass_parts:
            part_events = []
        parts.append({
            "part_index": i,
            "instrument_name": inst.name,
            "role": role,
            "events": part_events,
            "allocated": allocated[i] if i < len(allocated) else {},
        })
    return parts
