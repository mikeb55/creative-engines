"""
Chorus Generator — Stronger chorus generation.
Enforces melodic lift, title integration, motif recognisability, hook emphasis.
"""

import random
from copy import deepcopy
from typing import Any, Dict, List, Optional

try:
    from .melody_generator import (
        generate_melody_for_section,
        generate_harmonic_outline,
        _clamp_pitch,
        _vocal_range,
    )
    from .lyric_generator import generate_lyrics_for_section, align_syllables_to_melody
    from .hook_generator import place_hooks_in_sections
    from .song_identity import get_identity_for_chorus
except ImportError:
    from melody_generator import (
        generate_melody_for_section,
        generate_harmonic_outline,
        _clamp_pitch,
        _vocal_range,
    )
    from lyric_generator import generate_lyrics_for_section, align_syllables_to_melody
    from hook_generator import place_hooks_in_sections
    from song_identity import get_identity_for_chorus


def generate_stronger_chorus(song: Dict[str, Any], seed: Optional[int] = None) -> Dict[str, Any]:
    """
    Regenerate chorus with:
    - melodic lift above verse
    - title or title variant in chorus
    - increased motif recognisability
    - stronger melodic contour peak
    - shorter weak lyric lines
    - repeatable hook fragment emphasis
    """
    c = deepcopy(song)
    if seed is not None:
        random.seed(seed)
    sections = c.get("sections", [])
    motifs_raw = c.get("motifs", [])
    motifs = [m.get("pitches", m) if isinstance(m, dict) else m for m in motifs_raw]
    if not motifs:
        motifs = [[60, 62, 64]]
    vocal_target = c.get("vocal_target", "male_tenor")
    key_center = c.get("key_center", "C")
    identity = c.get("song_identity", {})
    title = c.get("title", "")

    verse_max = 0
    verse_bars = set()
    for s in sections:
        if s.get("section_role") == "verse":
            for b in range(s.get("bar_start", 0), s.get("bar_end", 0)):
                verse_bars.add(b)
    melody = c.get("melody", [])
    for e in melody:
        if e.get("measure") in verse_bars and e.get("pitch"):
            verse_max = max(verse_max, e["pitch"])

    lo, hi = _vocal_range(vocal_target)
    chorus_lift_min = min(verse_max + 2, hi - 2)

    for s in sections:
        if s.get("section_role") == "chorus":
            bars = s["bar_end"] - s["bar_start"]
            harm = s.get("harmonic_outline") or generate_harmonic_outline(s, key_center, bars, seed or 0)
            s["harmonic_outline"] = harm
            chorus_id = get_identity_for_chorus(identity)
            mel = generate_melody_for_section(s, motifs, vocal_target, bars, harm, (seed or 0) + 1, song_identity=chorus_id)

            mel = _ensure_melodic_lift(mel, chorus_lift_min, vocal_target, seed or 0)
            mel = _reinforce_motif_in_chorus(mel, motifs, vocal_target, seed or 0)

            lyrics = generate_lyrics_for_section(s, mel, title, c.get("lyric_theme", "love") or "love", "balanced", seed or 0, song_identity=chorus_id)
            lyrics = _shorten_weak_lines(lyrics)
            lyrics = _ensure_title_in_chorus(lyrics, title)
            s["melody_line"] = align_syllables_to_melody(lyrics, mel)
            s["lyric_block"] = lyrics
            break

    c["melody"] = [e for sec in c["sections"] for e in sec.get("melody_line", [])]
    c["sections"], c["hook_locations"] = place_hooks_in_sections(c["sections"], title, 90, seed or 0)
    c["lyrics"] = [{"section_id": sec["id"], "lines": sec.get("lyric_block", "").split("\n")} for sec in c["sections"]]
    return c


