"""
Hill Form Planner — Irregular phrase groups, asymmetrical forms, sectional contrast.
"""

from typing import Dict, Any

try:
    from .composer_ir import PhrasePlan
except ImportError:
    from composer_ir import PhrasePlan

PROFILES = {
    "irregular_5_7_5": ([5, 7, 5], ["primary", "contrast", "return"]),
    "asymmetrical_7_9": ([7, 9], ["primary", "return"]),
    "sectional_contrast": ([4, 6, 5, 7], ["primary", "contrast", "return"]),
    "floating_odd": ([5, 7, 6, 5], ["primary", "contrast", "return"]),
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def plan_form(seed: int, profile: str = "irregular_5_7_5") -> Dict[str, Any]:
    prof = profile
    phrase_lengths, section_order = PROFILES.get(prof, PROFILES["irregular_5_7_5"])
    phrase_lengths = list(phrase_lengths)
    h = _hash_int(seed)
    if h % 2 == 0:
        phrase_lengths = phrase_lengths[::-1]
    return {
        "phrase_lengths": phrase_lengths,
        "section_order": section_order,
        "total_bars": sum(phrase_lengths),
        "profile": prof,
    }


def build_phrase_plan(form_plan: Dict[str, Any], profile: str = "asymmetrical") -> PhrasePlan:
    lengths = form_plan.get("phrase_lengths", [5, 7, 5])
    total = form_plan.get("total_bars", sum(lengths))
    return PhrasePlan(phrase_lengths=lengths, total_bars=total, asymmetry_level=0.8)


def score_form_interest(form_plan: Dict[str, Any]) -> float:
    lengths = form_plan.get("phrase_lengths", [])
    if not lengths:
        return 0.0
    mn, mx = min(lengths), max(lengths)
    spread = (mx - mn) / max(mx, 1)
    odd_count = sum(1 for L in lengths if L % 2 == 1)
    return min(1.0, spread * 0.6 + (odd_count / max(len(lengths), 1)) * 0.4)
