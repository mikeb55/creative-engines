"""
Zappa Disruption Form Planner — Interruption form, cut collage, false return.
"""

from typing import Any, Dict, List

try:
    import sys
    import os
    _base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if _base not in sys.path:
        sys.path.insert(0, _base)
    from shared_rhythm_disruption.block_form_tools import build_block_contrast_plan
    from shared_rhythm_disruption.interruption_patterns import build_interruption_pattern
except ImportError:
    build_block_contrast_plan = None
    build_interruption_pattern = None


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


PROFILES = {
    "interruption_form": ["primary", "cut", "return"],
    "cut_collage": ["primary", "cut", "cut", "return"],
    "false_return": ["primary", "cut", "return", "cut"],
    "asymmetrical_collision": ["primary", "cut", "return"],
    "abrupt_refrain_break": ["primary", "refrain", "cut", "return"],
}


def plan_form(seed: int, profile: str = "interruption_form") -> Dict[str, Any]:
    section_order = PROFILES.get(profile, PROFILES["interruption_form"])
    h = _hash_int(seed)
    if build_block_contrast_plan:
        plan = build_block_contrast_plan(seed, "cut_collage")
        pl = plan.block_lengths
    else:
        pl = [3, 4, 2]
    n = len(section_order)
    phrase_lengths = (pl * ((n // len(pl)) + 1))[:n]
    return {"profile": profile, "section_order": section_order, "phrase_lengths": phrase_lengths}


def build_phrase_plan(form: Dict[str, Any], style: str = "asymmetric") -> "PhrasePlan":
    try:
        from .composer_ir import PhrasePlan
    except ImportError:
        from composer_ir import PhrasePlan
    pl = form.get("phrase_lengths", [3, 4, 2])
    return PhrasePlan(phrase_lengths=pl, total_bars=sum(pl), asymmetry_level=0.9)
