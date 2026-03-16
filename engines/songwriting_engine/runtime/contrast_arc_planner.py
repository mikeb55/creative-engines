"""
Contrast Arc Planner — Enforce section-to-section contrast and dramatic arc.
"""

from copy import deepcopy
from typing import Any, Dict, List, Optional

try:
    from .section_generator import ENERGY_BY_ROLE
except ImportError:
    from section_generator import ENERGY_BY_ROLE


DEFAULT_ARC = {
    "verse": {"energy": 0.40, "contour_pressure": 0.4, "phrase_density": 0.6, "lyric_density": 0.7, "harmonic_tension": 0.3, "image_density": 0.8, "title_exposure": 0.2},
    "prechorus": {"energy": 0.65, "contour_pressure": 0.75, "phrase_density": 0.8, "lyric_density": 0.75, "harmonic_tension": 0.6, "image_density": 0.5, "title_exposure": 0.4},
    "chorus": {"energy": 0.82, "contour_pressure": 0.9, "phrase_density": 0.7, "lyric_density": 0.65, "harmonic_tension": 0.5, "image_density": 0.4, "title_exposure": 0.95},
    "bridge": {"energy": 0.50, "contour_pressure": 0.55, "phrase_density": 0.65, "lyric_density": 0.6, "harmonic_tension": 0.7, "image_density": 0.7, "title_exposure": 0.2},
    "outro": {"energy": 0.45, "contour_pressure": 0.35, "phrase_density": 0.4, "lyric_density": 0.35, "harmonic_tension": 0.3, "image_density": 0.3, "title_exposure": 0.6},
}


def plan_section_contrast_arc(song: Dict[str, Any], hook_dna: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Build contrast plan per section. Verse 2 intensified vs verse 1; final chorus stronger than first.
    """
    sections = song.get("sections", [])
    plan = {"sections": [], "arc_type": "default"}

    verse_count = 0
    chorus_count = 0

    for s in sections:
        role = s.get("section_role", "verse")
        base = dict(DEFAULT_ARC.get(role, DEFAULT_ARC["verse"]))

        if role == "verse":
            verse_count += 1
            if verse_count == 2:
                base["energy"] = min(0.55, base["energy"] + 0.08)
                base["contour_pressure"] = min(0.6, base["contour_pressure"] + 0.1)
                base["image_density"] = min(0.9, base["image_density"] + 0.1)
                base["lyric_density"] = 0.75

        elif role == "chorus":
            chorus_count += 1
            if chorus_count >= 2:
                base["energy"] = min(0.95, base["energy"] + 0.06)
                base["contour_pressure"] = 0.95
                base["title_exposure"] = 1.0
                base["phrase_density"] = 0.75

        plan["sections"].append({"section_id": s.get("id", ""), "role": role, **base})

    return plan


def score_contrast_arc(song: Dict[str, Any]) -> float:
    """
    Score 0-10: how well sections differ in energy, function, and arc.
    Penalise verse duplication, flat joins, weak chorus differentiation.
    """
    sections = song.get("sections", [])
    if len(sections) < 2:
        return 5.0

    score = 5.0
    energies = [s.get("energy_level", 0.5) for s in sections]
    roles = [s.get("section_role") for s in sections]

    if len(set(round(e, 1) for e in energies)) >= 2:
        score += 1.0

    verses = [s for s in sections if s.get("section_role") == "verse"]
    if len(verses) >= 2:
        e1 = verses[0].get("energy_level", 0.5)
        e2 = verses[1].get("energy_level", 0.5)
        if e2 > e1 or abs(e2 - e1) >= 0.05:
            score += 0.5

    choruses = [s for s in sections if s.get("section_role") == "chorus"]
    if len(choruses) >= 2:
        c1 = choruses[0].get("energy_level", 0.7)
        c2 = choruses[-1].get("energy_level", 0.7)
        if c2 >= c1 - 0.02:
            score += 0.5

    prechorus = next((s for s in sections if s.get("section_role") == "prechorus"), None)
    chorus_after_pc = next((s for i, s in enumerate(sections) if s.get("section_role") == "chorus" and i > 0 and sections[i - 1].get("section_role") == "prechorus"), None)
    if prechorus and chorus_after_pc:
        pc_e = prechorus.get("energy_level", 0.6)
        ch_e = chorus_after_pc.get("energy_level", 0.8)
        if ch_e > pc_e:
            score += 1.0

    bridge = next((s for s in sections if s.get("section_role") == "bridge"), None)
    if bridge:
        bridge_idx = next(i for i, s in enumerate(sections) if s.get("section_role") == "bridge")
        chorus_after = next((s for s in sections[bridge_idx:] if s.get("section_role") == "chorus"), None)
        if chorus_after and chorus_after.get("energy_level", 0.7) >= 0.72:
            score += 0.5

    return round(min(10.0, score), 1)


def apply_contrast_arc(song: Dict[str, Any], contrast_plan: Dict[str, Any]) -> Dict[str, Any]:
    """
    Apply contrast plan: set energy_level and store plan metadata per section.
    """
    c = deepcopy(song)
    plan_sections = contrast_plan.get("sections", [])
    by_id = {p["section_id"]: p for p in plan_sections}

    for s in c.get("sections", []):
        sid = s.get("id", "")
        if sid in by_id:
            p = by_id[sid]
            s["energy_level"] = round(p.get("energy", s.get("energy_level", 0.5)), 2)
            s["_contrast_plan"] = {k: v for k, v in p.items() if k not in ("section_id", "role")}

    return c
