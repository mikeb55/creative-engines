"""
Section Role Contracts — Define what each section is FOR.
"""

from typing import Any, Dict, List

try:
    from .section_generator import ENERGY_BY_ROLE
except ImportError:
    from section_generator import ENERGY_BY_ROLE


def score_verse_role(song: Dict[str, Any]) -> float:
    """
    Verse = world-building / premise support. Lower energy than chorus.
    Penalise: restating chorus, same function as chorus.
    """
    sections = song.get("sections", [])
    verses = [s for s in sections if s.get("section_role") == "verse"]
    choruses = [s for s in sections if s.get("section_role") == "chorus"]
    if not verses:
        return 5.0
    score = 5.0
    verse_energies = [s.get("energy_level", 0.5) for s in verses]
    chorus_energies = [s.get("energy_level", 0.7) for s in choruses]
    if verse_energies and chorus_energies:
        if sum(verse_energies) / len(verse_energies) < sum(chorus_energies) / len(chorus_energies):
            score += 1.5
    lyrics = song.get("lyrics", [])
    verse_text = " ".join(
        line for e in lyrics for line in e.get("lines", [])
        if "verse" in e.get("section_id", "")
    ).lower()
    if len(verse_text) > 20:
        score += 0.5
    return round(min(10.0, score), 1)


def score_prechorus_role(song: Dict[str, Any]) -> float:
    """
    Pre-chorus = tension / directional lift. Points toward chorus inevitability.
    """
    sections = song.get("sections", [])
    prechorus = [s for s in sections if s.get("section_role") == "prechorus"]
    if not prechorus:
        return 7.0
    score = 5.0
    pc_energies = [s.get("energy_level", 0.5) for s in prechorus]
    verses = [s for s in sections if s.get("section_role") == "verse"]
    verse_energies = [s.get("energy_level", 0.4) for s in verses]
    if pc_energies and verse_energies:
        if sum(pc_energies) / len(pc_energies) > sum(verse_energies) / len(verse_energies):
            score += 2.0
    return round(min(10.0, score), 1)


def score_bridge_role(song: Dict[str, Any]) -> float:
    """
    Bridge = reframing contrast. Must remain premise-linked.
    Penalise: derailment, imported feel.
    """
    sections = song.get("sections", [])
    bridge = next((s for s in sections if s.get("section_role") == "bridge"), None)
    if not bridge:
        return 7.0
    score = 5.0
    lyrics = song.get("lyrics", [])
    identity = song.get("song_identity", {})
    key_images = identity.get("key_images", [])
    bridge_text = ""
    for e in lyrics:
        if "bridge" in e.get("section_id", ""):
            bridge_text = " ".join(e.get("lines", [])).lower()
            break
    if key_images:
        recur = sum(1 for im in key_images if im in bridge_text)
        score += min(2.0, recur * 0.8)
    bridge_energy = bridge.get("energy_level", 0.5)
    choruses = [s for s in sections if s.get("section_role") == "chorus"]
    chorus_energy = sum(s.get("energy_level", 0.7) for s in choruses) / len(choruses) if choruses else 0.7
    if abs(bridge_energy - chorus_energy) >= 0.1:
        score += 0.5
    return round(min(10.0, score), 1)


def score_outro_role(song: Dict[str, Any]) -> float:
    """
    Outro = afterglow / reinforcement. Reinforces identity, not generic fade.
    """
    sections = song.get("sections", [])
    outro = next((s for s in sections if s.get("section_role") == "outro"), None)
    if not outro:
        return 7.0
    score = 5.0
    if outro.get("lyric_block"):
        score += 1.0
    return round(min(10.0, score), 1)


def score_section_role_clarity(song: Dict[str, Any]) -> float:
    """
    Overall: sections have distinct functions. Penalise duplicate function.
    """
    sections = song.get("sections", [])
    if len(sections) < 2:
        return 5.0
    score = 5.0
    roles = [s.get("section_role") for s in sections if s.get("section_role")]
    unique = len(set(roles))
    score += min(2.0, unique * 0.5)
    energies = [s.get("energy_level", 0.5) for s in sections]
    if len(set(round(e, 1) for e in energies)) >= 2:
        score += 0.5
    return round(min(10.0, score), 1)
