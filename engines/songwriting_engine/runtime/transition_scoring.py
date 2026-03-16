"""
Transition Scoring — Quality of section-to-section flow.
"""

from typing import Any, Dict, List


def score_verse_to_prechorus_transition(song: Dict[str, Any]) -> float:
    """Reward: escalation, inevitability toward chorus."""
    sections = song.get("sections", [])
    idx = next((i for i, s in enumerate(sections) if s.get("section_role") == "prechorus"), None)
    if idx is None or idx == 0:
        return 7.0
    prev = sections[idx - 1]
    curr = sections[idx]
    if prev.get("section_role") != "verse":
        return 6.0
    prev_e = prev.get("energy_level", 0.5)
    curr_e = curr.get("energy_level", 0.6)
    if curr_e > prev_e:
        return 8.0
    return 6.0


def score_prechorus_to_chorus_transition(song: Dict[str, Any]) -> float:
    """Reward: inevitability into chorus, clear arrival."""
    sections = song.get("sections", [])
    idx = next((i for i, s in enumerate(sections) if s.get("section_role") == "chorus"), None)
    if idx is None or idx == 0:
        return 7.0
    prev = sections[idx - 1]
    curr = sections[idx]
    prev_e = prev.get("energy_level", 0.5)
    curr_e = curr.get("energy_level", 0.7)
    if curr_e >= prev_e:
        return 8.0
    return 6.0


def score_chorus_to_verse_transition(song: Dict[str, Any]) -> float:
    """Reward: contrast without rupture, natural return."""
    sections = song.get("sections", [])
    for i in range(1, len(sections)):
        if sections[i].get("section_role") == "verse" and sections[i - 1].get("section_role") == "chorus":
            prev_e = sections[i - 1].get("energy_level", 0.7)
            curr_e = sections[i].get("energy_level", 0.5)
            if curr_e < prev_e:
                return 8.0
            return 6.0
    return 7.0


def score_bridge_to_final_chorus_transition(song: Dict[str, Any]) -> float:
    """Reward: return after bridge feeling earned."""
    sections = song.get("sections", [])
    bridge_idx = next((i for i, s in enumerate(sections) if s.get("section_role") == "bridge"), None)
    if bridge_idx is None:
        return 7.0
    after_bridge = sections[bridge_idx + 1:] if bridge_idx + 1 < len(sections) else []
    chorus_after = next((s for s in after_bridge if s.get("section_role") == "chorus"), None)
    if chorus_after:
        return 8.0
    return 6.0


def score_transition_flow(song: Dict[str, Any]) -> float:
    """
    Aggregate transition quality. Reward escalation, contrast, earned return.
    Penalise abrupt shifts, flat joins, bridge that does not pay off.
    """
    sections = song.get("sections", [])
    if len(sections) < 2:
        return 5.0
    scores = []
    scores.append(score_verse_to_prechorus_transition(song))
    scores.append(score_prechorus_to_chorus_transition(song))
    scores.append(score_chorus_to_verse_transition(song))
    scores.append(score_bridge_to_final_chorus_transition(song))
    return round(sum(scores) / len(scores), 1)
