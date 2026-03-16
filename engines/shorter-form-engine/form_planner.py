"""
Shorter Form Planner — Narrative arc, modular form, transformed return.
"""

from typing import Any, Dict, List

try:
    from .composer_ir import PhrasePlan, SectionPlan
except ImportError:
    from composer_ir import PhrasePlan, SectionPlan

PROFILES = {
    "narrative_arc_form": ([5, 7, 9], ["primary", "development", "return"]),
    "modular_shorter_form": ([7, 5, 9, 7], ["primary", "development", "return", "coda"]),
    "asymmetric_cycle_form": ([5, 9, 7], ["primary", "development", "return"]),
    "transformed_return_form": ([7, 9, 11], ["primary", "development", "return"]),
    "episode_variation_form": ([5, 7, 5, 9], ["primary", "episode", "development", "return"]),
}


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def plan_form(seed: int, profile: str = "narrative_arc_form") -> Dict[str, Any]:
    """Plan form. Phrase groups 5–7, 7–9, 9–11 bars. Deterministic."""
    prof = profile
    phrase_lengths, section_order = PROFILES.get(prof, PROFILES["narrative_arc_form"])
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
    lengths = form_plan.get("phrase_lengths", [5, 7, 9])
    total = form_plan.get("total_bars", sum(lengths))
    return PhrasePlan(phrase_lengths=lengths, total_bars=total, asymmetry_level=0.85)


def score_form_interest(form_plan: Dict[str, Any]) -> float:
    """Score 0-1: higher = more interesting/asymmetrical."""
    lengths = form_plan.get("phrase_lengths", [])
    if not lengths:
        return 0.0
    mn, mx = min(lengths), max(lengths)
    spread = (mx - mn) / max(mx, 1)
    odd_count = sum(1 for L in lengths if L % 2 == 1)
    return min(1.0, spread * 0.6 + (odd_count / max(len(lengths), 1)) * 0.4)
