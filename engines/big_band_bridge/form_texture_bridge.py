"""
Form/Texture Bridge — Merge Shorter form, Ligeti texture, Big Band host.
"""

import importlib.util
import os
import sys
from typing import Any, Dict, List

_base = os.path.dirname(os.path.abspath(__file__))
_engines = os.path.dirname(_base)
_bb = os.path.join(_engines, "big-band-engine")
for p in [_engines, _bb]:
    if p not in sys.path:
        sys.path.insert(0, p)

_spec = importlib.util.spec_from_file_location("bb_composer_ir", os.path.join(_bb, "composer_ir.py"))
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
BigBandIR = _mod.ComposerIR
SectionPlan = _mod.SectionPlan


def merge_form_and_texture(
    shorter_form_ir: Any,
    ligeti_texture_ir: Any,
    big_band_ir: BigBandIR,
) -> BigBandIR:
    """Merge form (Shorter), texture (Ligeti), and ensemble (Big Band) into one Big Band IR."""
    # Use Shorter form: section_order, phrase_lengths
    form_order = getattr(shorter_form_ir, "section_order", big_band_ir.section_order)
    form_roles = getattr(shorter_form_ir, "section_roles", big_band_ir.section_roles)
    phrase_plan = getattr(shorter_form_ir, "phrase_plan", None)
    if phrase_plan and hasattr(phrase_plan, "phrase_lengths"):
        form_phrase_lengths = phrase_plan.phrase_lengths
    else:
        form_phrase_lengths = [5, 7, 9]
    # Use Ligeti texture: density_curve, texture_plan
    texture_curve = getattr(ligeti_texture_ir, "density_curve", [])
    texture_plan = getattr(ligeti_texture_ir, "texture_plan", {})
    # Map form sections to big band; align phrase lengths
    section_order = list(form_order) if form_order else big_band_ir.section_order
    n = len(section_order)
    pl_per = max(1, len(form_phrase_lengths) // n)
    section_roles = {}
    idx = 0
    for i, role in enumerate(section_order):
        pl = form_phrase_lengths[idx:idx + pl_per] if idx < len(form_phrase_lengths) else [4]
        if not pl:
            pl = [4]
        idx += len(pl)
        bar_count = sum(pl)
        orig = form_roles.get(role) or big_band_ir.section_roles.get(role)
        if orig and hasattr(orig, "role"):
            section_roles[role] = type(orig)(role=role, bar_count=bar_count, phrase_lengths=pl)
        else:
            section_roles[role] = SectionPlan(role=role, bar_count=bar_count, phrase_lengths=pl)
    # Build density plan from texture curve
    density_plan = {}
    for i, role in enumerate(section_order):
        d = texture_curve[i] if i < len(texture_curve) else 0.5 + (i * 0.1)
        density_plan[role] = min(1.0, max(0.0, d))
    # Build merged IR (copy big_band_ir, override)
    merged = BigBandIR(
        title=big_band_ir.title + " (Form+Texture)",
        seed=big_band_ir.seed,
        tempo_hint=big_band_ir.tempo_hint,
        meter_plan=big_band_ir.meter_plan,
        form_plan=getattr(shorter_form_ir, "form_plan", big_band_ir.form_plan),
        section_order=section_order,
        section_roles=section_roles,
        motivic_cells=big_band_ir.motivic_cells,
        interval_language=big_band_ir.interval_language,
        harmonic_field=big_band_ir.harmonic_field,
        harmonic_motion_type=big_band_ir.harmonic_motion_type,
        asymmetry_profile=big_band_ir.asymmetry_profile,
        phrase_plan=big_band_ir.phrase_plan,
        registral_plan=big_band_ir.registral_plan,
        contrast_plan=big_band_ir.contrast_plan,
        development_plan=big_band_ir.development_plan,
        cadence_strategy=big_band_ir.cadence_strategy,
        export_hints=big_band_ir.export_hints,
        musicxml_constraints=big_band_ir.musicxml_constraints,
        sectional_roles=getattr(big_band_ir, "sectional_roles", {}),
        density_plan=density_plan,
        brass_punch_plan=getattr(big_band_ir, "brass_punch_plan", {}),
        sax_texture_plan={**getattr(big_band_ir, "sax_texture_plan", {}), **texture_plan},
        rhythm_section_plan=getattr(big_band_ir, "rhythm_section_plan", {}),
        shout_chorus_flag="shout" in section_order,
    )
    return merged


def score_form_texture_fit(
    shorter_form_ir: Any,
    ligeti_texture_ir: Any,
    big_band_ir: BigBandIR,
) -> float:
    """Score 0-1: how well form and texture fit for big band."""
    form_order = getattr(shorter_form_ir, "section_order", [])
    texture_curve = getattr(ligeti_texture_ir, "density_curve", [])
    bb_order = big_band_ir.section_order
    if not form_order or not bb_order:
        return 0.5
    # Overlap in section roles
    form_set = set(form_order)
    bb_set = set(bb_order)
    overlap = len(form_set & bb_set) / max(len(form_set | bb_set), 1)
    # Texture curve length vs form length
    curve_ok = len(texture_curve) >= len(form_order) * 0.5 if texture_curve else True
    return min(1.0, overlap * 0.7 + (0.3 if curve_ok else 0.0))
