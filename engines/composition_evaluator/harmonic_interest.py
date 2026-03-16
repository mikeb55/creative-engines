"""
Harmonic Interest — Score variety, nonfunctional motion, avoid trivial diatonic loops.
"""

from typing import Any, Dict, List


def _get_harmony(compiled: Any) -> List[Dict]:
    harmony = []
    for sec in getattr(compiled, "sections", []):
        harmony.extend(getattr(sec, "harmony", []))
    if not harmony:
        h = getattr(compiled, "harmony", None)
        if h:
            harmony = getattr(h, "chords", [])
    return harmony


def _symbol_to_root(sym: str) -> str:
    s = str(sym).strip()
    for i, c in enumerate(s):
        if c in "mMb#":
            return s[:i+1] if i > 0 else s[:1]
        if not c.isalpha() and c not in "#b":
            return s[:i] if i > 0 else s[:1]
    return s[:2] if len(s) >= 2 else s


def _chord_complexity(sym: str) -> float:
    s = str(sym).lower()
    score = 0.5
    if "7" in s or "9" in s:
        score += 0.5
    if "sus" in s or "alt" in s:
        score += 0.5
    if "dim" in s or "aug" in s:
        score += 0.3
    if "m" in s and "maj" not in s:
        score += 0.2
    return min(1.0, score)


def score_harmonic_interest(compiled_composition: Any) -> float:
    """Score 0–10: harmonic variety, nonfunctional motion, avoid trivial loops."""
    harmony = _get_harmony(compiled_composition)
    if not harmony:
        return 5.0
    symbols = [h.get("symbol", str(h)) for h in harmony if isinstance(h, dict)]
    if not symbols:
        symbols = [str(h) for h in harmony]
    roots = [_symbol_to_root(s) for s in symbols]
    unique_roots = len(set(roots))
    variety = min(1.0, unique_roots / 4.0) * 3.0
    complexity = sum(_chord_complexity(s) for s in symbols) / max(len(symbols), 1) * 3.0
    repeat_penalty = 0.0
    if len(symbols) >= 4:
        for i in range(len(symbols) - 3):
            if symbols[i] == symbols[i+1] == symbols[i+2] == symbols[i+3]:
                repeat_penalty += 1.0
    raw = variety + complexity - repeat_penalty
    return max(0.0, min(10.0, 5.0 + (raw - 5.0)))
