"""
Stravinsky Pulse Section Compiler — Pulse-cell melody, block harmony.
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


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def compile_composition_from_ir(composer_ir: ComposerIR) -> CompiledComposition:
    """Compile IR to CompiledComposition. Same IR + seed = identical output."""
    r = validate_composer_ir(composer_ir)
    if not r.valid:
        raise ValueError(f"Invalid ComposerIR: {'; '.join(r.errors)}")
    sections = []
    all_events = []
    bar_start = 0
    for role in composer_ir.section_order:
        sp = composer_ir.section_roles.get(role)
        if sp is None:
            sp = SectionPlan(role=role, bar_count=6)
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


def compile_section(sp: SectionPlan, ir: ComposerIR, section_id: str, bar_start: int) -> CompiledSection:
    if sp.role == "primary":
        return _compile_primary(sp, ir, section_id, bar_start)
    if sp.role == "contrast":
        return _compile_contrast(sp, ir, section_id, bar_start)
    if sp.role in ("return", "refrain"):
        return _compile_return(sp, ir, section_id, bar_start)
    return _compile_generic(sp, ir, section_id, bar_start)


def _compile_primary(sp: SectionPlan, ir: ComposerIR, section_id: str, bar_start: int) -> CompiledSection:
    bars = sp.bar_count or 6
    bar_end = bar_start + bars
    cell = ir.motivic_cells[0] if ir.motivic_cells else MotivicCell(intervals=[7, 2, 5])
    reg = ir.registral_plan.get("primary", cell.registral_center)
    events = _melody_from_pulse_cell(cell, bars, bar_start, section_id, reg, ir.seed)
    harm = derive_section_harmony(ir.harmonic_field, "primary")
    harmony = [{"symbol": harm[i % len(harm)], "measure": bar_start + i, "duration": 4} for i in range(bars)]
    pl = sp.phrase_lengths or [3, 3]
    return CompiledSection(section_id=section_id, role="primary", bar_start=bar_start, bar_end=bar_end, melody_events=events, harmony=harmony, phrase_lengths=pl, motif_refs=["m1"], register_hint=reg)


def _compile_contrast(sp: SectionPlan, ir: ComposerIR, section_id: str, bar_start: int) -> CompiledSection:
    bars = sp.bar_count or 4
    bar_end = bar_start + bars
    cell = ir.motivic_cells[1] if len(ir.motivic_cells) > 1 else (ir.motivic_cells[0] if ir.motivic_cells else MotivicCell(intervals=[7, 2, 5]))
    developed = develop_motif_cell(cell, "accent_shift")
    reg = ir.registral_plan.get("contrast", cell.registral_center + 7)
    events = _melody_from_pulse_cell(developed, bars, bar_start, section_id, reg, ir.seed + 1)
    harm = derive_section_harmony(ir.harmonic_field, "contrast")
    harmony = [{"symbol": harm[i % len(harm)], "measure": bar_start + i, "duration": 4} for i in range(bars)]
    pl = sp.phrase_lengths or [2, 2]
    return CompiledSection(section_id=section_id, role="contrast", bar_start=bar_start, bar_end=bar_end, melody_events=events, harmony=harmony, phrase_lengths=pl, motif_refs=["m2"], register_hint=reg)


def _compile_return(sp: SectionPlan, ir: ComposerIR, section_id: str, bar_start: int) -> CompiledSection:
    bars = sp.bar_count or 6
    bar_end = bar_start + bars
    cell = ir.motivic_cells[0] if ir.motivic_cells else MotivicCell(intervals=[7, 2, 5])
    developed = develop_motif_cell(cell, "pulse_repeat")
    reg = ir.registral_plan.get("return", cell.registral_center)
    events = _melody_from_pulse_cell(developed, bars, bar_start, section_id, reg, ir.seed + 2)
    harm = derive_section_harmony(ir.harmonic_field, "return")
    harmony = [{"symbol": harm[i % len(harm)], "measure": bar_start + i, "duration": 4} for i in range(bars)]
    pl = sp.phrase_lengths or [3, 3]
    return CompiledSection(section_id=section_id, role="return", bar_start=bar_start, bar_end=bar_end, melody_events=events, harmony=harmony, phrase_lengths=pl, motif_refs=["m1"], register_hint=reg)


def _compile_generic(sp: SectionPlan, ir: ComposerIR, section_id: str, bar_start: int) -> CompiledSection:
    bars = sp.bar_count or 4
    bar_end = bar_start + bars
    cell = ir.motivic_cells[0] if ir.motivic_cells else MotivicCell(intervals=[7, 2, 5])
    events = _melody_from_pulse_cell(cell, bars, bar_start, section_id, cell.registral_center, ir.seed)
    harm = derive_section_harmony(ir.harmonic_field, "primary")
    harmony = [{"symbol": harm[i % len(harm)], "measure": bar_start + i, "duration": 4} for i in range(bars)]
    return CompiledSection(section_id=section_id, role=sp.role, bar_start=bar_start, bar_end=bar_end, melody_events=events, harmony=harmony, phrase_lengths=[bars], register_hint=cell.registral_center)


def _melody_from_pulse_cell(cell: MotivicCell, bars: int, bar_start: int, section_id: str, reg: int, seed: int) -> List[Dict]:
    """Pulse-cell melody: dry, block-based, accent-aware."""
    events = []
    pitch = reg
    total_beats = bars * 4
    h = _hash_int(seed)
    note_dur = 1.0
    beat = 0.0
    ints = cell.intervals
    while beat < total_beats:
        for inc in ints:
            if beat >= total_beats:
                break
            pitch = max(40, min(84, pitch + inc))
            measure = bar_start + int(beat // 4)
            events.append({"pitch": pitch, "duration": note_dur, "measure": measure, "beat_position": beat % 4, "section_id": section_id})
            beat += note_dur
        beat += 0.5
    return events
