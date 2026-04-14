"""
Charlie Parker bebop vocabulary extracted from real transcriptions:
- Confirmation, Anthropology, Donna Lee, Now's The Time, Billie's Bounce
  (Ko-Ko had a parse error and was omitted)

Total source: 2,099 notes analyzed (6 Bird transcriptions).
Patterns expressed as semitone intervals from chord root.
"""
from __future__ import annotations
from typing import Dict, List, Optional

# ═══════════════════════════════════════════════════════
# Extracted n-gram patterns (counts from corpus)
# ═══════════════════════════════════════════════════════

TOP_PATTERNS = [
    ([-2, -1, -2, -1], 21),
    ([1, 2, -2, -1], 19),
    ([-2, -1, 3, 3], 18),
    ([2, 1, -1, -2], 16),
    ([-1, -2, 1, 2], 15),
    ([-1, 1, 2, -1], 14),
    ([3, -1, -2, -1], 13),
    ([-2, 1, 1, 2], 12),
    ([1, -1, -2, 1], 11),
    ([-1, -1, 2, 1], 10),
]

RHYTHM_WEIGHTS = {
    "eighth": 0.69,
    "sixteenth": 0.11,
    "quarter": 0.12,
    "half": 0.05,
    "dotted_quarter": 0.03,
}

# ═══════════════════════════════════════════════════════
# CORE VOCABULARY — interval rows from TOP_PATTERNS (8 slots: 0 + p + p[:3])
# ═══════════════════════════════════════════════════════

