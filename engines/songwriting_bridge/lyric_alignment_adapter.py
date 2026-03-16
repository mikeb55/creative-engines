"""
Lyric Alignment Adapter — Create placeholders and align lyrics to melody.
"""

from typing import Any, Dict, List

from .lead_sheet_types import LyricAlignment, VocalMelody


def create_lyric_placeholders(
    compiled_composition: Any,
    mode: str = "phrase_based",
) -> List[Dict[str, Any]]:
    """
    Create lyric placeholders. phrase_based: one per phrase; section-aware: verse/chorus/bridge.
    """
    placeholders = []
    labels = []
    for i, sec in enumerate(getattr(compiled_composition, "sections", [])):
        role = getattr(sec, "role", "verse")
        bar_start = getattr(sec, "bar_start", i * 8)
        bar_end = getattr(sec, "bar_end", bar_start + 8)
        if role == "primary":
            label = "verse"
        elif role == "contrast":
            label = "chorus"
        elif role == "return":
            label = "verse"
        else:
            label = role or "verse"
        labels.append(label)
        for ev in getattr(sec, "melody_events", []):
            m = ev.get("measure", 0)
            beat = ev.get("beat_position", 0)
            placeholders.append({
                "measure": m,
                "beat": beat,
                "syllable": "_",
                "phrase_id": f"{label}_{i}",
                "section_label": label,
            })
    return placeholders


def align_lyrics_to_melody(
    vocal_melody: VocalMelody,
    lyric_placeholders: List[Dict[str, Any]],
) -> LyricAlignment:
    """
    Align lyric placeholders to vocal melody events.
    """
    section_labels = list(dict.fromkeys(p.get("section_label", "verse") for p in lyric_placeholders))
    return LyricAlignment(
        placeholders=lyric_placeholders,
        mode="phrase_based",
        section_labels=section_labels,
    )