def _ensure_melodic_lift(
    melody: List[Dict],
    min_peak: int,
    vocal_target: str,
    seed: int,
) -> List[Dict]:
    """Raise chorus peak above verse if needed."""
    pitches = [e.get("pitch") for e in melody if e.get("pitch") is not None]
    if not pitches or max(pitches) >= min_peak:
        return melody
    random.seed(seed)
    peak_idx = pitches.index(max(pitches))
    event_idx = 0
    for i, e in enumerate(melody):
        if e.get("pitch") is not None:
            if event_idx == peak_idx:
                lift = min_peak - e["pitch"]
                for j in range(i, len(melody)):
                    if melody[j].get("pitch") is not None:
                        melody[j]["pitch"] = _clamp_pitch(melody[j]["pitch"] + lift, vocal_target)
                break
            event_idx += 1
    return melody


def _reinforce_motif_in_chorus(
    melody: List[Dict],
    motifs: List[List[int]],
    vocal_target: str,
    seed: int,
) -> List[Dict]:
    """Insert motif pitches at phrase starts for recognisability."""
    if not motifs or not melody:
        return melody
    primary = motifs[0]
    if len(primary) < 2:
        return melody
    random.seed(seed)
    events = list(melody)
    for i in range(min(3, len(primary), len(events))):
        if events[i].get("pitch") is not None:
            events[i] = {**events[i], "pitch": _clamp_pitch(primary[i % len(primary)], vocal_target)}
    return events


def _shorten_weak_lines(lyrics: str) -> str:
    """Compress lines over 45 chars."""
    lines = lyrics.split("\n")
    out = []
    for line in lines:
        if len(line) > 45:
            words = line.split()
            mid = len(words) // 2
            out.append(" ".join(words[:mid]))
            out.append(" ".join(words[mid:]))
        else:
            out.append(line)
    return "\n".join(out)


def _ensure_title_in_chorus(lyrics: str, title: str) -> str:
    """Ensure title appears in chorus; prepend to first line if missing."""
    if not title:
        return lyrics
    if title.lower() in lyrics.lower():
        return lyrics
    lines = lyrics.split("\n")
    if not lines:
        return lyrics
    first = lines[0]
    if len(first) < 30:
        lines[0] = f"{title}, {first}"
    else:
        lines.insert(0, title)
    return "\n".join(lines)


def refine_existing_hook_derived_chorus(song: Dict[str, Any], hook_dna: Dict[str, Any], seed: Optional[int] = None) -> Dict[str, Any]:
    """
    Guarded refinement for hook-derived chorus. Only fix title landing, motif recognisability.
    Do NOT regenerate chorus unless chorus_dominance is low or title/motif are broken.
    """
    c = deepcopy(song)
    if seed is not None:
        random.seed(seed)
    sections = c.get("sections", [])
    title = c.get("title", "")
    scores = c.get("evaluation_scores", {})

    for s in sections:
        if s.get("section_role") != "chorus":
            continue
        lyrics = s.get("lyric_block", "")
        mel = s.get("melody_line", [])

        title_phrase = hook_dna.get("title_phrase", title) or title
        if title_phrase and title_phrase.lower() not in lyrics.lower():
            lyrics = _ensure_title_in_chorus(lyrics, title_phrase)
            s["lyric_block"] = lyrics
            s["melody_line"] = align_syllables_to_melody(lyrics, mel)

        motifs_raw = c.get("motifs", [])
        motifs = [m.get("pitches", m) if isinstance(m, dict) else m for m in motifs_raw]
        if motifs and mel:
            mel = _reinforce_motif_in_chorus(mel, motifs, c.get("vocal_target", "male_tenor"), seed or 0)
            s["melody_line"] = align_syllables_to_melody(s.get("lyric_block", ""), mel)
        break

    c["melody"] = [e for sec in c["sections"] for e in sec.get("melody_line", [])]
    c["lyrics"] = [{"section_id": sec["id"], "lines": sec.get("lyric_block", "").split("\n")} for sec in c["sections"]]
    c["sections"], c["hook_locations"] = place_hooks_in_sections(c["sections"], title, 90, seed or 0)
    return c
