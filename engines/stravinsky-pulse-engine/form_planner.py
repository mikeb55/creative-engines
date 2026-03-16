"""
Stravinsky Pulse Form Planner — Block contrast, asymmetrical ostinato, pulse arc.
"""

from typing import Any, Dict, List

try:
    import sys
    import os
    _base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if _base not in sys.path:
        sys.path.insert(0, _base)
    from shared_rhythm_disruption.block_form_tools import build_block_contrast_plan
    from shared_rhythm_disruption.asymmetrical_cycle_tools import build_asymmetrical_cycle
except ImportError:
    build_block_contrast_plan = None
    build_asymmetrical_cycle = None


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


PROFILES = {
    "block_contrast": ["primary", "contrast", "return"],
    "asymmetrical_ostinato": ["primary", "contrast", "return"],
    "pulse_arc": ["primary", "contrast", "return"],
    "sectional_refrain": ["primary", "refrain", "contrast", "return"],
    "cut_return": ["primary", "contrast", "return"],
}


def plan_form(seed: int, profile: str = "block_contrast") -> Dict[str, Any]:
    """Plan form. Deterministic."""
    section_order = PROFILES.get(profile, PROFILES["block_contrast"])
    h = _hash_int(seed)
    if build_block_contrast_plan:
        plan = build_block_contrast_plan(seed, "block_contrast")
        pl = plan.block_lengths
    else:
        pl = [5, 3, 4]
    n = len(section_order)
    phrase_lengths = (pl * ((n // len(pl)) + 1))[:n]
    return {"profile": profile, "section_order": section_order, "phrase_lengths": phrase_lengths}


def build_phrase_plan(form: Dict[str, Any], style: str = "asymmetric") -> "PhrasePlan":
    """Build phrase plan from form."""
    try:
        from .composer_ir import PhrasePlan
    except ImportError:
        from composer_ir import PhrasePlan
    pl = form.get("phrase_lengths", [5, 3, 4])
    return PhrasePlan(phrase_lengths=pl, total_bars=sum(pl), asymmetry_level=0.8)
