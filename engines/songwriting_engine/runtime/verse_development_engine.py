"""
Verse Development Engine — Differentiate verse 2 from verse 1.
"""

import random
from copy import deepcopy
from typing import Any, Dict, List, Optional

try:
    from .lyric_generator import generate_lyrics_for_section, align_syllables_to_melody
    from .song_identity import get_identity_for_lyrics
    from .melody_generator import generate_melody_for_section, _clamp_pitch
except ImportError:
    from lyric_generator import generate_lyrics_for_section, align_syllables_to_melody
    from song_identity import get_identity_for_lyrics
    from melody_generator import generate_melody_for_section, _clamp_pitch


def differentiate_verse_2(song: Dict[str, Any], hook_dna: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Verse 2 must not restate verse 1. Deepen premise, sharpen image family, increase specificity.
    """
    c = deepcopy(song)
    sections = c.get("sections", [])
    verses = [(i, s) for i, s in enumerate(sections) if s.get("section_role") == "verse"]

    if len(verses) < 2:
        return c

    _, v1 = verses[0]
    _, v2 = verses[1]
    v1_text = (v1.get("lyric_block", "") or "").lower()
    v2_text = (v2.get("lyric_block", "") or "").lower()

    if len(v1_text) < 10:
        return c

    identity = c.get("song_identity", {})
    hook_dna = hook_dna or c.get("hook_dna", {})
    key_images = hook_dna.get("image_family", []) if hook_dna else identity.get("key_images", [])

    v2["energy_level"] = min(0.55, max(v2.get("energy_level", 0.45), v1.get("energy_level", 0.45) + 0.05))

    if key_images and not any(im in v2_text for im in key_images):
        mel = v2.get("melody_line", [])
        lyric_id = {"key_images": key_images[:4]}
        new_lyrics = generate_lyrics_for_section(
            v2, mel, c.get("title", ""), c.get("lyric_theme", "love") or "love",
            "balanced", hash(str(v2.get("id", ""))) % 10000 + 1, song_identity=lyric_id
        )
        first_img = key_images[0] if key_images else ""
        if first_img and first_img.lower() not in new_lyrics.lower():
            lines = new_lyrics.split("\n")
            if lines:
                lines[0] = f"{first_img} again—{lines[0]}"
                new_lyrics = "\n".join(lines)
        v2["lyric_block"] = new_lyrics
        v2["melody_line"] = align_syllables_to_melody(new_lyrics, mel)

    c["lyrics"] = [{"section_id": sec["id"], "lines": sec.get("lyric_block", "").split("\n")} for sec in sections]
    c["melody"] = [e for sec in sections for e in sec.get("melody_line", [])]
    return c


def score_verse_development(song: Dict[str, Any]) -> float:
    """
    Score 0-10: verse 2 differs from verse 1 in function, energy, or content.
    """
    sections = song.get("sections", [])
    verses = [s for s in sections if s.get("section_role") == "verse"]

    if len(verses) < 2:
        return 7.0

    v1, v2 = verses[0], verses[1]
    score = 5.0

    e1 = v1.get("energy_level", 0.5)
    e2 = v2.get("energy_level", 0.5)
    if e2 > e1 or abs(e2 - e1) >= 0.03:
        score += 1.5

    t1 = (v1.get("lyric_block", "") or "").split()
    t2 = (v2.get("lyric_block", "") or "").split()
    overlap = len(set(t1) & set(t2)) / max(1, min(len(t1), len(t2)))
    if overlap < 0.6:
        score += 1.0

    return round(min(10.0, score), 1)
