"""Rhythm templates and selection for Charlie Parker phrase generation."""

from __future__ import annotations

from typing import Any, Dict, List

RHYTHM_TEMPLATES: List[Dict[str, Any]] = [
    {
        "id": "rh_001",
        "durations": [0.5] * 8,
        "starts_on": "beat",
        "triplet_count": 0,
        "rest_positions": [],
        "crossbar_bias": 0.7,
        "phrase_role": "continuation",
    },
    {
        "id": "rh_002",
        "durations": [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
        "starts_on": "and",
        "triplet_count": 0,
        "rest_positions": [],
        "crossbar_bias": 0.8,
        "phrase_role": "continuation",
    },
    {
        "id": "rh_003",
        "durations": [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.0],
        "starts_on": "beat",
        "triplet_count": 0,
        "rest_positions": [],
        "crossbar_bias": 0.3,
        "phrase_role": "cadence",
    },
    {
        "id": "rh_004",
        "durations": [1.0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
        "starts_on": "beat",
        "triplet_count": 0,
        "rest_positions": [],
        "crossbar_bias": 0.6,
        "phrase_role": "continuation",
    },
    {
        "id": "rh_005",
        "durations": [None, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
        "starts_on": "and",
        "triplet_count": 0,
        "rest_positions": [0],
        "crossbar_bias": 0.7,
        "phrase_role": "continuation",
    },
    {
        "id": "rh_006",
        "durations": [0.5, 0.5, None, 0.5, 0.5, 0.5, 0.5, 0.5],
        "starts_on": "beat",
        "triplet_count": 0,
        "rest_positions": [2],
        "crossbar_bias": 0.6,
        "phrase_role": "continuation",
    },
    {
        "id": "rh_007",
        "durations": [0.5, 0.5, 0.5, 0.5, None, 0.5, 0.5, 0.5],
        "starts_on": "beat",
        "triplet_count": 0,
        "rest_positions": [4],
        "crossbar_bias": 0.6,
        "phrase_role": "continuation",
    },
    {
        "id": "rh_008",
        "durations": [0.5, 0.5, 0.5, 0.5, 0.333, 0.333, 0.333, 0.5, 0.5],
        "starts_on": "beat",
        "triplet_count": 3,
        "rest_positions": [],
        "crossbar_bias": 0.5,
        "phrase_role": "continuation",
    },
    {
        "id": "rh_009",
        "durations": [0.333, 0.333, 0.333, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
        "starts_on": "beat",
        "triplet_count": 3,
        "rest_positions": [],
        "crossbar_bias": 0.6,
        "phrase_role": "launch",
    },
    {
        "id": "rh_010",
        "durations": [0.333] * 12,
        "starts_on": "beat",
        "triplet_count": 12,
        "rest_positions": [],
        "crossbar_bias": 0.4,
        "phrase_role": "continuation",
    },
    {
        "id": "rh_011",
        "durations": [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.0],
        "starts_on": "beat",
        "triplet_count": 0,
        "rest_positions": [],
        "crossbar_bias": 0.1,
        "phrase_role": "ending",
    },
    {
        "id": "rh_012",
        "durations": [0.5, 0.5, 1.0, 0.5, 0.5, 1.0],
        "starts_on": "beat",
        "triplet_count": 0,
        "rest_positions": [],
        "crossbar_bias": 0.2,
        "phrase_role": "ending",
    },
    {
        "id": "rh_013",
        "durations": [0.5, 0.5, 0.5, 0.5, 2.0],
        "starts_on": "beat",
        "triplet_count": 0,
        "rest_positions": [],
        "crossbar_bias": 0.0,
        "phrase_role": "ending",
    },
    {
        "id": "rh_014",
        "durations": [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
        "starts_on": "and",
        "triplet_count": 0,
        "rest_positions": [],
        "crossbar_bias": 0.9,
        "phrase_role": "anticipation",
    },
    {
        "id": "rh_015",
        "durations": [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
        "starts_on": "beat",
        "triplet_count": 0,
        "rest_positions": [],
        "crossbar_bias": 0.85,
        "phrase_role": "anticipation",
    },
    {
        "id": "rh_016",
        "durations": [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
        "starts_on": "beat",
        "triplet_count": 0,
        "rest_positions": [],
        "crossbar_bias": 0.75,
        "phrase_role": "turnaround",
    },
    {
        "id": "rh_017",
        "durations": [0.5, 0.5, 0.5, None, 0.5, 0.5, 0.5, 0.5],
        "starts_on": "beat",
        "triplet_count": 0,
        "rest_positions": [3],
        "crossbar_bias": 0.7,
        "phrase_role": "turnaround",
    },
    {
        "id": "rh_018",
        "durations": [0.5, 0.5, 0.5, None, 0.5, 0.5, None, 0.5],
        "starts_on": "beat",
        "triplet_count": 0,
        "rest_positions": [3, 6],
        "crossbar_bias": 0.5,
        "phrase_role": "continuation",
    },
    {
        "id": "rh_019",
        "durations": [1.5, 0.5, 0.5, 0.5, 0.5, 0.5],
        "starts_on": "beat",
        "triplet_count": 0,
        "rest_positions": [],
        "crossbar_bias": 0.4,
        "phrase_role": "launch",
    },
    {
        "id": "rh_020",
        "durations": [0.5, 0.5, 0.5, 0.5, 0.333, 0.333, 0.333, 1.0],
        "starts_on": "beat",
        "triplet_count": 3,
        "rest_positions": [],
        "crossbar_bias": 0.2,
        "phrase_role": "ending",
    },
]


def select_rhythm_template(
    bar_index: int,
    phrase_role: str,
    generation_seed: int,
    harmonic_context: str,
) -> Dict[str, Any]:
    pool = [t for t in RHYTHM_TEMPLATES if t["phrase_role"] == phrase_role]
    if not pool:
        pool = RHYTHM_TEMPLATES
    if harmonic_context in ("dominant", "V"):
        filtered = [t for t in pool if t.get("crossbar_bias", 0) > 0.5]
        if filtered:
            pool = filtered
    idx = (bar_index * 7 + generation_seed) % len(pool)
    return pool[idx]


def get_strong_positions(template: Dict[str, Any]) -> List[int]:
    return [
        i
        for i, d in enumerate(template["durations"])
        if d is not None and d >= 0.5 and i % 2 == 0
    ]


def get_weak_positions(template: Dict[str, Any]) -> List[int]:
    return [
        i
        for i, d in enumerate(template["durations"])
        if d is not None and d <= 0.5 and i % 2 == 1
    ]


def supports_triplets(template: Dict[str, Any]) -> bool:
    return template.get("triplet_count", 0) > 0


def supports_anticipation(template: Dict[str, Any]) -> bool:
    return template.get("crossbar_bias", 0) > 0.7


def beats_to_divisions(beats: float, divisions: int = 4) -> int:
    return max(1, round(beats * divisions))
