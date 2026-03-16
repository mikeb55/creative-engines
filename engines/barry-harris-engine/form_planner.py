"""
BH Form Planner — Compact jazz song forms, 8 or 16 bar cycles.
"""

from typing import Dict, Any

try:
    from .composer_ir import PhrasePlan
except ImportError:
    from composer_ir import PhrasePlan

PROFILES = {
    "compact_8": ([4, 4], ["primary", "return"]),
    "aaba_16": ([4, 4, 4, 4], ["primary", "contrast", "return"]),
    "blues_12": ([4, 4, 4], ["primary", "contrast", "return"]),
    "rhythm_32": ([8, 8, 8, 8], ["primary", "contrast", "return"]),
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def plan_form(seed: int, profile: str = "aaba_16") -> Dict[str, Any]:
    """Plan BH form. Deterministic."""
    prof = profile
    phrase_lengths, section_order = PROFILES.get(prof, PROFILES["aaba_16"])
    phrase_lengths = list(phrase_lengths)
    return {
        "phrase_lengths": phrase_lengths,
        "section_order": section_order,
        "total_bars": sum(phrase_lengths),
        "profile": prof,
    }


def build_phrase_plan(form_plan: Dict[str, Any], profile: str = "compact") -> PhrasePlan:
    lengths = form_plan.get("phrase_lengths", [4, 4, 4, 4])
    total = form_plan.get("total_bars", sum(lengths))
    return PhrasePlan(phrase_lengths=lengths, total_bars=total, asymmetry_level=0.3)


def score_form_interest(form_plan: Dict[str, Any]) -> float:
    lengths = form_plan.get("phrase_lengths", [])
    if not lengths:
        return 0.0
    return min(1.0, len(lengths) * 0.15)
