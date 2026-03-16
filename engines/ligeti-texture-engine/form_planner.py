"""
Ligeti Texture Form Planner — Density arc, suspended texture, layered cloud.
"""

from typing import Any, Dict, List

try:
    from .composer_ir import PhrasePlan, SectionPlan
except ImportError:
    from composer_ir import PhrasePlan, SectionPlan

PROFILES = {
    "density_arc": ([3, 5, 7, 5], ["primary", "contrast", "return"]),
    "suspended_texture_form": ([5, 8, 5], ["primary", "contrast", "return"]),
    "layered_cloud_form": ([7, 5, 7, 5], ["primary", "contrast", "return"]),
    "asymmetrical_mass_growth": ([3, 5, 8, 7], ["primary", "contrast", "return"]),
    "interrupted_texture_return": ([5, 7, 11], ["primary", "contrast", "return"]),
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def plan_form(seed: int, profile: str = "density_arc") -> Dict[str, Any]:
    """Plan form. Phrase groups 3–5, 5–8, 7–11 bars. Deterministic."""
    prof = profile
    phrase_lengths, section_order = PROFILES.get(prof, PROFILES["density_arc"])
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
    lengths = form_plan.get("phrase_lengths", [3, 5, 7])
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
