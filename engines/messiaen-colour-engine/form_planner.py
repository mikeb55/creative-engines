"""
Messiaen Colour Form Planner — Colour panels, ecstatic arc, asymmetrical radiance.
"""

from typing import Any, Dict, List


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


PROFILES = {
    "colour_panels": ["primary", "contrast", "return"],
    "ecstatic_arc": ["primary", "contrast", "return"],
    "asymmetrical_radiance": ["primary", "contrast", "return"],
    "birdsong_interruption_form": ["primary", "contrast", "return"],
    "static_center_transformed_return": ["primary", "contrast", "return"],
}

PHRASE_LENGTHS = {
    "colour_panels": [5, 7, 4],
    "ecstatic_arc": [7, 5, 8],
    "asymmetrical_radiance": [3, 7, 5],
    "birdsong_interruption_form": [4, 6, 5],
    "static_center_transformed_return": [5, 8, 6],
}


def plan_form(seed: int, profile: str = "colour_panels") -> Dict[str, Any]:
    section_order = PROFILES.get(profile, PROFILES["colour_panels"])
    pl = list(PHRASE_LENGTHS.get(profile, PHRASE_LENGTHS["colour_panels"]))
    h = _hash_int(seed)
    if h % 2 == 0 and len(pl) > 1:
        pl = pl[::-1]
    n = len(section_order)
    phrase_lengths = (pl * ((n // len(pl)) + 1))[:n]
    return {"profile": profile, "section_order": section_order, "phrase_lengths": phrase_lengths}


def build_phrase_plan(form: Dict[str, Any], style: str = "asymmetric") -> "PhrasePlan":
    try:
        from .composer_ir import PhrasePlan
    except ImportError:
        from composer_ir import PhrasePlan
    pl = form.get("phrase_lengths", [5, 7, 4])
    return PhrasePlan(phrase_lengths=pl, total_bars=sum(pl), asymmetry_level=0.85)
