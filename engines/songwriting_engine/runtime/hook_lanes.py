"""
Hook Lanes — Archetype lanes to prevent collapse into median chorus style.
"""

from typing import Any, Dict, List

HOOK_LANES = [
    "anthemic",
    "intimate",
    "image_driven",
    "groove_driven",
    "motif_driven",
]

LANE_SIGNATURES = {
    "anthemic": {
        "contour": ["rise", "arch", "rise_hold_fall"],
        "energy_min": 0.75,
        "peak_emphasis": True,
        "rhythm_profile": "strong_downbeat",
    },
    "intimate": {
        "contour": ["narrow", "fall", "rise"],
        "energy_min": 0.4,
        "peak_emphasis": False,
        "rhythm_profile": "soft_landing",
    },
    "image_driven": {
        "contour": ["arch", "rise", "fall"],
        "energy_min": 0.5,
        "peak_emphasis": True,
        "rhythm_profile": "lyric_forward",
    },
    "groove_driven": {
        "contour": ["repeat_then_leap", "rise_hold_fall"],
        "energy_min": 0.6,
        "peak_emphasis": True,
        "rhythm_profile": "syncopated",
    },
    "motif_driven": {
        "contour": ["arch", "repeat_then_leap", "rise"],
        "energy_min": 0.55,
        "peak_emphasis": True,
        "rhythm_profile": "motif_repeat",
    },
}


def assign_hook_to_lane(hook_candidate: Dict[str, Any]) -> str:
    """Assign hook to lane based on its attributes."""
    contour = hook_candidate.get("contour_archetype", "arch")
    energy = hook_candidate.get("energy_level", 0.5)
    rhythm = hook_candidate.get("rhythmic_hook_profile", "")

    scores = {}
    for lane, sig in LANE_SIGNATURES.items():
        s = 0.0
        if contour in sig.get("contour", []):
            s += 2.0
        if energy >= sig.get("energy_min", 0.4):
            s += 1.0
        if sig.get("rhythm_profile", "") in rhythm or not rhythm:
            s += 0.5
        scores[lane] = s

    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "anthemic"


def get_top_per_lane(
    hook_candidates: List[Dict[str, Any]],
    scores: List[float],
    elite_per_lane: int = 2,
) -> List[Dict[str, Any]]:
    """Keep top N candidates per lane, then flatten for global comparison."""
    by_lane = {}
    for h, sc in zip(hook_candidates, scores):
        lane = assign_hook_to_lane(h)
        if lane not in by_lane:
            by_lane[lane] = []
        by_lane[lane].append((h, sc))

    result = []
    for lane, items in by_lane.items():
        sorted_items = sorted(items, key=lambda x: x[1], reverse=True)
        result.extend([h for h, _ in sorted_items[:elite_per_lane]])
    return result
