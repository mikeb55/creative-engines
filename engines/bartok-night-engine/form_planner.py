"""
Bartók Night Form Planner — Irregular, asymmetric, atmospheric sections.
"""

from typing import Any, Dict, List

try:
    from .composer_ir import PhrasePlan, SectionPlan
except ImportError:
    from composer_ir import PhrasePlan, SectionPlan

PROFILES = {
    "atmospheric_sections": ([5, 7, 5, 6], ["primary", "contrast", "return"]),
    "fragmented_return": ([3, 5, 7, 4], ["primary", "contrast", "return"]),
    "irregular_cycle": ([7, 5, 9, 5], ["primary", "contrast", "return"]),
    "floating_segments": ([4, 6, 5, 7, 4], ["primary", "contrast", "return"]),
    "asymmetrical_refrain": ([5, 7, 5], ["primary", "contrast", "return"]),
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def plan_form(seed: int, profile: str = "atmospheric_sections") -> Dict[str, Any]:
    """Plan form. Phrase groups 3–5, 5–7, 7–9 bars. Deterministic."""
    prof = profile
    phrase_lengths, section_order = PROFILES.get(prof, PROFILES["atmospheric_sections"])
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
    lengths = form_plan.get("phrase_lengths", [5, 7, 5])
    total = form_plan.get("total_bars", sum(lengths))
    return PhrasePlan(phrase_lengths=lengths, total_bars=total, asymmetry_level=0.9)


def score_form_interest(form_plan: Dict[str, Any]) -> float:
    """Score 0-1: higher = more interesting/asymmetrical."""
    lengths = form_plan.get("phrase_lengths", [])
    if not lengths:
        return 0.0
    mn, mx = min(lengths), max(lengths)
    spread = (mx - mn) / max(mx, 1)
    odd_count = sum(1 for L in lengths if L % 2 == 1)
    return min(1.0, spread * 0.6 + (odd_count / max(len(lengths), 1)) * 0.4)
