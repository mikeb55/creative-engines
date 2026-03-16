"""
Melodic Identity Tools — Fingerprint and reinforcement.
Increase motif interval recurrence, distinctive contour, avoid stepwise monotony.
"""

import random
from copy import deepcopy
from typing import Any, Dict, List, Optional, Tuple

try:
    from .melody_generator import (
        generate_melody_for_section,
        generate_harmonic_outline,
        _clamp_pitch,
        _vocal_range,
    )
    from .lyric_generator import align_syllables_to_melody
    from .song_identity import get_identity_for_chorus, get_identity_for_lyrics
except ImportError:
    from melody_generator import (
        generate_melody_for_section,
        generate_harmonic_outline,
        _clamp_pitch,
        _vocal_range,
    )
    from lyric_generator import align_syllables_to_melody
    from song_identity import get_identity_for_chorus, get_identity_for_lyrics


def calculate_melodic_fingerprint(melody: List[Dict]) -> Dict[str, Any]:
    """
    Extract fingerprint: interval pattern, contour shape, motif cells.
    """
    pitches = [e.get("pitch") for e in melody if e.get("pitch") is not None]
    if len(pitches) < 3:
        return {"intervals": [], "contour": "flat", "motif_cells": []}

    intervals = [pitches[i + 1] - pitches[i] for i in range(len(pitches) - 1)]
    rises = sum(1 for i in intervals if i > 0)
    falls = sum(1 for i in intervals if i < 0)
    if rises > falls + 2:
        contour = "rise"
    elif falls > rises + 2:
        contour = "fall"
    elif max(pitches) - min(pitches) >= 5:
        contour = "arch"
    else:
        contour = "narrow"

    stepwise_count = sum(1 for i in intervals if abs(i) <= 1)
    monotony = stepwise_count / max(1, len(intervals))

    motif_cells = []
    for w in range(3, min(6, len(pitches) - 1)):
        for start in range(len(pitches) - w):
            cell = tuple(pitches[start : start + w])
            motif_cells.append(cell)

    return {
        "intervals": intervals[:12],
        "contour": contour,
        "monotony": monotony,
        "motif_cells": motif_cells[:5],
        "peak": max(pitches) if pitches else 0,
        "trough": min(pitches) if pitches else 0,
    }


def reinforce_melodic_identity(song: Dict[str, Any], seed: Optional[int] = None) -> Dict[str, Any]:
    """
    Strengthen motif recurrence, distinctive contour, reduce stepwise monotony.
    Create one identifiable motif cell reused across sections.
    """
    c = deepcopy(song)
    if seed is not None:
        random.seed(seed)
    sections = c.get("sections", [])
    motifs_raw = c.get("motifs", [])
    motifs = [m.get("pitches", m) if isinstance(m, dict) else m for m in motifs_raw]
    if not motifs:
        motifs = [[60, 62, 64]]
    primary = list(motifs[0])
    vocal_target = c.get("vocal_target", "male_tenor")
    key_center = c.get("key_center", "C")
    identity = c.get("song_identity", {})

    fp = calculate_melodic_fingerprint(c.get("melody", []))
    target_contour = fp.get("contour", "arch")

    for idx, s in enumerate(sections):
        role = s.get("section_role", "verse")
        bars = s["bar_end"] - s["bar_start"]
        harm = s.get("harmonic_outline") or generate_harmonic_outline(s, key_center, bars, seed or 0)
        s["harmonic_outline"] = harm
        lyric_id = get_identity_for_chorus(identity) if role == "chorus" else get_identity_for_lyrics(identity)
        mel = generate_melody_for_section(s, motifs, vocal_target, bars, harm, (seed or 0) + idx * 100, song_identity=lyric_id)
        mel = _inject_motif_cell(mel, primary, vocal_target, (seed or 0) + idx)
        mel = _reduce_monotony(mel, vocal_target, (seed or 0) + idx)
        s["melody_line"] = align_syllables_to_melody(s.get("lyric_block", ""), mel)

    c["melody"] = [e for sec in c["sections"] for e in sec.get("melody_line", [])]
    return c


def _inject_motif_cell(
    melody: List[Dict],
    motif: List[int],
    vocal_target: str,
    seed: int,
) -> List[Dict]:
    """Inject motif at phrase starts for recognisability."""
    if not motif or not melody:
        return melody
    events = list(melody)
    pitch_events = [i for i, e in enumerate(events) if e.get("pitch") is not None]
    if len(pitch_events) < len(motif):
        return melody
    random.seed(seed)
    inject_at = pitch_events[0]
    for j, pi in enumerate(motif[: min(len(motif), len(pitch_events) - inject_at)]):
        if inject_at + j < len(events) and events[inject_at + j].get("pitch") is not None:
            events[inject_at + j]["pitch"] = _clamp_pitch(pi, vocal_target)
    return events


def _reduce_monotony(melody: List[Dict], vocal_target: str, seed: int) -> List[Dict]:
    """Replace stepwise runs with small leaps for contour distinctiveness."""
    if len(melody) < 4:
        return melody
    random.seed(seed)
    events = list(melody)
    for i in range(1, len(events) - 1):
        if events[i].get("pitch") is None:
            continue
        prev = events[i - 1].get("pitch")
        nxt = events[i + 1].get("pitch")
        if prev is None or nxt is None:
            continue
        curr = events[i]["pitch"]
        if abs(curr - prev) <= 1 and abs(nxt - curr) <= 1:
            if random.random() < 0.4:
                leap = random.choice([3, 4, -3, -4])
                events[i]["pitch"] = _clamp_pitch(curr + leap, vocal_target)
    return events
