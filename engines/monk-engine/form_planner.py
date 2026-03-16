"""
Monk Form Planner — Compact jazz forms, quirky phrase extensions, strong motif identity.
"""

from typing import Dict, Any

try:
    from .composer_ir import PhrasePlan
except ImportError:
    from composer_ir import PhrasePlan

PROFILES = {
    "compact_16": ([4, 4, 4, 4], ["primary", "contrast", "return"]),
    "quirky_17": ([4, 5, 4, 4], ["primary", "contrast", "return"]),
    "blues_12": ([4, 4, 4], ["primary", "contrast", "return"]),
    "odd_15": ([4, 5, 6], ["primary", "contrast", "return"]),
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def plan_form(seed: int, profile: str = "compact_16") -> Dict[str, Any]:
    prof = profile
    phrase_lengths, section_order = PROFILES.get(prof, PROFILES["compact_16"])
    phrase_lengths = list(phrase_lengths)
    h = _hash_int(seed)
    if h % 3 == 0:
        phrase_lengths = phrase_lengths[::-1]
    return {
        "phrase_lengths": phrase_lengths,
        "section_order": section_order,
        "total_bars": sum(phrase_lengths),
        "profile": prof,
    }


def build_phrase_plan(form_plan: Dict[str, Any], profile: str = "compact") -> PhrasePlan:
    lengths = form_plan.get("phrase_lengths", [4, 4, 4, 4])
    total = form_plan.get("total_bars", sum(lengths))
    asym = 0.6 if "quirky" in str(form_plan.get("profile", "")) or "odd" in str(form_plan.get("profile", "")) else 0.4
    return PhrasePlan(phrase_lengths=lengths, total_bars=total, asymmetry_level=asym)


def score_form_interest(form_plan: Dict[str, Any]) -> float:
    lengths = form_plan.get("phrase_lengths", [])
    if not lengths:
        return 0.0
    odd_count = sum(1 for L in lengths if L % 2 == 1)
    return min(1.0, 0.3 + (odd_count / max(len(lengths), 1)) * 0.4)
