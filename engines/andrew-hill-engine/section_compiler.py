"""
Hill Section Compiler — Melody from interval cells, rhythm displacement, harmony loosely supportive.
"""

from typing import Any, Dict, List

try:
    from .composer_ir import ComposerIR, SectionPlan, MotivicCell
    from .composer_ir_validator import validate_composer_ir
    from .compiled_composition_types import CompiledComposition, CompiledSection, CompiledMelodyBlueprint, CompiledHarmonyPlan
    from .harmonic_fields import derive_section_harmony
    from .motif_development import develop_motif_cell
except ImportError:
    from composer_ir import ComposerIR, SectionPlan, MotivicCell
    from composer_ir_validator import validate_composer_ir
    from compiled_composition_types import CompiledComposition, CompiledSection, CompiledMelodyBlueprint, CompiledHarmonyPlan
    from harmonic_fields import derive_section_harmony
    from motif_development import develop_motif_cell


def compile_composition_from_ir(composer_ir: ComposerIR) -> CompiledComposition:
    r = validate_composer_ir(composer_ir)
    if not r.valid:
        raise ValueError(f"Invalid ComposerIR: {'; '.join(r.errors)}")
    sections = []
    all_events = []
    bar_start = 0
    for role in composer_ir.section_order:
        sp = composer_ir.section_roles.get(role)
        if sp is None:
            sp = SectionPlan(role=role, bar_count=8)
        compiled = compile_section(sp, composer_ir, role, bar_start)
        sections.append(compiled)
        all_events.extend(compiled.melody_events)
        bar_start = compiled.bar_end
    melody = CompiledMelodyBlueprint(events=all_events)
    all_chords = []
    for s in sections:
        all_chords.extend(s.harmony)
    harmony = CompiledHarmonyPlan(chords=all_chords)
    key_hint = composer_ir.export_hints.key_hint if composer_ir.export_hints else "C"
    return CompiledComposition(
        title=composer_ir.title,
        sections=sections,
        melody=melody,
        harmony=harmony,
        metadata={"seed": composer_ir.seed, "form": composer_ir.form_plan, "tempo": composer_ir.tempo_hint, "key_hint": key_hint},
    )


def compile_section(section_plan: SectionPlan, composer_ir: ComposerIR, section_id: str, bar_start: int) -> CompiledSection:
    if section_plan.role == "primary":
        return compile_primary_theme(section_plan, composer_ir, section_id, bar_start)
    if section_plan.role == "contrast":
        return compile_contrast_section(section_plan, composer_ir, section_id, bar_start)
    if section_plan.role in ("return", "coda"):
        return compile_return_section(section_plan, composer_ir, section_id, bar_start)
    return _compile_generic_section(section_plan, composer_ir, section_id, bar_start)


def compile_primary_theme(section_plan: SectionPlan, composer_ir: ComposerIR, section_id: str, bar_start: int) -> CompiledSection:
    bars = section_plan.bar_count or 8
    bar_end = bar_start + bars
    cell = composer_ir.motivic_cells[0] if composer_ir.motivic_cells else MotivicCell(intervals=[6, 1, 11])
    reg = composer_ir.registral_plan.get("primary", cell.registral_center)
    events = _melody_from_cell(cell, bars, bar_start, section_id, reg)
    harm = derive_section_harmony(composer_ir.harmonic_field, "primary")
    harmony = [{"symbol": harm[i % len(harm)], "measure": bar_start + i, "duration": 4} for i in range(bars)]
    pl = section_plan.phrase_lengths or [4, 4]
    return CompiledSection(section_id=section_id, role="primary", bar_start=bar_start, bar_end=bar_end, melody_events=events, harmony=harmony, phrase_lengths=pl, motif_refs=["m1"], register_hint=reg)


def compile_contrast_section(section_plan: SectionPlan, composer_ir: ComposerIR, section_id: str, bar_start: int) -> CompiledSection:
    bars = section_plan.bar_count or 6
    bar_end = bar_start + bars
    cell = composer_ir.motivic_cells[1] if len(composer_ir.motivic_cells) > 1 else (composer_ir.motivic_cells[0] if composer_ir.motivic_cells else MotivicCell(intervals=[6, 1]))
    developed = develop_motif_cell(cell, "fragmentation")
    reg = composer_ir.registral_plan.get("contrast", cell.registral_center - 5)
    events = _melody_from_cell(developed, bars, bar_start, section_id, reg)
    harm = derive_section_harmony(composer_ir.harmonic_field, "contrast")
    harmony = [{"symbol": harm[i % len(harm)], "measure": bar_start + i, "duration": 4} for i in range(bars)]
    pl = section_plan.phrase_lengths or [3, 3]
    return CompiledSection(section_id=section_id, role="contrast", bar_start=bar_start, bar_end=bar_end, melody_events=events, harmony=harmony, phrase_lengths=pl, motif_refs=["m2_frag"], register_hint=reg)


def compile_return_section(section_plan: SectionPlan, composer_ir: ComposerIR, section_id: str, bar_start: int) -> CompiledSection:
    bars = section_plan.bar_count or 8
    bar_end = bar_start + bars
    cell = composer_ir.motivic_cells[0] if composer_ir.motivic_cells else MotivicCell(intervals=[6, 1, 11])
    developed = develop_motif_cell(cell, "registral_displacement")
    reg = composer_ir.registral_plan.get("return", cell.registral_center + 12)
    events = _melody_from_cell(developed, bars, bar_start, section_id, reg)
    harm = derive_section_harmony(composer_ir.harmonic_field, "primary")
    harmony = [{"symbol": harm[i % len(harm)], "measure": bar_start + i, "duration": 4} for i in range(bars)]
    pl = section_plan.phrase_lengths or [4, 4]
    return CompiledSection(section_id=section_id, role="return", bar_start=bar_start, bar_end=bar_end, melody_events=events, harmony=harmony, phrase_lengths=pl, motif_refs=["m1_disp"], register_hint=reg)


def _compile_generic_section(section_plan: SectionPlan, composer_ir: ComposerIR, section_id: str, bar_start: int) -> CompiledSection:
    bars = section_plan.bar_count or 4
    bar_end = bar_start + bars
    cell = composer_ir.motivic_cells[0] if composer_ir.motivic_cells else MotivicCell(intervals=[6, 1])
    events = _melody_from_cell(cell, bars, bar_start, section_id, cell.registral_center)
    harm = derive_section_harmony(composer_ir.harmonic_field, "primary")
    harmony = [{"symbol": harm[i % len(harm)], "measure": bar_start + i, "duration": 4} for i in range(bars)]
    return CompiledSection(section_id=section_id, role=section_plan.role, bar_start=bar_start, bar_end=bar_end, melody_events=events, harmony=harmony, phrase_lengths=[bars], register_hint=cell.registral_center)


def _melody_from_cell(cell: MotivicCell, bars: int, bar_start: int, section_id: str, reg: int) -> List[Dict]:
    events = []
    pitch = reg
    beat = 0.0
    total_beats = bars * 4
    idx = 0
    while beat < total_beats:
        inc = cell.intervals[idx % len(cell.intervals)]
        pitch = max(36, min(84, pitch + inc))
        measure = bar_start + int(beat // 4)
        events.append({"pitch": pitch, "duration": 1.5, "measure": measure, "beat_position": beat % 4, "section_id": section_id})
        idx += 1
        beat += 1.5
    return events
