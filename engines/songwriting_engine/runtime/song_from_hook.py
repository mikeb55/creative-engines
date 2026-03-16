"""
Song From Hook — Build full songs from hook DNA.
All sections derive from hook_dna contract; no independent generation.
"""

import random
from copy import deepcopy
from typing import Any, Dict, List, Optional

try:
    from .section_generator import generate_sections, ENERGY_BY_ROLE
    from .melody_generator import (
        generate_melody_for_section,
        generate_harmonic_outline,
        _clamp_pitch,
        _vocal_range,
    )
    from .lyric_generator import generate_lyrics_for_section, align_syllables_to_melody
    from .hook_generator import place_hooks_in_sections
    from .song_identity import create_identity, update_identity_after_section, get_identity_for_lyrics, get_identity_for_chorus
    from .hook_dna_contract import extract_hook_dna
except ImportError:
    from section_generator import generate_sections, ENERGY_BY_ROLE
    from melody_generator import (
        generate_melody_for_section,
        generate_harmonic_outline,
        _clamp_pitch,
        _vocal_range,
    )
    from lyric_generator import generate_lyrics_for_section, align_syllables_to_melody
    from hook_generator import place_hooks_in_sections
    from song_identity import create_identity, update_identity_after_section, get_identity_for_lyrics, get_identity_for_chorus
    from hook_dna_contract import extract_hook_dna


def build_song_from_hook(
    hook_candidate: Dict[str, Any],
    title: str = "Untitled Song",
    lyric_theme: str = "love",
    structure_type: str = "short",
    vocal_target: str = "male_tenor",
    seed: Optional[int] = None,
) -> Dict[str, Any]:
    """Build full song with all sections derived from hook DNA."""
    if seed is not None:
        random.seed(seed)
    seed_int = seed or 0
    hook_dna = extract_hook_dna(hook_candidate)

    sections = generate_sections(structure_type=structure_type, seed=seed_int)
    motif_cell = hook_dna.get("motif_cell", [60, 62, 64])
    motifs = [motif_cell]
    if len(motif_cell) >= 2:
        seq = [_clamp_pitch(p - 2, vocal_target) for p in motif_cell]
        motifs.append(seq)
    motifs.append(motif_cell)

    identity = create_identity(title, lyric_theme, sections, motifs, seed_int)
    key_images = hook_dna.get("image_family", hook_dna.get("premise_keywords", []))
    if key_images:
        identity["key_images"] = key_images[:6]
        identity["main_image_family"] = key_images[:2]

    key_center = "C"
    all_melody = []
    all_harmony = []

    for s in sections:
        bars = s["bar_end"] - s["bar_start"]
        harm = generate_harmonic_outline(s, key_center, bars, seed_int + hash(s["id"]) % 1000)
        s["harmonic_outline"] = harm
        all_harmony.extend(harm)

        role = s.get("section_role", "verse")
        if role == "chorus":
            mel = _chorus_from_hook(s, hook_candidate, vocal_target, seed_int)
            lyrics = generate_lyrics_for_section(
                s, mel, title, lyric_theme, "balanced",
                seed_int + 1, song_identity=get_identity_for_chorus(identity),
            )
            title_line = hook_dna.get("title_phrase", title)
            if title_line and title_line.lower() not in lyrics.lower():
                lines = lyrics.split("\n")
                lines.insert(0, title_line)
                lyrics = "\n".join(lines[:4])
        elif role == "verse":
            mel, lyrics = _derive_verse_from_dna(s, hook_dna, motifs, vocal_target, title, lyric_theme, identity, seed_int)
        elif role == "prechorus":
            mel, lyrics = _derive_prechorus_from_dna(s, hook_dna, motifs, vocal_target, title, lyric_theme, identity, seed_int)
        elif role == "bridge":
            mel, lyrics = _derive_bridge_from_dna(s, hook_dna, motifs, vocal_target, title, lyric_theme, identity, seed_int)
        elif role == "outro":
            mel, lyrics = _derive_outro_from_dna(s, hook_dna, motifs, vocal_target, title, lyric_theme, identity, seed_int)
        else:
            mel = generate_melody_for_section(s, motifs, vocal_target, bars, harm, seed_int + hash(s["id"]) % 1000, song_identity=get_identity_for_lyrics(identity))
            lyrics = generate_lyrics_for_section(s, mel, title, lyric_theme, "balanced", seed_int + hash(s["id"]) % 1000, song_identity=get_identity_for_lyrics(identity))

        s["lyric_block"] = lyrics
        identity = update_identity_after_section(identity, s, lyrics)
        aligned = align_syllables_to_melody(lyrics, mel)
        s["melody_line"] = aligned
        all_melody.extend(aligned)

    sections, hook_locations = place_hooks_in_sections(sections, title, 90, seed_int)

    return {
        "metadata": {"engine": "songwriting_engine", "version": "1.0.0", "hook_first": True},
        "title": title,
        "lyric_theme": lyric_theme,
        "vocal_target": vocal_target,
        "key_center": key_center,
        "sections": sections,
        "lyrics": [{"section_id": s["id"], "lines": s["lyric_block"].split("\n")} for s in sections],
        "melody": all_melody,
        "harmony": all_harmony,
        "hook_locations": hook_locations,
        "motifs": [{"pitches": m} for m in motifs],
        "song_identity": identity,
        "hook_dna": hook_dna,
        "hook_dna_raw": hook_candidate,
        "evaluation_scores": {},
        "warnings": {},
    }


