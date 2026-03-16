"""
Shorter Form Planner — Asymmetrical phrase structures, composed form.
7, 8, 9, 10, 11-bar phrase groups. No symmetry normalization.
"""

from typing import List, Dict, Any, Tuple

try:
    from .composer_ir import PhrasePlan, SectionPlan
except ImportError:
    from composer_ir import PhrasePlan, SectionPlan

PROFILES = {
    "compact_asymmetrical": ([4, 5, 4, 6], ["primary", "contrast", "return"]),
    "through_composed_songform": ([8, 7, 9, 8], ["primary", "contrast", "return", "coda"]),
    "odd_phrase_aba": ([7, 9, 7], ["primary", "contrast", "return"]),
    "bridge_with_reframed_return": ([8, 6, 10], ["primary", "contrast", "return"]),
    "floating_sectional": ([5, 7, 5, 6], ["intro", "primary", "contrast", "return"]),
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def plan_shorter_form(seed: int, profile: str = "asymmetrical") -> Dict[str, Any]:
    """Plan form. Deterministic."""
    prof = "compact_asymmetrical" if profile == "asymmetrical" else profile
    phrase_lengths, section_order = PROFILES.get(prof, PROFILES["compact_asymmetrical"])
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


def build_phrase_plan(form_plan: Dict[str, Any], profile: str = "asymmetrical") -> PhrasePlan:
    """Build PhrasePlan from form plan."""
    lengths = form_plan.get("phrase_lengths", [4, 5, 4, 6])
    total = form_plan.get("total_bars", sum(lengths))
    asym = 0.7 if "asymmetrical" in profile or "odd" in str(form_plan.get("profile", "")) else 0.5
    return PhrasePlan(phrase_lengths=lengths, total_bars=total, asymmetry_level=asym)


def score_form_interest(form_plan: Dict[str, Any]) -> float:
    """Score 0-1: higher = more interesting/asymmetrical."""
    lengths = form_plan.get("phrase_lengths", [])
    if not lengths:
        return 0.0
    mn, mx = min(lengths), max(lengths)
    spread = (mx - mn) / max(mx, 1)
    odd_count = sum(1 for L in lengths if L % 2 == 1)
    return min(1.0, spread * 0.6 + (odd_count / max(len(lengths), 1)) * 0.4)
