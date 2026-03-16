"""
Shorter Form Generator — Deterministic IR from title/premise.
"""

from typing import Any, Dict, List

try:
    from .composer_ir import ComposerIR, DevelopmentPlan, IntervalLanguage, HarmonicField, MotivicCell, PhrasePlan, SectionPlan
    from .interval_language import build_interval_language
    from .harmonic_fields import build_harmonic_field
    from .motif_development import generate_motivic_cells, build_development_plan
    from .form_planner import plan_form, build_phrase_plan
except ImportError:
    from composer_ir import ComposerIR, DevelopmentPlan, IntervalLanguage, HarmonicField, MotivicCell, PhrasePlan, SectionPlan
    from interval_language import build_interval_language
    from harmonic_fields import build_harmonic_field
    from motif_development import generate_motivic_cells, build_development_plan
    from form_planner import plan_form, build_phrase_plan


def _hash_str(s: str) -> int:
    return sum(ord(c) for c in s) & 0xFFFFFFFF


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def generate_composer_ir_from_title(title: str, seed: int = 0) -> ComposerIR:
    """Generate ComposerIR from title. Deterministic."""
    s = _hash_str(title) + seed
    return _build_ir(title, s, {})


def generate_composer_ir_from_premise(title: str, premise: Dict[str, Any], seed: int = 0) -> ComposerIR:
    """Generate ComposerIR from premise. Deterministic."""
    s = _hash_str(title) + seed + _hash_str(str(premise))
    return _build_ir(title, s, premise)


def generate_composer_ir_candidates(title: str, count: int = 3) -> List[ComposerIR]:
    """Generate multiple candidate IRs."""
    return [generate_composer_ir_from_title(title, seed=i) for i in range(count)]


def _build_ir(title: str, seed: int, premise: Dict[str, Any]) -> ComposerIR:
    profile = premise.get("form_profile", "narrative_arc_form")
    fp = plan_form(seed, profile)
    section_order = fp["section_order"]
    phrase_lengths = fp["phrase_lengths"]
    pp = build_phrase_plan(fp)
    il = build_interval_language(seed, premise.get("interval_profile", "shorter_leap"))
    hf = build_harmonic_field(seed, premise.get("harmonic_profile", "shorter_modal_shift"))
    cells = generate_motivic_cells(seed, premise.get("motif_count", 3))
    dev = build_development_plan(cells, seed)
    section_roles = {}
    for i, role in enumerate(section_order):
        pl = phrase_lengths[i % len(phrase_lengths)] if phrase_lengths else 8
        section_roles[role] = SectionPlan(role=role, bar_count=pl, motif_operation=dev.get(role, ["statement"])[0] if dev.get(role) else "statement")
    narrative_arc = {role: ["exposition", "development", "return"][i % 3] for i, role in enumerate(section_order)}
    section_transformation_map = {"return": "transformed", "development": "fragmented"}
    theme_variation_plan = {"return": "fragment_return", "development": "interval_expansion"}
    modular_section_map = {"primary": section_order[:2], "return": section_order[-1:]}
    return ComposerIR(
        title=title,
        seed=seed,
        tempo_hint=90,
        meter_plan=(4, 4),
        form_plan=profile,
        section_order=section_order,
        section_roles=section_roles,
        motivic_cells=cells,
        interval_language=il,
        harmonic_field=hf,
        harmonic_motion_type="ambiguous",
        asymmetry_profile="explicit",
        phrase_plan=pp,
        registral_plan={r: 60 + i * 3 for i, r in enumerate(section_order)},
        development_plan=DevelopmentPlan(section_operations=dev, return_transformation="transformed"),
        cadence_strategy="open",
        narrative_arc=narrative_arc,
        section_transformation_map=section_transformation_map,
        theme_variation_plan=theme_variation_plan,
        modular_section_map=modular_section_map,
    )
