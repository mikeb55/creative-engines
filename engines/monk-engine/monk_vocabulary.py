"""
Thelonious Monk vocabulary: n-gram patterns and rhythm weights.

MONK_VOCABULARY holds interval patterns per harmonic context (TBD expansion).
"""
from __future__ import annotations

from typing import Dict, List, Optional, Tuple

MONK_TOP_PATTERNS: List[Tuple[List[int], int]] = [
    ([0, 0, 0, 0], 68),
    ([1, 1, 1, 0], 19),
    ([1, 5, 4, 3], 18),
    ([5, 4, 3, -3], 18),
    ([4, 3, -3, -4], 18),
    ([1, 5, -5, 0], 15),
    ([3, -3, -4, 10], 12),
    ([-3, -4, 10, -5], 12),
    ([-4, 10, -5, -11], 12),
    ([2, 1, 1, 0], 12),
]

MONK_RHYTHM_WEIGHTS = {
    "eighth": 0.654,
    "quarter": 0.252,
    "half": 0.054,
    "16th": 0.025,
    "whole": 0.014,
}

MONK_VOCABULARY: Dict[str, List[dict]] = {}

PARSER_VOCABULARY_SOURCE = "Monk engine — MONK_TOP_PATTERNS / MONK_RHYTHM_WEIGHTS (corpus-derived placeholders)"


def get_pattern(
    chord_function: str,
    seed: int,
    tags: Optional[List[str]] = None,
) -> List[int]:
    pool = MONK_VOCABULARY.get(chord_function)
    if not pool:
        pool = MONK_VOCABULARY.get("dominant", [])
    if not pool:
        return [0]
    if tags:
        filtered = [p for p in pool if any(t in p.get("tags", []) for t in tags)]
        if filtered:
            pool = filtered
    entry = pool[seed % len(pool)]
    return list(entry["intervals_from_root"])


if __name__ == "__main__":
    total = sum(len(v) for v in MONK_VOCABULARY.values())
    print(f"Total vocabulary entries: {total}")
    for k, v in MONK_VOCABULARY.items():
        print(f"  {k}: {len(v)} patterns")
    print(f"MONK_TOP_PATTERNS: {len(MONK_TOP_PATTERNS)} rows")
