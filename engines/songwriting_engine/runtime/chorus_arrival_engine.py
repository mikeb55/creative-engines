"""
Chorus Arrival Engine — Strengthen prechorus-to-chorus lift and bridge-to-final-chorus payoff.
"""

from copy import deepcopy
from typing import Any, Dict, List, Optional

try:
    from .melody_generator import _clamp_pitch, _vocal_range
except ImportError:
    from melody_generator import _clamp_pitch, _vocal_range


def score_chorus_arrival(song: Dict[str, Any]) -> float:
    """
    Score 0-10: prechorus lift, chorus inevitability, bridge payoff.
    """
    sections = song.get("sections", [])
    if len(sections) < 2:
        return 5.0

    score = 5.0

    prechorus = next((s for s in sections if s.get("section_role") == "prechorus"), None)
    chorus_first = next((s for s in sections if s.get("section_role") == "chorus"), None)
    if prechorus and chorus_first:
        pc_e = prechorus.get("energy_level", 0.6)
        ch_e = chorus_first.get("energy_level", 0.75)
        if ch_e > pc_e:
            score += 1.5
        elif ch_e >= pc_e - 0.02:
            score += 0.5

    verse_before_chorus = None
    for i, s in enumerate(sections):
        if s.get("section_role") == "chorus" and i > 0:
            prev = sections[i - 1]
            if prev.get("section_role") in ("verse", "prechorus"):
                verse_before_chorus = prev
                break
    if verse_before_chorus and chorus_first:
        v_e = verse_before_chorus.get("energy_level", 0.5)
        ch_e = chorus_first.get("energy_level", 0.7)
        if ch_e > v_e + 0.1:
            score += 1.0

    bridge = next((s for s in sections if s.get("section_role") == "bridge"), None)
    choruses = [s for s in sections if s.get("section_role") == "chorus"]
    if bridge and len(choruses) >= 2:
        final_ch = choruses[-1]
        final_e = final_ch.get("energy_level", 0.75)
        first_ch_e = choruses[0].get("energy_level", 0.75)
        if final_e >= first_ch_e - 0.02:
            score += 1.0

    return round(min(10.0, score), 1)


def strengthen_prechorus_to_chorus_arrival(song: Dict[str, Any], hook_dna: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Increase prechorus tension before chorus; raise contour pressure.
    """
    c = deepcopy(song)
    sections = c.get("sections", [])

    for i, s in enumerate(sections):
        if s.get("section_role") == "prechorus":
            s["energy_level"] = min(0.78, max(s.get("energy_level", 0.6), 0.62))
        elif s.get("section_role") == "chorus" and i > 0 and sections[i - 1].get("section_role") == "prechorus":
            s["energy_level"] = max(s.get("energy_level", 0.7), 0.74)

    return c


def strengthen_bridge_to_final_chorus_payoff(song: Dict[str, Any], hook_dna: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Make final chorus feel bigger or more inevitable than first chorus.
    """
    c = deepcopy(song)
    sections = c.get("sections", [])
    choruses = [(i, s) for i, s in enumerate(sections) if s.get("section_role") == "chorus"]

    if len(choruses) >= 2:
        _, first_ch = choruses[0]
        _, final_ch = choruses[-1]
        first_e = first_ch.get("energy_level", 0.75)
        final_ch["energy_level"] = max(final_ch.get("energy_level", 0.75), first_e + 0.03, 0.78)

    return c
