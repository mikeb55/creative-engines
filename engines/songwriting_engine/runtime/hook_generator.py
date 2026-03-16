"""
Hook Generator — Stronger hook detection, placement, chorus requirement.
Uses songwriting_intelligence choose_hook_rhythm. Compression, repetition, rhythmic identity, melodic peak tests.
"""

import random
from typing import Any, Dict, List, Optional

try:
    from .songwriting_intelligence import choose_hook_rhythm
except ImportError:
    from songwriting_intelligence import choose_hook_rhythm

WEAK_HOOK_PATTERNS = frozenset({"something", "things", "stuff", "maybe", "just", "really", "very"})
MIN_HOOK_STRENGTH = 0.5
MAX_RECURRENCE_INTERVAL = 16
MIN_RECURRENCE_INTERVAL = 4


def _hook_compression_test(lyric_block: str, melody_events: List[Dict]) -> bool:
    """Reject hooks that are too vague, cluttered, or weak. Returns True if hook passes."""
    if not lyric_block:
        return False
    words = lyric_block.lower().split()
    if len(words) > 12:
        return False
    weak_count = sum(1 for w in words if w in WEAK_HOOK_PATTERNS)
    if weak_count >= 2:
        return False
    if melody_events and len(melody_events) < 4:
        return False
    return True


def _hook_repetition_test(lyric_block: str) -> bool:
    """Strong hooks often have internal repetition or title phrase."""
    if not lyric_block or len(lyric_block) < 6:
        return False
    words = lyric_block.lower().split()
    return len(words) >= 2


def _hook_rhythmic_identity_test(melody_events: List[Dict]) -> bool:
    """Melody should have clear rhythmic identity (enough events)."""
    return melody_events is not None and len(melody_events) >= 4


def _hook_melodic_peak_test(melody_events: List[Dict]) -> bool:
    """Chorus melody should have a discernible peak."""
    if not melody_events or len(melody_events) < 4:
        return False
    pitches = [e.get("pitch") for e in melody_events if e.get("pitch") is not None]
    if not pitches:
        return False
    return max(pitches) - min(pitches) >= 2


def detect_hooks(melody_events: List[Dict], lyric_block: str, title: str) -> List[str]:
    """Detect hook types. Must pass compression, repetition, rhythmic identity, melodic peak tests."""
    hooks = []
    comp_ok = _hook_compression_test(lyric_block, melody_events or [])
    rep_ok = _hook_repetition_test(lyric_block or "")
    rhythm_ok = _hook_rhythmic_identity_test(melody_events or [])
    peak_ok = _hook_melodic_peak_test(melody_events or [])

    if melody_events and len(melody_events) >= 6 and peak_ok:
        hooks.append("melodic_hook")
    if lyric_block and comp_ok and rep_ok:
        hooks.append("lyric_hook")
    if title and lyric_block and title.lower() in lyric_block.lower():
        hooks.append("title_hook")
    if rhythm_ok:
        hooks.append("rhythmic_hook")
    if not hooks:
        hooks = ["melodic_hook"]
    return hooks


def estimate_hook_strength(hooks: List[str], title: str, lyric_block: str = "") -> float:
    """Score 0-1. Title hook + melodic + lyric = stronger. Penalize weak compression."""
    score = 0.4
    if "title_hook" in hooks:
        score += 0.25
    if "melodic_hook" in hooks:
        score += 0.2
    if "lyric_hook" in hooks:
        score += 0.2
    if "rhythmic_hook" in hooks:
        score += 0.1
    if lyric_block and not _hook_compression_test(lyric_block, [{}] * 4):
        score *= 0.7
    return min(1.0, max(MIN_HOOK_STRENGTH, score))


def schedule_recurrence(sections: List[Dict], tempo: int = 90) -> List[int]:
    """Bar indices for hook recurrence (~45-90 sec). Bounded."""
    total_bars = max((s.get("bar_end", 0) for s in sections), default=32)
    beats_per_bar = 4
    sec_per_bar = 60 * beats_per_bar / max(60, tempo)
    interval_bars = max(MIN_RECURRENCE_INTERVAL, min(MAX_RECURRENCE_INTERVAL, int(45 / sec_per_bar)))
    indices = list(range(0, total_bars, interval_bars))[:6]
    return indices


def place_hooks_in_sections(
    sections: List[Dict],
    title: str,
    tempo: int = 90,
    seed: Optional[int] = None,
) -> tuple:
    """Ensure chorus has strong primary hook. Uses choose_hook_rhythm for template."""
    if seed is not None:
        random.seed(seed)

    choose_hook_rhythm(seed)
    hook_locations = []
    recurrence_bars = schedule_recurrence(sections, tempo)

    for s in sections:
        if s.get("section_role") == "chorus":
            mel = s.get("melody_line", [])
            lyric = s.get("lyric_block", "")
            hooks = detect_hooks(mel, lyric, title)
            if not hooks or not _hook_compression_test(lyric, mel):
                hooks = ["melodic_hook"]
            s["hook_flags"] = hooks

            bar_start = s.get("bar_start", 0)
            strength = estimate_hook_strength(hooks, title, lyric)
            hook_locations.append({
                "hook_type": hooks[0],
                "section_id": s.get("id", "chorus_1"),
                "measure": bar_start,
                "beat_position": 0,
                "strength": strength,
            })

    return sections, hook_locations
