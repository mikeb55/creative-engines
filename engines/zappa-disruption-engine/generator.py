"""
Zappa Disruption Generator — Assemble ComposerIR from title/premise.
"""

from typing import List

try:
    from .composer_ir import ComposerIR, SectionPlan, DevelopmentPlan
    from .composer_ir_validator import validate_composer_ir
    from .interval_language import build_interval_language
    from .harmonic_fields import build_harmonic_field
    from .motif_development import generate_motivic_cells, build_development_plan
    from .form_planner import plan_form, build_phrase_plan
except ImportError:
    from composer_ir import ComposerIR, SectionPlan, DevelopmentPlan
    from composer_ir_validator import validate_composer_ir
    from interval_language import build_interval_language
    from harmonic_fields import build_harmonic_field
    from motif_development import generate_motivic_cells, build_development_plan
    from form_planner import plan_form, build_phrase_plan

PROFILES = ["jagged_cut", "chromatic_burst", "satirical_leap", "disruption_cell", "odd_repeat_break"]
HARMONY_PROFILES = ["collision_field", "altered_shift", "abrupt_modal_cut", "chromatic_break", "unstable_axis"]
FORM_PROFILES = ["interruption_form", "cut_collage", "false_return", "asymmetrical_collision", "abrupt_refrain_break"]


def _hash_str(s: str, seed: int) -> int:
    h = seed
    for c in (s or "").encode("utf-8", errors="replace"):
        h = (h * 31 + c) & 0xFFFFFFFF
    return h


def generate_composer_ir_from_title(title: str, seed: int = 0, profile: str = "jagged_cut") -> ComposerIR:
    h = _hash_str(title, seed)
    il = build_interval_language(seed + h % 1000, PROFILES[(h >> 4) % len(PROFILES)])
    hf = build_harmonic_field(seed + (h >> 8) % 1000, HARMONY_PROFILES[(h >> 12) % len(HARMONY_PROFILES)])
    cells = generate_motivic_cells(seed + (h >> 16) % 1000, 3)
    form = plan_form(seed + (h >> 20) % 1000, FORM_PROFILES[(h >> 24) % len(FORM_PROFILES)])
    pp = build_phrase_plan(form, "asymmetric")
    dev = build_development_plan(cells, seed)
    section_order = form["section_order"]
    pl_all = form["phrase_lengths"]
    n = len(section_order)
    section_roles = {}
    idx = 0
    for i, role in enumerate(section_order):
        phrases_per = max(1, len(pl_all) // max(1, n))
        pl = pl_all[idx:idx + phrases_per] if idx < len(pl_all) else [3]
        if not pl:
            pl = [3]
        idx += len(pl)
        bar_count = sum(pl)
        section_roles[role] = SectionPlan(role=role, bar_count=bar_count, phrase_lengths=pl)
    ir = ComposerIR(
        title=title,
        seed=seed,
        tempo_hint=130 + (seed % 30),
        form_plan=form.get("profile", "interruption_form"),
        section_order=section_order,
        section_roles=section_roles,
        motivic_cells=cells,
        interval_language=il,
        harmonic_field=hf,
        phrase_plan=pp,
        development_plan=DevelopmentPlan(section_operations=dev),
    )
    r = validate_composer_ir(ir)
    if not r.valid:
        raise ValueError(f"Invalid ComposerIR: {'; '.join(r.errors)}")
    return ir


def generate_composer_ir_from_premise(premise: str, seed: int = 0, profile: str = "jagged_cut") -> ComposerIR:
    words = (premise or "").strip().split()[:3]
    title = " ".join(words).title() if words else "Untitled"
    return generate_composer_ir_from_title(title, seed, profile)


def generate_composer_ir_candidates(input_text: str, mode: str = "title", count: int = 12, seed: int = 0) -> List[ComposerIR]:
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
            ir = generate_composer_ir_from_title("Untitled", s, "jagged_cut")
            out.append(ir)
    return out[:count]
