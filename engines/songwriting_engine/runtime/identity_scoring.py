"""
Identity Scoring — Distinctive-winner scoring module.
Evaluates melodic fingerprint, premise integrity, chorus dominance, genericness penalty.
"""

from typing import Any, Dict, List

try:
    from .melody_generator import CHORD_TONES
    from .lyric_generator import _score_anti_cliche, _score_imagery
except ImportError:
    from melody_generator import CHORD_TONES
    from lyric_generator import _score_anti_cliche, _score_imagery


def identity_score(song: Dict[str, Any]) -> float:
    """
    0-10: melodic fingerprint, hook distinctiveness, motif recognisability, title integration.
    """
    melody = song.get("melody", [])
    motifs = song.get("motifs", [])
    lyrics = song.get("lyrics", [])
    hook_locations = song.get("hook_locations", [])
    identity = song.get("song_identity", {})
    title = song.get("title", "")

    score = 5.0
    if motifs and melody:
        motif_pitches = set()
        for m in motifs:
            p = m.get("pitches", m) if isinstance(m, dict) else m
            motif_pitches.update(p)
        mel_pitches = set(e.get("pitch") for e in melody if e.get("pitch") is not None)
        overlap = len(motif_pitches & mel_pitches) / max(1, len(motif_pitches))
        score += overlap * 2.0
    chorus_hooks = [h for h in hook_locations if "chorus" in h.get("section_id", "")]
    if chorus_hooks:
        strength = max(h.get("strength", 0) for h in chorus_hooks)
        score += strength * 1.5
    if title and lyrics:
        all_text = " ".join(line for entry in lyrics for line in entry.get("lines", [])).lower()
        if title.lower() in all_text:
            score += 1.5
    key_images = identity.get("key_images", [])
    if key_images and lyrics:
        all_text = " ".join(line for entry in lyrics for line in entry.get("lines", [])).lower()
        recur = sum(1 for im in key_images if im in all_text)
        score += min(1.0, recur * 0.3)
    return round(min(10.0, score), 1)


def premise_integrity_score(song: Dict[str, Any]) -> float:
    """
    0-10: emotional premise consistency, title relevance across sections,
    image-family recurrence, bridge relationship to premise.
    """
    lyrics = song.get("lyrics", [])
    identity = song.get("song_identity", {})
    title = song.get("title", "")
    sections = song.get("sections", [])

    if not lyrics:
        return 5.0
    score = 5.0
    key_images = identity.get("key_images", [])
    all_text = " ".join(line for entry in lyrics for line in entry.get("lines", [])).lower()
    if title and title.lower() in all_text:
        score += 2.0
    if key_images:
        recur = sum(1 for im in key_images if im in all_text)
        score += min(2.0, recur * 0.5)
    if len(sections) >= 3:
        score += 0.5
    bridge = next((s for s in sections if s.get("section_role") == "bridge"), None)
    if bridge:
        bridge_lyrics = ""
        for entry in lyrics:
            if "bridge" in entry.get("section_id", ""):
                bridge_lyrics = " ".join(entry.get("lines", [])).lower()
                break
        if key_images and bridge_lyrics:
            bridge_recur = sum(1 for im in key_images if im in bridge_lyrics)
            score += min(0.5, bridge_recur * 0.2)
    return round(min(10.0, score), 1)


def chorus_dominance_score(song: Dict[str, Any]) -> float:
    """
    0-10: hook clarity, melodic lift vs verse, title landing, memorability.
    """
    sections = song.get("sections", [])
    melody = song.get("melody", [])
    lyrics = song.get("lyrics", [])
    hook_locations = song.get("hook_locations", [])
    title = song.get("title", "")

    score = 5.0
    chorus_bars = set()
    verse_bars = set()
    for s in sections:
        for b in range(s.get("bar_start", 0), s.get("bar_end", 0)):
            if s.get("section_role") == "chorus":
                chorus_bars.add(b)
            elif s.get("section_role") == "verse":
                verse_bars.add(b)
    chorus_pitches = [e.get("pitch") for e in melody if e.get("measure") in chorus_bars and e.get("pitch")]
    verse_pitches = [e.get("pitch") for e in melody if e.get("measure") in verse_bars and e.get("pitch")]
    if chorus_pitches and verse_pitches:
        if max(chorus_pitches) >= max(verse_pitches):
            score += 1.5
    chorus_hooks = [h for h in hook_locations if "chorus" in h.get("section_id", "")]
    if chorus_hooks:
        strength = max(h.get("strength", 0) for h in chorus_hooks)
        score += strength * 2.0
    if title and lyrics:
        for entry in lyrics:
            sid = entry.get("section_id", "")
            if "chorus" in sid:
                for line in entry.get("lines", []):
                    if title.lower() in line.lower():
                        score += 1.5
                        break
                break
    memorability = 1.0 if chorus_hooks and max(h.get("strength", 0) for h in chorus_hooks) >= 0.6 else 0.0
    score += memorability * 0.5
    return round(min(10.0, score), 1)


def genericness_penalty(song: Dict[str, Any], population: List[Dict[str, Any]]) -> float:
    """
    Penalty for similarity to population median. 0 = no penalty, 2 = max penalty.
    Considers: contour, structure patterns, image-family similarity, chorus contour.
    """
    if len(population) < 3:
        return 0.0
    scores = song.get("evaluation_scores", {})
    medians = {}
    for dim in ["energy_arc", "chorus_peak", "image_recurrence", "identity_score"]:
        vals = [c.get("evaluation_scores", {}).get(dim, 5) for c in population]
        medians[dim] = sum(vals) / len(vals) if vals else 5
    penalty = 0.0
    for dim, med in medians.items():
        diff = abs(scores.get(dim, 5) - med)
        if diff < 0.5:
            penalty += 0.5
    structure_pattern = _structure_signature(song)
    pop_patterns = [_structure_signature(c) for c in population]
    if structure_pattern and pop_patterns:
        same_count = sum(1 for p in pop_patterns if p == structure_pattern)
        if same_count > len(population) * 0.5:
            penalty += 0.5
    return min(2.0, penalty)


def _structure_signature(song: Dict[str, Any]) -> str:
    """Section role sequence as structure fingerprint."""
    sections = song.get("sections", [])
    return "-".join(s.get("section_role", "?") for s in sections)
