"""
Final Chorus Tools — Intensify final chorus payoff.
"""

from copy import deepcopy
from typing import Any, Dict, List, Optional

try:
    from .melody_generator import _clamp_pitch, _vocal_range
    from .lyric_generator import align_syllables_to_melody
except ImportError:
    from melody_generator import _clamp_pitch, _vocal_range
    from lyric_generator import align_syllables_to_melody


def intensify_final_chorus(song: Dict[str, Any], hook_dna: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Stronger title placement, slightly heightened contour peak, tighter hook repetition.
    """
    c = deepcopy(song)
    sections = c.get("sections", [])
    choruses = [(i, s) for i, s in enumerate(sections) if s.get("section_role") == "chorus"]

    if len(choruses) < 2:
        return c

    idx, final_ch = choruses[-1]
    title = c.get("title", "")
    title_phrase = (hook_dna or {}).get("title_phrase", title) if hook_dna else title

    final_ch["energy_level"] = max(final_ch.get("energy_level", 0.75), 0.78)

    lyrics = final_ch.get("lyric_block", "")
    if title_phrase and title_phrase.lower() not in lyrics.lower():
        lines = lyrics.split("\n")
        if lines:
            lines[0] = f"{title_phrase}, {lines[0]}"
            final_ch["lyric_block"] = "\n".join(lines[:5])
            mel = final_ch.get("melody_line", [])
            if mel:
                final_ch["melody_line"] = align_syllables_to_melody(final_ch["lyric_block"], mel)

    mel = final_ch.get("melody_line", [])
    if mel:
        vocal_target = c.get("vocal_target", "male_tenor")
        lo, hi = _vocal_range(vocal_target)
        pitches = [e.get("pitch") for e in mel if e.get("pitch")]
        if pitches and max(pitches) < hi - 3:
            for e in mel:
                if e.get("pitch"):
                    e["pitch"] = _clamp_pitch(e["pitch"] + 1, vocal_target)

    c["melody"] = [e for sec in sections for e in sec.get("melody_line", [])]
    c["lyrics"] = [{"section_id": sec["id"], "lines": sec.get("lyric_block", "").split("\n")} for sec in sections]
    return c


def score_final_chorus_payoff(song: Dict[str, Any]) -> float:
    """
    Score 0-10: final chorus exceeds earlier chorus functionally.
    """
    sections = song.get("sections", [])
    choruses = [s for s in sections if s.get("section_role") == "chorus"]

    if len(choruses) < 2:
        return 7.0

    first_e = choruses[0].get("energy_level", 0.75)
    final_e = choruses[-1].get("energy_level", 0.75)
    score = 5.0
    if final_e >= first_e - 0.02:
        score += 2.0
    if final_e >= first_e + 0.02:
        score += 1.0

    title = song.get("title", "")
    final_lyrics = choruses[-1].get("lyric_block", "").lower()
    if title and title.lower() in final_lyrics:
        score += 1.0

    return round(min(10.0, score), 1)
