"""
Shorter Generator — Assemble ComposerIR from title/premise.
Deterministic, profile cycling, validates.
"""

from typing import List

try:
    from .composer_ir import ComposerIR, MotivicCell, IntervalLanguage, HarmonicField, PhrasePlan, ContrastPlan, DevelopmentPlan, SectionPlan
    from .composer_ir_validator import validate_composer_ir
    from .shorter_interval_language import build_interval_language
    from .shorter_harmonic_fields import build_harmonic_field
    from .shorter_motif_development import generate_motivic_cells, build_development_plan
    from .shorter_form_planner import plan_shorter_form, build_phrase_plan
except ImportError:
    from composer_ir import ComposerIR, MotivicCell, IntervalLanguage, HarmonicField, PhrasePlan, ContrastPlan, DevelopmentPlan, SectionPlan
    from composer_ir_validator import validate_composer_ir
    from shorter_interval_language import build_interval_language
    from shorter_harmonic_fields import build_harmonic_field
    from shorter_motif_development import generate_motivic_cells, build_development_plan
    from shorter_form_planner import plan_shorter_form, build_phrase_plan

PROFILES = ["balanced", "angular", "lyrical_ambiguous", "quartal_colored"]
HARMONY_PROFILES = ["ambiguous_modal", "nonfunctional_cycle", "blues_shadowed", "mixed_tonic_centers"]
FORM_PROFILES = ["compact_asymmetrical", "odd_phrase_aba", "bridge_with_reframed_return"]


def _hash_str(s: str, seed: int) -> int:
    h = seed
    for c in (s or "").encode("utf-8", errors="replace"):
        h = (h * 31 + c) & 0xFFFFFFFF
    return h


def generate_composer_ir_from_title(title: str, seed: int = 0, profile: str = "balanced") -> ComposerIR:
    """Generate ComposerIR from title. Deterministic."""
    h = _hash_str(title, seed)
    il = build_interval_language(seed + h % 1000, PROFILES[(h >> 4) % len(PROFILES)])
    hf = build_harmonic_field(seed + (h >> 8) % 1000, HARMONY_PROFILES[(h >> 12) % len(HARMONY_PROFILES)])
    cells = generate_motivic_cells(seed + (h >> 16) % 1000, 3)
    form = plan_shorter_form(seed + (h >> 20) % 1000, FORM_PROFILES[(h >> 24) % len(FORM_PROFILES)])
    pp = build_phrase_plan(form, "asymmetrical")
    dev = build_development_plan(cells, seed)
    section_order = form["section_order"]
    pl_all = form["phrase_lengths"]
    n = len(section_order)
    section_roles = {}
    idx = 0
    for i, role in enumerate(section_order):
        phrases_per = max(1, len(pl_all) // n)
        pl = pl_all[idx:idx + phrases_per] if idx < len(pl_all) else [4]
        if not pl:
            pl = [4]
        idx += len(pl)
        bar_count = sum(pl)
        section_roles[role] = SectionPlan(role=role, bar_count=bar_count, phrase_lengths=pl)
    ir = ComposerIR(
        title=title,
        seed=seed,
        tempo_hint=84 + (seed % 24),
        form_plan=form.get("profile", "compact_asymmetrical"),
        section_order=section_order,
        section_roles=section_roles,
        motivic_cells=cells,
        interval_language=il,
        harmonic_field=hf,
        harmonic_motion_type=hf.motion_type,
        asymmetry_profile="explicit",
        phrase_plan=pp,
        contrast_plan=ContrastPlan(section_contrasts={"contrast": 0.6, "return": 0.8}),
        development_plan=DevelopmentPlan(section_operations=dev),
        cadence_strategy="open",
    )
    r = validate_composer_ir(ir)
    if not r.valid:
        raise ValueError(f"Invalid ComposerIR: {'; '.join(r.errors)}")
    return ir


def generate_composer_ir_from_premise(premise: str, seed: int = 0, profile: str = "balanced") -> ComposerIR:
    """Generate ComposerIR from premise. Title from first words."""
    words = (premise or "").strip().split()[:3]
    title = " ".join(words).title() if words else "Untitled"
    return generate_composer_ir_from_title(title, seed, profile)


def generate_composer_ir_candidates(input_text: str, mode: str = "title", count: int = 12, seed: int = 0) -> List[ComposerIR]:
    """Generate count varied ComposerIR candidates. Deterministic."""
    out = []
    for i in range(count):
        s = seed + i * 1007
        prof = PROFILES[i % len(PROFILES)]
        try:
            if mode == "title":
                ir = generate_composer_ir_from_title(input_text or "Untitled", s, prof)
            else:
                ir = generate_composer_ir_from_premise(input_text or "Untitled", s, prof)
            out.append(ir)
        except ValueError:
            ir = generate_composer_ir_from_title("Untitled", s, "balanced")
            out.append(ir)
    return out[:count]