def _chorus_from_hook(section: Dict[str, Any], hook: Dict[str, Any], vocal_target: str, seed: int) -> List[Dict[str, Any]]:
    """Expand hook melody idea into full chorus melody."""
    idea = hook.get("chorus_melody_idea", [60, 62, 64, 65, 67])
    bar_start = section.get("bar_start", 0)
    bars = section["bar_end"] - section["bar_start"]
    beats_per_bar = 4
    total_beats = bars * beats_per_bar
    events = []
    beat = 0.0
    event_id = 0
    while beat < total_beats:
        idx = int(beat / 2) % len(idea)
        pitch = idea[idx] if idx < len(idea) else idea[-1]
        pitch = _clamp_pitch(pitch + 2, vocal_target)
        measure = bar_start + int(beat // beats_per_bar)
        beat_pos = beat % beats_per_bar
        events.append({"id": f"mel_{event_id}", "pitch": pitch, "beat_position": beat_pos, "duration": 1.0, "measure": measure, "section_id": section.get("id", "")})
        event_id += 1
        beat += 1.5
    return events


def _derive_verse_from_dna(s, hook_dna, motifs, vocal_target, title, lyric_theme, identity, seed_int):
    """Verse: inherits motif rhythm/interval, lower energy, supports premise, introduces image-world."""
    s["energy_level"] = round(random.uniform(0.35, 0.5), 2)
    bars = s["bar_end"] - s["bar_start"]
    motif = hook_dna.get("motif_cell", [60, 62, 64])
    verse_motif = [_clamp_pitch(p - 2, vocal_target) for p in motif]
    mel = generate_melody_for_section(s, [verse_motif, motif], vocal_target, bars, s.get("harmonic_outline", []), seed_int + hash(s["id"]) % 1000, song_identity=get_identity_for_lyrics(identity))
    lyric_id = {"key_images": hook_dna.get("image_family", [])}
    lyrics = generate_lyrics_for_section(s, mel, title, lyric_theme, "balanced", seed_int + hash(s["id"]) % 1000, song_identity=lyric_id)
    if hook_dna.get("image_family"):
        first = lyrics.split("\n")[0]
        if not any(im in first.lower() for im in hook_dna["image_family"]):
            lyrics = f"{hook_dna['image_family'][0]} in the air\n" + lyrics
    return mel, lyrics


def _derive_prechorus_from_dna(s, hook_dna, motifs, vocal_target, title, lyric_theme, identity, seed_int):
    """Pre-chorus: tension/lift, points toward chorus inevitability."""
    s["energy_level"] = round(random.uniform(0.55, 0.75), 2)
    bars = s["bar_end"] - s["bar_start"]
    motif = hook_dna.get("motif_cell", [60, 62, 64])
    mel = generate_melody_for_section(s, [motif], vocal_target, bars, s.get("harmonic_outline", []), seed_int + hash(s["id"]) % 1000, song_identity=get_identity_for_lyrics(identity))
    lyrics = generate_lyrics_for_section(s, mel, title, lyric_theme, "direct", seed_int + hash(s["id"]) % 1000, song_identity=get_identity_for_lyrics(identity))
    return mel, lyrics


def _derive_bridge_from_dna(s, hook_dna, motifs, vocal_target, title, lyric_theme, identity, seed_int):
    """Bridge: contrast by register/angle, premise-linked, not imported."""
    s["energy_level"] = round(random.uniform(0.4, 0.6), 2)
    bars = s["bar_end"] - s["bar_start"]
    motif = hook_dna.get("motif_cell", [60, 62, 64])
    contrast_motif = [_clamp_pitch(p - 4, vocal_target) for p in motif]
    mel = generate_melody_for_section(s, [contrast_motif], vocal_target, bars, s.get("harmonic_outline", []), seed_int + hash(s["id"]) % 1000 + 2, song_identity=get_identity_for_lyrics(identity))
    lyric_id = {"key_images": hook_dna.get("image_family", [])}
    lyrics = generate_lyrics_for_section(s, mel, title, lyric_theme, "oblique", seed_int + hash(s["id"]) % 1000 + 3, song_identity=lyric_id)
    if hook_dna.get("image_family"):
        lyrics = f"But {hook_dna['image_family'][0]}\n" + lyrics.split("\n", 1)[-1] if "\n" in lyrics else lyrics
    return mel, lyrics


def _derive_outro_from_dna(s, hook_dna, motifs, vocal_target, title, lyric_theme, identity, seed_int):
    """Outro: reinforces identity, signature phrase focus."""
    s["energy_level"] = round(random.uniform(0.4, 0.55), 2)
    bars = s["bar_end"] - s["bar_start"]
    motif = hook_dna.get("motif_cell", [60, 62, 64])
    mel = generate_melody_for_section(s, [motif], vocal_target, bars, s.get("harmonic_outline", []), seed_int + hash(s["id"]) % 1000, song_identity=get_identity_for_lyrics(identity))
    sig = hook_dna.get("title_phrase", title) or title
    lyrics = f"{sig}\n{sig}"
    return mel, lyrics


def derive_verse_from_hook_dna(song: Dict[str, Any], hook_dna: Dict[str, Any]) -> Dict[str, Any]:
    """Re-derive verse from hook DNA (for repair)."""
    return _apply_derivation(song, hook_dna, "verse", _derive_verse_from_dna)


def derive_prechorus_from_hook_dna(song: Dict[str, Any], hook_dna: Dict[str, Any]) -> Dict[str, Any]:
    """Re-derive prechorus from hook DNA."""
    return _apply_derivation(song, hook_dna, "prechorus", _derive_prechorus_from_dna)


def derive_bridge_from_hook_dna(song: Dict[str, Any], hook_dna: Dict[str, Any]) -> Dict[str, Any]:
    """Re-derive bridge from hook DNA."""
    return _apply_derivation(song, hook_dna, "bridge", _derive_bridge_from_dna)


def derive_outro_from_hook_dna(song: Dict[str, Any], hook_dna: Dict[str, Any]) -> Dict[str, Any]:
    """Re-derive outro from hook DNA."""
    return _apply_derivation(song, hook_dna, "outro", _derive_outro_from_dna)


def _apply_derivation(song, hook_dna, role, derive_fn):
    c = deepcopy(song)
    sections = c.get("sections", [])
    motifs = [[m.get("pitches", m) if isinstance(m, dict) else m for m in c.get("motifs", [])]]
    if not motifs[0]:
        motifs = [hook_dna.get("motif_cell", [60, 62, 64])]
    identity = c.get("song_identity", {})
    for s in sections:
        if s.get("section_role") == role:
            mel, lyrics = derive_fn(s, hook_dna, motifs, c.get("vocal_target", "male_tenor"), c.get("title", ""), c.get("lyric_theme", "love"), identity, hash(str(hook_dna)) % 10000)
            s["melody_line"] = align_syllables_to_melody(lyrics, mel)
            s["lyric_block"] = lyrics
            break
    c["melody"] = [e for sec in sections for e in sec.get("melody_line", [])]
    c["lyrics"] = [{"section_id": sec["id"], "lines": sec.get("lyric_block", "").split("\n")} for sec in sections]
    return c


def derive_verse_from_hook(song: Dict[str, Any], hook_candidate: Dict[str, Any]) -> Dict[str, Any]:
    """Legacy: derive verse from hook candidate."""
    hook_dna = extract_hook_dna(hook_candidate)
    return derive_verse_from_hook_dna(song, hook_dna)


def derive_bridge_from_hook(song: Dict[str, Any], hook_candidate: Dict[str, Any]) -> Dict[str, Any]:
    """Legacy: derive bridge from hook candidate."""
    hook_dna = extract_hook_dna(hook_candidate)
    return derive_bridge_from_hook_dna(song, hook_dna)
