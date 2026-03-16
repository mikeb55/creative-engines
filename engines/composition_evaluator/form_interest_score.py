"""
Form Interest Score — Phrase asymmetry, section contrast, avoid symmetrical normalization.
"""

from typing import Any, Dict, List


def score_form_interest(compiled_composition: Any) -> float:
    """Score 0–10: phrase asymmetry, section contrast, avoid symmetrical normalization."""
    sections = getattr(compiled_composition, "sections", [])
    if not sections:
        return 5.0
    phrase_lengths = []
    for sec in sections:
        pl = getattr(sec, "phrase_lengths", [])
        if pl:
            phrase_lengths.extend(pl)
        else:
            bar_start = getattr(sec, "bar_start", 0)
            bar_end = getattr(sec, "bar_end", 0)
            if bar_end > bar_start:
                phrase_lengths.append(bar_end - bar_start)
    if not phrase_lengths:
        phrase_lengths = [getattr(sec, "bar_end", 8) - getattr(sec, "bar_start", 0) for sec in sections]
    if not phrase_lengths:
        return 5.0
    mn, mx = min(phrase_lengths), max(phrase_lengths)
    spread = (mx - mn) / max(mx, 1)
    asymmetry = spread * 4.0
    odd_count = sum(1 for p in phrase_lengths if p % 2 == 1)
    odd_bonus = (odd_count / max(len(phrase_lengths), 1)) * 2.0
    roles = [getattr(sec, "role", "") for sec in sections]
    unique_roles = len(set(roles))
    contrast = min(2.0, unique_roles * 0.5)
    sym_penalty = 0.0
    if len(phrase_lengths) >= 2 and len(set(phrase_lengths)) == 1:
        sym_penalty = 2.0
    raw = 5.0 + asymmetry + odd_bonus + contrast - sym_penalty
    return max(0.0, min(10.0, raw))
