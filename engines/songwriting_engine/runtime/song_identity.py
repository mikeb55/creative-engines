"""
Song Identity Memory — Lightweight coherence layer.
Tracks: main hook phrase, main motif rhythm, key image, emotional premise, section energy.
"""

from typing import Any, Dict, List, Optional


def create_identity(
    title: str,
    lyric_theme: str,
    sections: List[Dict],
    motifs: List[List[int]],
    seed: int,
) -> Dict[str, Any]:
    """Create initial song identity before full generation."""
    return {
        "title": title,
        "lyric_theme": lyric_theme,
        "main_hook_phrase": title or "untitled",
        "main_motif_rhythm": _motif_rhythm_fingerprint(motifs) if motifs else [],
        "core_interval_pattern": _interval_pattern(motifs) if motifs else [],
        "key_images": [],
        "main_image_family": [],
        "emotional_premise": lyric_theme,
        "section_energy_profile": [s.get("energy_level", 0.5) for s in sections],
        "subtext_mode": "balanced",
    }


def _motif_rhythm_fingerprint(motifs: List[List[int]]) -> List[int]:
    """Extract relative rhythm (inter-onset intervals) from primary motif."""
    if not motifs:
        return []
    m = motifs[0]
    return [1] * len(m)


def _interval_pattern(motifs: List[List[int]]) -> List[int]:
    """Extract interval pattern from primary motif (semitones between consecutive notes)."""
    if not motifs or len(motifs[0]) < 2:
        return []
    m = motifs[0]
    return [m[i + 1] - m[i] for i in range(len(m) - 1)]


def update_identity_after_section(
    identity: Dict[str, Any],
    section: Dict[str, Any],
    lyric_block: str,
) -> Dict[str, Any]:
    """Update identity with key images from section lyrics."""
    images = identity.get("key_images", [])
    words = lyric_block.lower().split()
    key_nouns = {"river", "light", "dawn", "window", "street", "bridge", "train", "rain", "door", "glass", "platform", "road", "night", "shadow"}
    for w in words:
        if w in key_nouns and w not in images:
            images.append(w)
    identity["key_images"] = images[:6]
    if not identity.get("main_image_family") and images:
        identity["main_image_family"] = images[:3]
    return identity


def score_identity_coherence(candidate: Dict[str, Any]) -> float:
    """Score 0-10: how well candidate adheres to its song_identity."""
    identity = candidate.get("song_identity", {})
    if not identity:
        return 5.0
    lyrics = candidate.get("lyrics", [])
    all_text = " ".join(line for entry in lyrics for line in entry.get("lines", [])).lower()
    title = identity.get("main_hook_phrase", "")
    key_images = identity.get("key_images", [])
    score = 5.0
    if title and title.lower() in all_text:
        score += 2.0
    if key_images:
        recur = sum(1 for im in key_images if im in all_text)
        score += min(2.0, recur * 0.5)
    return round(min(10.0, score), 1)


def get_identity_for_lyrics(identity: Dict[str, Any]) -> Dict[str, Any]:
    """Return subset of identity useful for lyric generation."""
    return {
        "title": identity.get("title", ""),
        "key_images": identity.get("key_images", []),
        "main_image_family": identity.get("main_image_family", []),
        "emotional_premise": identity.get("emotional_premise", "love"),
        "main_hook_phrase": identity.get("main_hook_phrase", ""),
    }


def get_identity_for_chorus(identity: Dict[str, Any]) -> Dict[str, Any]:
    """Return subset for chorus generation (stronger peak, title integration)."""
    return {
        **get_identity_for_lyrics(identity),
        "chorus_peak": True,
        "title_integration": True,
    }


def get_identity_for_repair(identity: Dict[str, Any]) -> Dict[str, Any]:
    """Return full identity for repair logic."""
    return identity
