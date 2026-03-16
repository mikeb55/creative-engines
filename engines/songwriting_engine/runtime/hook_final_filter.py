"""
Hook Final Filter — Reject songs with weak chorus identity before final selection.
"""

from typing import Any, Dict, List

HOOK_MEMORABILITY_THRESHOLD = 4.5
TITLE_LANDING_THRESHOLD = 5.0


def score_hook_memorability(song: Dict[str, Any]) -> float:
    """
    Score 0-10: chorus hook is memorable (strength, motif presence, peak).
    """
    scores = song.get("evaluation_scores", {})
    hook_strength = scores.get("hook_strength", 5)
    memorability = scores.get("memorability", 5)
    chorus_peak = scores.get("chorus_peak", 5)
    melodic_identity = scores.get("melodic_identity", 5)
    return round((hook_strength + memorability + chorus_peak + melodic_identity) / 4, 1)


def score_hook_repeatability(song: Dict[str, Any]) -> float:
    """
    Score 0-10: hook phrase is repeatable (short, clear, rhythmic).
    """
    sections = song.get("sections", [])
    chorus = next((s for s in sections if s.get("section_role") == "chorus"), None)
    if not chorus:
        return 5.0
    block = chorus.get("lyric_block", "")
    lines = [l.strip() for l in block.split("\n") if l.strip()]
    if not lines:
        return 5.0
    avg_len = sum(len(l) for l in lines) / len(lines)
    if avg_len <= 35:
        return 7.5
    if avg_len <= 50:
        return 6.5
    return 5.0


def score_hook_title_landing(song: Dict[str, Any]) -> float:
    """
    Score 0-10: title lands clearly in chorus.
    """
    return song.get("evaluation_scores", {}).get("title_integration", 5.0)


def hook_final_filter(candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Reject songs where hook_memorability < threshold OR title landing weak.
    Returns filtered list. If all rejected, returns original list.
    """
    if not candidates:
        return []

    passed = []
    for c in candidates:
        mem = score_hook_memorability(c)
        title = score_hook_title_landing(c)
        if mem >= HOOK_MEMORABILITY_THRESHOLD and title >= TITLE_LANDING_THRESHOLD:
            passed.append(c)

    return passed if passed else candidates