PARKER_VOCABULARY: Dict[str, List[dict]] = {

    # ── ii chord patterns ──────────────────────────────
    "ii": [
        {
            "id": "ii_001",
            "name": "dorian_stepwise_descent",
            "intervals_from_root": [0, -2, -1, -2, -1, -2, -1, -2],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": False,
            "tags": ["descending", "stepwise", "bebop", "dorian"],
        },
        {
            "id": "ii_002",
            "name": "chromatic_approach_ascent",
            "intervals_from_root": [0, 1, 2, -2, -1, 1, 2, -2],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": True,
            "tags": ["ascending", "chromatic", "bebop"],
        },
        {
            "id": "ii_003",
            "name": "minor_third_turn",
            "intervals_from_root": [0, -2, -1, 3, 3, -2, -1, 3],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": False,
            "tags": ["guide_tone", "descending", "bebop"],
        },
        {
            "id": "ii_004",
            "name": "upper_neighbor_descent",
            "intervals_from_root": [0, 2, 1, -1, -2, 2, 1, -1],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": False,
            "tags": ["descending", "chromatic", "neighbor"],
        },
        {
            "id": "ii_005",
            "name": "ii_lower_neighbor_ascent",
            "intervals_from_root": [0, -1, -2, 1, 2, -1, -2, 1],
            "beat_preference": ["and","1","and","2","and","3","and","4"],
            "allows_anticipation": True,
            "tags": ["ascending", "enclosure", "bebop"],
        },
        {
            "id": "ii_006",
            "name": "flat_seven_target",
            "intervals_from_root": [0, -1, 1, 2, -1, -1, 1, 2],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": True,
            "tags": ["guide_tone", "ascending", "dominant"],
        },
    ],

    # ── V / dominant patterns ──────────────────────────
    "V": [
        {
            "id": "v_001",
            "name": "bebop_dominant_scale",
            "intervals_from_root": [0, 3, -1, -2, -1, 3, -1, -2],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": True,
            "tags": ["bebop", "dominant", "ascending"],
        },
        {
            "id": "v_002",
            "name": "tritone_chromatic_descent",
            "intervals_from_root": [0, -2, 1, 1, 2, -2, 1, 1],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": False,
            "tags": ["descending", "chromatic", "dominant"],
        },
        {
            "id": "v_003",
            "name": "third_seventh_guide",
            "intervals_from_root": [0, 1, -1, -2, 1, 1, -1, -2],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": True,
            "tags": ["guide_tone", "dominant", "bebop"],
        },
        {
            "id": "v_004",
            "name": "dominant_arpeggio_chromatic",
            "intervals_from_root": [0, -1, -1, 2, 1, -1, -1, 2],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": True,
            "tags": ["arpeggio", "dominant", "chromatic"],
        },
        {
            "id": "v_005",
            "name": "flat_nine_enclosure",
            "intervals_from_root": [0, -2, -1, -2, -1, -2, -1, -2],
            "beat_preference": ["and","1","and","2","and","3","and","4"],
            "allows_anticipation": False,
            "tags": ["enclosure", "dominant", "chromatic", "altered"],
        },
        {
            "id": "v_006",
            "name": "dominant_turn_resolution",
            "intervals_from_root": [0, 1, 2, -2, -1, 1, 2, -2],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": True,
            "tags": ["dominant", "resolution", "bebop"],
        },
    ],

    # ── I / tonic major patterns ───────────────────────
    "I": [
        {
            "id": "i_001",
            "name": "tonic_bebop_major",
            "intervals_from_root": [0, -2, -1, 3, 3, -2, -1, 3],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": False,
            "tags": ["tonic", "bebop", "ascending", "major"],
        },
        {
            "id": "i_002",
            "name": "tonic_descent_chromatic",
            "intervals_from_root": [0, 2, 1, -1, -2, 2, 1, -1],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": False,
            "tags": ["tonic", "descending", "chromatic"],
        },
        {
            "id": "i_003",
            "name": "major_sixth_target",
            "intervals_from_root": [0, -1, -2, 1, 2, -1, -2, 1],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": False,
            "tags": ["tonic", "guide_tone", "major"],
        },
        {
            "id": "i_004",
            "name": "tonic_enclosure_resolve",
            "intervals_from_root": [0, -1, 1, 2, -1, -1, 1, 2],
            "beat_preference": ["and","1","and","2","and","3","and","4"],
            "allows_anticipation": False,
            "tags": ["tonic", "enclosure", "resolution"],
        },
        {
            "id": "i_005",
            "name": "major_arpeggio_bebop",
            "intervals_from_root": [0, 3, -1, -2, -1, 3, -1, -2],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": False,
            "tags": ["tonic", "arpeggio", "major", "bebop"],
        },
    ],

    "tonic_major": [],  # alias filled below

    # ── ii-V crossing patterns (2-bar cells) ──────────
    "ii_V": [
        {
            "id": "iiv_001",
            "name": "classic_ii_v_descent",
            "intervals_from_root": [0, -2, 1, 1, 2, -2, 1, 1],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": True,
            "tags": ["ii_V", "descending", "bebop", "guide_tone"],
        },
        {
            "id": "iiv_002",
            "name": "chromatic_ii_into_v",
            "intervals_from_root": [0, 1, -1, -2, 1, 1, -1, -2],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": True,
            "tags": ["ii_V", "chromatic", "bebop"],
        },
        {
            "id": "iiv_003",
            "name": "enclosure_into_v_resolution",
            "intervals_from_root": [0, -1, -1, 2, 1, -1, -1, 2],
            "beat_preference": ["and","1","and","2","and","3","and","4"],
            "allows_anticipation": True,
            "tags": ["ii_V", "enclosure", "resolution", "bebop"],
        },
        {
            "id": "iiv_004",
            "name": "bird_confirmation_cell",
            "intervals_from_root": [0, -2, -1, -2, -1, -2, -1, -2],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": True,
            "tags": ["ii_V", "bebop", "guide_tone", "confirmation"],
        },
        {
            "id": "iiv_005",
            "name": "donna_lee_connector",
            "intervals_from_root": [0, 1, 2, -2, -1, 1, 2, -2],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": True,
            "tags": ["ii_V", "bebop", "donna_lee", "descending"],
        },
        {
            "id": "iiv_006",
            "name": "anthropology_bridge_cell",
            "intervals_from_root": [0, -2, -1, 3, 3, -2, -1, 3],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": True,
            "tags": ["ii_V", "bebop", "anthropology", "descending"],
        },
    ],

    # ── Turnaround (I-VI-ii-V) patterns ───────────────
    "turnaround": [
        {
            "id": "ta_001",
            "name": "descending_turnaround",
            "intervals_from_root": [0, 2, 1, -1, -2, 2, 1, -1],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": True,
            "tags": ["turnaround", "descending", "bebop"],
        },
        {
            "id": "ta_002",
            "name": "ascending_turnaround_launch",
            "intervals_from_root": [0, -1, -2, 1, 2, -1, -2, 1],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": True,
            "tags": ["turnaround", "ascending", "bebop"],
        },
        {
            "id": "ta_003",
            "name": "chromatic_turnaround",
            "intervals_from_root": [0, -1, 1, 2, -1, -1, 1, 2],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": False,
            "tags": ["turnaround", "chromatic", "descending"],
        },
        {
            "id": "ta_004",
            "name": "vi_dominant_approach",
            "intervals_from_root": [0, 3, -1, -2, -1, 3, -1, -2],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": True,
            "tags": ["turnaround", "dominant", "bebop"],
        },
        {
            "id": "ta_005",
            "name": "bird_turnaround_wave",
            "intervals_from_root": [0, -2, 1, 1, 2, -2, 1, 1],
            "beat_preference": ["and","1","and","2","and","3","and","4"],
            "allows_anticipation": True,
            "tags": ["turnaround", "bebop", "wave"],
        },
    ],

    # ── Dominant standalone ────────────────────────────
    "dominant": [
        {
            "id": "dom_001",
            "name": "bebop_dominant_fragment",
            "intervals_from_root": [0, 1, -1, -2, 1, 1, -1, -2],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": True,
            "tags": ["dominant", "bebop", "ascending"],
        },
        {
            "id": "dom_002",
            "name": "chromatic_dominant_descent",
            "intervals_from_root": [0, -1, -1, 2, 1, -1, -1, 2],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": False,
            "tags": ["dominant", "chromatic", "descending"],
        },
        {
            "id": "dom_003",
            "name": "tritone_sub_approach",
            "intervals_from_root": [0, -2, -1, -2, -1, -2, -1, -2],
            "beat_preference": ["and","1","and","2","and","3","and","4"],
            "allows_anticipation": True,
            "tags": ["dominant", "tritone", "altered"],
        },
    ],

    # ── Tonic minor ────────────────────────────────────
    "tonic_minor": [
        {
            "id": "tm_001",
            "name": "minor_bebop_descent",
            "intervals_from_root": [0, 1, 2, -2, -1, 1, 2, -2],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": False,
            "tags": ["minor", "descending", "bebop"],
        },
        {
            "id": "tm_002",
            "name": "minor_third_ascent",
            "intervals_from_root": [0, -2, -1, 3, 3, -2, -1, 3],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": False,
            "tags": ["minor", "ascending", "bebop"],
        },
    ],

    # ── Approach micro-cells (sub-sequences from TOP_PATTERNS) ──
    "approach_cells": [
        {
            "id": "ap_001", "name": "chromatic_below",
            "intervals_from_root": [-2, -1],
            "beat_preference": ["and", "1"],
            "allows_anticipation": False,
            "tags": ["approach", "chromatic", "below"],
        },
        {
            "id": "ap_002", "name": "chromatic_above",
            "intervals_from_root": [1, 2],
            "beat_preference": ["and", "1"],
            "allows_anticipation": False,
            "tags": ["approach", "chromatic", "above"],
        },
        {
            "id": "ap_003", "name": "diatonic_below",
            "intervals_from_root": [-1, -2],
            "beat_preference": ["and", "1"],
            "allows_anticipation": False,
            "tags": ["approach", "diatonic", "below"],
        },
        {
            "id": "ap_004", "name": "diatonic_above",
            "intervals_from_root": [3, 3],
            "beat_preference": ["and", "1"],
            "allows_anticipation": False,
            "tags": ["approach", "diatonic", "above"],
        },
        {
            "id": "ap_005", "name": "double_chromatic_below",
            "intervals_from_root": [2, 1],
            "beat_preference": ["and", "4", "1"],
            "allows_anticipation": False,
            "tags": ["approach", "chromatic", "double", "below"],
        },
        {
            "id": "ap_006", "name": "whole_half_below",
            "intervals_from_root": [-1, -2],
            "beat_preference": ["and", "4", "1"],
            "allows_anticipation": False,
            "tags": ["approach", "diatonic", "below"],
        },
    ],

    # ── Enclosure formulas (sub-sequences from TOP_PATTERNS) ──
    "enclosures": [
        {
            "id": "enc_001", "name": "above_below_land",
            "intervals_from_root": [1, -1, -2],
            "beat_preference": ["and", "4", "1"],
            "allows_anticipation": False,
            "tags": ["enclosure", "above", "below"],
        },
        {
            "id": "enc_002", "name": "below_above_land",
            "intervals_from_root": [-1, 1, 2],
            "beat_preference": ["and", "4", "1"],
            "allows_anticipation": False,
            "tags": ["enclosure", "below", "above"],
        },
        {
            "id": "enc_003", "name": "whole_above_half_below",
            "intervals_from_root": [3, -1, -2],
            "beat_preference": ["and", "4", "1"],
            "allows_anticipation": False,
            "tags": ["enclosure", "above", "diatonic"],
        },
        {
            "id": "enc_004", "name": "half_above_whole_below",
            "intervals_from_root": [-2, 1, 1],
            "beat_preference": ["and", "4", "1"],
            "allows_anticipation": False,
            "tags": ["enclosure", "above", "diatonic"],
        },
        {
            "id": "enc_005", "name": "chromatic_double_enclosure",
            "intervals_from_root": [2, 1, -1, -2],
            "beat_preference": ["and", "4", "and", "1"],
            "allows_anticipation": False,
            "tags": ["enclosure", "chromatic", "double"],
        },
    ],

    # ── Bridge launch cells ────────────────────────────
    "bridge_launch": [
        {
            "id": "bl_001", "name": "distant_key_launch",
            "intervals_from_root": [0, -1, -1, 2, 1, -1, -1, 2],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": True,
            "tags": ["bridge", "ascending", "bebop"],
        },
        {
            "id": "bl_002", "name": "dominant_pivot",
            "intervals_from_root": [0, -2, -1, -2, -1, -2, -1, -2],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": True,
            "tags": ["bridge", "dominant", "pivot"],
        },
        {
            "id": "bl_003", "name": "chromatic_bridge_entry",
            "intervals_from_root": [0, 1, 2, -2, -1, 1, 2, -2],
            "beat_preference": ["1","and","2","and","3","and","4","and"],
            "allows_anticipation": False,
            "tags": ["bridge", "chromatic", "bebop"],
        },
    ],

    # ── Phrase endings ─────────────────────────────────
    "phrase_endings": [
        {
            "id": "pe_001", "name": "long_note_resolution",
            "intervals_from_root": [0, -2, -1, -2, -1, -2],
            "beat_preference": ["1","and","2","and","3","1"],
            "allows_anticipation": False,
            "tags": ["ending", "resolution", "long_note"],
        },
        {
            "id": "pe_002", "name": "chromatic_landing",
            "intervals_from_root": [0, 1, 2, -2, -1],
            "beat_preference": ["1","and","2","and","1"],
            "allows_anticipation": False,
            "tags": ["ending", "chromatic", "resolution"],
        },
        {
            "id": "pe_003", "name": "guide_tone_rest",
            "intervals_from_root": [0, -2, -1, 3, 3],
            "beat_preference": ["1","and","2","and","1"],
            "allows_anticipation": False,
            "tags": ["ending", "guide_tone", "rest"],
        },
    ],
}

# Aliases
PARKER_VOCABULARY["tonic_major"] = PARKER_VOCABULARY["I"]
PARKER_VOCABULARY["tonic"] = PARKER_VOCABULARY["I"]
PARSER_VOCABULARY_SOURCE = (
    "Confirmation, Anthropology, Donna Lee, Now's The Time, Billie's Bounce — 2,099 notes (6 transcriptions; Ko-Ko omitted)"
)


def get_pattern(
    chord_function: str,
    seed: int,
    tags: Optional[List[str]] = None,
) -> List[int]:
    pool = PARKER_VOCABULARY.get(chord_function, PARKER_VOCABULARY["dominant"])
    if tags:
        filtered = [p for p in pool if any(t in p.get("tags", []) for t in tags)]
        if filtered:
            pool = filtered
    entry = pool[seed % len(pool)]
    return list(entry["intervals_from_root"])


if __name__ == "__main__":
    total = sum(len(v) for v in PARKER_VOCABULARY.values())
    print(f"Total vocabulary entries: {total}")
    for k, v in PARKER_VOCABULARY.items():
        print(f"  {k}: {len(v)} patterns")
