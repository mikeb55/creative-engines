"""
Premise Tools — Detect and reinforce lyric premise coherence.
Key emotional nouns, imagery family, bridge expansion.
"""

import random
from copy import deepcopy
from typing import Any, Dict, List, Optional

try:
    from .lyric_generator import generate_lyrics_for_section, align_syllables_to_melody
    from .song_identity import get_identity_for_chorus, get_identity_for_lyrics
except ImportError:
    from lyric_generator import generate_lyrics_for_section, align_syllables_to_melody
    from song_identity import get_identity_for_chorus, get_identity_for_lyrics

EMOTIONAL_NOUNS = {
    "river", "light", "dawn", "window", "street", "bridge", "train", "rain",
    "door", "glass", "platform", "road", "night", "shadow", "heart", "eyes",
    "hand", "voice", "memory", "dream", "silence", "distance",
}
IMAGE_FAMILY_WORDS = {
    "nature": ["river", "dawn", "rain", "light", "bridge", "train", "street", "night"],
    "domestic": ["window", "door", "table", "kitchen", "glass"],
    "urban": ["streetlamps", "sidewalk", "platform", "station"],
}


def detect_premise_keywords(song: Dict[str, Any]) -> Dict[str, Any]:
    """
    Identify key emotional nouns and imagery family from lyrics.
    """
    lyrics = song.get("lyrics", [])
    identity = song.get("song_identity", {})
    all_text = " ".join(line for entry in lyrics for line in entry.get("lines", [])).lower()
    words = set(all_text.split())

    found_nouns = [w for w in words if w in EMOTIONAL_NOUNS]
    key_images = identity.get("key_images", [])
    for n in found_nouns:
        if n not in key_images:
            key_images.append(n)
    key_images = key_images[:8]

    family_counts = {}
    for family, members in IMAGE_FAMILY_WORDS.items():
        family_counts[family] = sum(1 for m in members if m in words)
    main_family = max(family_counts, key=family_counts.get) if family_counts else "nature"

    return {
        "key_nouns": found_nouns[:6],
        "key_images": key_images,
        "main_image_family": main_family,
        "family_words": IMAGE_FAMILY_WORDS.get(main_family, []),
    }


def reinforce_premise_images(song: Dict[str, Any], seed: Optional[int] = None) -> Dict[str, Any]:
    """
    Reinforce imagery family across sections; ensure bridge expands premise.
    """
    c = deepcopy(song)
    if seed is not None:
        random.seed(seed)
    premise = detect_premise_keywords(c)
    key_images = premise.get("key_images", [])
    family_words = premise.get("family_words", [])
    identity = c.get("song_identity", {})
    identity["key_images"] = key_images
    identity["main_image_family"] = premise.get("main_image_family", "nature")
    c["song_identity"] = identity

    sections = c.get("sections", [])
    for s in sections:
        block = s.get("lyric_block", "")
        if not block:
            continue
        lines = block.split("\n")
        has_image = any(any(im in line.lower() for im in key_images) for line in lines)
        if not has_image and key_images and family_words:
            insert_word = random.choice(key_images[:3] + family_words[:2])
            if lines:
                lines[0] = f"{insert_word} {lines[0]}"
            s["lyric_block"] = "\n".join(lines)

    bridge = next((s for s in sections if s.get("section_role") == "bridge"), None)
    if bridge and key_images:
        block = bridge.get("lyric_block", "")
        bridge_has = sum(1 for im in key_images if im in block.lower())
        if bridge_has < 1:
            insert = random.choice(key_images[:3])
            lines = block.split("\n")
            if lines:
                lines[0] = f"{insert} in the air, {lines[0]}"
            bridge["lyric_block"] = "\n".join(lines)

    c["lyrics"] = [{"section_id": sec["id"], "lines": sec.get("lyric_block", "").split("\n")} for sec in c["sections"]]
    return c
