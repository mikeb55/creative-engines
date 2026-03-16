"""
Shorter Form Section Compiler — Compile IR to CompiledComposition.
"""

from typing import List

try:
    from .composer_ir import ComposerIR, MotivicCell
    from .compiled_composition_types import (
        CompiledComposition,
        CompiledSection,
        CompiledMelodyBlueprint,
        CompiledHarmonyPlan,
        CompiledNarrativeArc,
    )
    from .harmonic_fields import derive_section_harmony
    from .motif_development import develop_motif_cell
except ImportError:
    from composer_ir import ComposerIR, MotivicCell
    from compiled_composition_types import (
        CompiledComposition,
        CompiledSection,
        CompiledMelodyBlueprint,
        CompiledHarmonyPlan,
        CompiledNarrativeArc,
    )
    from harmonic_fields import derive_section_harmony
    from motif_development import develop_motif_cell


def compile_composition_from_ir(composer_ir: ComposerIR) -> CompiledComposition:
    """Compile full composition from IR. Deterministic."""
    sections = []
    for role in composer_ir.section_order:
        sec = compile_section(composer_ir, role)
        sections.append(sec)
    total = sum(s.bar_count for s in sections)
    nar = CompiledNarrativeArc(
        section_roles=composer_ir.narrative_arc,
        transformation_map=composer_ir.section_transformation_map,
    )
    return CompiledComposition(
        title=composer_ir.title,
        sections=sections,
        narrative_arc=nar,
        tempo=composer_ir.tempo_hint,
        meter=composer_ir.meter_plan,
        total_bars=total,
    )


def compile_section(composer_ir: ComposerIR, section_role: str) -> CompiledSection:
    """Compile single section."""
    roles = composer_ir.section_roles
    plan = roles.get(section_role)
    bar_count = plan.bar_count if plan else 8
    if section_role == "primary":
        mb = compile_primary_theme(composer_ir)
    elif section_role == "development":
        mb = compile_development_section(composer_ir)
    elif section_role == "return":
        mb = compile_transformed_return(composer_ir)
    else:
        mb = compile_primary_theme(composer_ir)
    hp = CompiledHarmonyPlan(
        chords=derive_section_harmony(composer_ir.harmonic_field, section_role),
        centers=composer_ir.harmonic_field.centers,
        bars_per_chord=2,
    )
    op = plan.motif_operation if plan else "statement"
    return CompiledSection(
        role=section_role,
        bar_count=bar_count,
        melody_blueprint=mb,
        harmony_plan=hp,
        motif_operation=op,
    )


def compile_primary_theme(composer_ir: ComposerIR) -> CompiledMelodyBlueprint:
    """Compile primary theme melody blueprint."""
    cells = composer_ir.motivic_cells
    il = composer_ir.interval_language
    intervals = il.primary_intervals[:4] if il.primary_intervals else [3, 5, 7]
    if cells:
        intervals = cells[0].intervals[:4] if cells[0].intervals else intervals
    return CompiledMelodyBlueprint(
        intervals=intervals,
        durations=["quarter", "eighth", "quarter", "eighth"],
        contour="arch",
    )


def compile_development_section(composer_ir: ComposerIR) -> CompiledMelodyBlueprint:
    """Compile development section with motif transformation."""
    cells = composer_ir.motivic_cells
    dev = composer_ir.development_plan
    ops = getattr(dev, "section_operations", {}).get("development", ["interval_expansion"])
    op = ops[0] if ops else "interval_expansion"
    if cells:
        developed = develop_motif_cell(cells[0], op)
        intervals = developed.intervals
    else:
        intervals = [5, 7, 3, -3]
    return CompiledMelodyBlueprint(
        intervals=intervals,
        durations=["eighth", "eighth", "quarter", "eighth"],
        contour="wave",
    )


def compile_transformed_return(composer_ir: ComposerIR) -> CompiledMelodyBlueprint:
    """Compile transformed return."""
    cells = composer_ir.motivic_cells
    if cells:
        developed = develop_motif_cell(cells[0], "fragment_return")
        intervals = developed.intervals
    else:
        intervals = [3, 5]
    return CompiledMelodyBlueprint(
        intervals=intervals,
        durations=["quarter", "half"],
        contour="descent",
    )
