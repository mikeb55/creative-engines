"""
Scofield Holland Form Planner — Groove head, riff AABA, asymmetrical small-group.
"""

from typing import Any, Dict, List

try:
    from .composer_ir import PhrasePlan, SectionPlan
except ImportError:
    from composer_ir import PhrasePlan, SectionPlan

PROFILES = {
    "groove_head_form": ([6, 7, 6], ["primary", "contrast", "return"]),
    "riff_aaba": ([4, 4, 6, 4], ["primary", "primary", "contrast", "return"]),
    "asymmetrical_small_group": ([7, 8, 6], ["primary", "contrast", "return"]),
    "vamp_bridge_return": ([6, 8, 7], ["primary", "contrast", "return"]),
    "chromatic_blues_arc": ([6, 7, 8, 6], ["primary", "contrast", "return", "coda"]),
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def plan_form(seed: int, profile: str = "groove_head_form") -> Dict[str, Any]:
    """Plan form. Asymmetric, pocket-based. Phrase groups 4-6, 6-8, 7-9 bars."""
    prof = profile
    phrase_lengths, section_order = PROFILES.get(prof, PROFILES["groove_head_form"])
    h = _hash_int(seed)
    phrase_lengths = list(phrase_lengths)
    if h % 2 == 0:
        phrase_lengths = phrase_lengths[::-1]
    return {
        "phrase_lengths": phrase_lengths,
        "section_order": section_order,
        "total_bars": sum(phrase_lengths),
        "profile": prof,
    }


def build_phrase_plan(form_plan: Dict[str, Any], profile: str = "asymmetric") -> PhrasePlan:
    """Build PhrasePlan from form plan."""
    lengths = form_plan.get("phrase_lengths", [6, 7, 6])
    total = form_plan.get("total_bars", sum(lengths))
    return PhrasePlan(phrase_lengths=lengths, total_bars=total, asymmetry_level=0.7)


def score_form_interest(form_plan: Dict[str, Any]) -> float:
    """Score 0-1: higher = more interesting/asymmetrical."""
    lengths = form_plan.get("phrase_lengths", [])
    if not lengths:
        return 0.0
    mn, mx = min(lengths), max(lengths)
    spread = (mx - mn) / max(mx, 1)
    return min(1.0, spread * 0.7)
