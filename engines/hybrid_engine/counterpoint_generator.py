"""
Counterpoint Generator — Generate counterline, inner voice, build polyphonic texture.
"""

from typing import Any, Dict, List

import sys
import os
_base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _base not in sys.path:
    sys.path.insert(0, _base)
from shared_composer.engine_registry import get_engine, ensure_engines_loaded


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def generate_counterline(primary_line: List[Dict], engine_name: str, seed: int = 0) -> List[Dict]:
    """Generate counterline related to primary. Uses engine; complementary register/rhythm."""
    ensure_engines_loaded()
    eng = get_engine(engine_name)
    ir = eng.generate_ir("Counterline", mode="title", seed=seed)
    compiled = eng.compile_from_ir(ir)
    events = []
    for sec in compiled.sections:
        for e in sec.melody_events:
            ev = dict(e)
            ev["pitch"] = max(40, min(72, ev.get("pitch", 60) - 7))
            ev["section_id"] = e.get("section_id", sec.section_id)
            events.append(ev)
    return events


def generate_inner_voice(harmony_plan: List[Dict], engine_name: str, seed: int = 0) -> List[Dict]:
    """Generate inner voice from harmony plan. Sparse, chord-tone oriented."""
    ensure_engines_loaded()
    eng = get_engine(engine_name)
    ir = eng.generate_ir("Inner", mode="title", seed=seed)
    compiled = eng.compile_from_ir(ir)
    events = []
    h = _hash_int(seed)
    for sec in compiled.sections:
        for i, e in enumerate(sec.melody_events):
            if (h + i) % 3 == 0:
                ev = dict(e)
                ev["pitch"] = max(40, min(60, ev.get("pitch", 55) - 5))
                ev["duration"] = ev.get("duration", 1.0) * 1.5
                events.append(ev)
    return events


def build_polyphonic_texture(compiled_sections: List[Any], layout: Any) -> Dict[str, Any]:
    """Build polyphonic texture from compiled sections and layout."""
    lead_events = []
    for sec in compiled_sections:
        lead_events.extend(getattr(sec, "melody_events", []))
    result = {"lead": lead_events, "counterline": [], "inner_voice": [], "bass_motion": []}
    roles = getattr(layout, "voice_roles", [])
    seed = 0
    for r in roles:
        if r.role == "counterline" and r.engine:
            result["counterline"] = generate_counterline(lead_events, r.engine, seed + 1)
        elif r.role == "inner_voice" and r.engine:
            harm = []
            for sec in compiled_sections:
                harm.extend(getattr(sec, "harmony", []))
            result["inner_voice"] = generate_inner_voice(harm, r.engine, seed + 2)
    return result
