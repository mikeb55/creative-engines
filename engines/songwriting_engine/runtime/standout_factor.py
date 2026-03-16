"""
Standout Factor — Editorial 9+ criteria: unforgettable feature, distinctive identity, quotable hook.
"""

from typing import Any, Dict, List

try:
    from .lyric_generator import _score_imagery, _score_anti_cliche
except ImportError:
    from lyric_generator import _score_imagery, _score_anti_cliche


def score_quotable_hook(song: Dict[str, Any]) -> float:
    """
    Chorus/title line feels repeatable and memorable.
    Short, clear, title-integrated, low cliche.
    """
    sections = song.get("sections", [])
    chorus = next((s for s in sections if s.get("section_role") == "chorus"), None)
    if not chorus:
        return 5.0
    block = chorus.get("lyric_block", "")
    lines = [l.strip() for l in block.split("\n") if l.strip()]
    if not lines:
        return 5.0
    title = song.get("title", "")
    score = 5.0
    best_line = min(lines, key=len) if lines else ""
    if len(best_line) <= 40:
        score += 1.0
    if title and title.lower() in block.lower():
        score += 1.5
    anti_cliche = sum(_score_anti_cliche(l) for l in lines) / max(1, len(lines))
    if anti_cliche > 0.6:
        score += 0.5
    return round(min(10.0, score), 1)


def score_signature_moment(song: Dict[str, Any]) -> float:
    """
    One specific melodic or lyrical event that marks the song as individual.
    Strong chorus peak, distinctive image, or title phrase placement.
    """
    sections = song.get("sections", [])
    melody = song.get("melody", [])
    lyrics = song.get("lyrics", [])
    score = 5.0
    chorus_bars = set()
    for s in sections:
        if s.get("section_role") == "chorus":
            for b in range(s.get("bar_start", 0), s.get("bar_end", 0)):
                chorus_bars.add(b)
    if chorus_bars and melody:
        chorus_pitches = [e.get("pitch") for e in melody if e.get("measure") in chorus_bars and e.get("pitch")]
        if chorus_pitches and max(chorus_pitches) >= 70:
            score += 1.0
    if lyrics:
        lines_flat = [l for e in lyrics for l in e.get("lines", []) if l.strip()]
        if lines_flat:
            imagery = sum(_score_imagery(l) for l in lines_flat) / len(lines_flat)
            if imagery > 0.5:
                score += 0.5
    return round(min(10.0, score), 1)


def score_afterglow(song: Dict[str, Any]) -> float:
    """
    Lingering memorability after ending. Song leaves a residue, not just competence.
    Strong outro, signature phrase retention, title echo.
    """
    sections = song.get("sections", [])
    score = 5.0
    outro = next((s for s in sections if s.get("section_role") == "outro"), None)
    if outro and outro.get("lyric_block"):
        block = outro.get("lyric_block", "").lower()
        title = (song.get("title", "") or "").lower()
        if title and title in block:
            score += 1.5
        if len(block) > 10 and len(block) < 80:
            score += 0.5
    choruses = [s for s in sections if s.get("section_role") == "chorus"]
    if choruses:
        last_ch = choruses[-1]
        if last_ch.get("energy_level", 0.5) >= 0.75:
            score += 0.5
    return round(min(10.0, score), 1)


def score_standout_factor(song: Dict[str, Any]) -> float:
    """
    One unforgettable feature. Distinctive chorus identity. Strong title moment.
    Emotional or imagistic lock. Not-replaceable quality.
    """
    scores = song.get("evaluation_scores", {})
    if not scores:
        return 5.0
    quotable = score_quotable_hook(song)
    signature = score_signature_moment(song)
    afterglow = score_afterglow(song)
    identity = scores.get("identity_score", 5)
    memorability = scores.get("memorability", 5)
    title_int = scores.get("title_integration", 5)
    hook_dna = scores.get("hook_dna_coherence", 5)
    parts = [quotable, signature, afterglow, identity, memorability, title_int, hook_dna]
    return round(sum(parts) / len(parts), 1)
