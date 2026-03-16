"""
Big Band Section Compiler — Layered output: lead melody, sax support, brass, counterline, rhythm plan.
"""

from typing import Any, Dict, List

try:
    from .composer_ir import ComposerIR, SectionPlan, MotivicCell
    from .composer_ir_validator import validate_composer_ir
    from .compiled_composition_types import CompiledComposition, CompiledSection, CompiledMelodyBlueprint, CompiledHarmonyPlan, CompiledRhythmicPlan
    from .harmonic_fields import derive_section_harmony
    from .motif_development import develop_motif_cell
except ImportError:
    from composer_ir import ComposerIR, SectionPlan, MotivicCell
    from composer_ir_validator import validate_composer_ir
    from compiled_composition_types import CompiledComposition, CompiledSection, CompiledMelodyBlueprint, CompiledHarmonyPlan, CompiledRhythmicPlan
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
    rhythmic_plan = CompiledRhythmicPlan(
        section_plans={s.section_id: s.rhythm_section_plan for s in sections},
        global_style="comp",
    )
    key_hint = composer_ir.export_hints.key_hint if composer_ir.export_hints else "Bb"
    return CompiledComposition(
        title=composer_ir.title,
        sections=sections,
        melody=melody,
        harmony=harmony,
        rhythmic_plan=rhythmic_plan,
        metadata={"seed": composer_ir.seed, "form": composer_ir.form_plan, "tempo": composer_ir.tempo_hint, "key_hint": key_hint},
    )


def compile_section(section_plan: SectionPlan, composer_ir: ComposerIR, section_id: str, bar_start: int) -> CompiledSection:
    if section_plan.role == "primary":
        return compile_primary_theme(section_plan, composer_ir, section_id, bar_start)
    if section_plan.role in ("contrast", "development"):
        return compile_development_section(section_plan, composer_ir, section_id, bar_start)
    if section_plan.role == "shout":
        return compile_shout_section(section_plan, composer_ir, section_id, bar_start)
    if section_plan.role in ("return", "coda"):
        return compile_return_section(section_plan, composer_ir, section_id, bar_start)
    return _compile_generic_section(section_plan, composer_ir, section_id, bar_start)


def compile_primary_theme(section_plan: SectionPlan, composer_ir: ComposerIR, section_id: str, bar_start: int) -> CompiledSection:
    bars = section_plan.bar_count or 8
    bar_end = bar_start + bars
    cell = composer_ir.motivic_cells[0] if composer_ir.motivic_cells else MotivicCell(intervals=[5, 7, -4])
    reg = composer_ir.registral_plan.get("primary", cell.registral_center)
    events = _melody_from_sectional(cell, bars, bar_start, section_id, reg, composer_ir.seed)
    harm = derive_section_harmony(composer_ir.harmonic_field, "primary")
    harmony = [{"symbol": harm[i % len(harm)], "measure": bar_start + i, "duration": 4} for i in range(bars)]
    pl = section_plan.phrase_lengths or [4, 4]
    sax_ev = _sax_support_events(cell, bars, bar_start, composer_ir.seed)
    return CompiledSection(
        section_id=section_id, role="primary", bar_start=bar_start, bar_end=bar_end,
        melody_events=events, harmony=harmony, phrase_lengths=pl, motif_refs=["m1"],
        register_hint=reg, sax_support_events=sax_ev,
        rhythm_section_plan={"style": "comp", "density": 0.6},
    )


def compile_development_section(section_plan: SectionPlan, composer_ir: ComposerIR, section_id: str, bar_start: int) -> CompiledSection:
    """Compile development/contrast section: sax fragmentation, brass punches, layered density."""
    bars = section_plan.bar_count or 6
    bar_end = bar_start + bars
    cell = composer_ir.motivic_cells[1] if len(composer_ir.motivic_cells) > 1 else (composer_ir.motivic_cells[0] if composer_ir.motivic_cells else MotivicCell(intervals=[5, 7]))
    developed = develop_motif_cell(cell, "sax_fragmentation")
    reg = composer_ir.registral_plan.get("contrast", cell.registral_center - 5)
    events = _melody_from_sectional(developed, bars, bar_start, section_id, reg, composer_ir.seed + 1)
    harm = derive_section_harmony(composer_ir.harmonic_field, "contrast")
    harmony = [{"symbol": harm[i % len(harm)], "measure": bar_start + i, "duration": 4} for i in range(bars)]
    pl = section_plan.phrase_lengths or [3, 3]
    brass_ev = _brass_punch_events(bars, bar_start, composer_ir.seed + 1)
    return CompiledSection(
        section_id=section_id, role="contrast", bar_start=bar_start, bar_end=bar_end,
        melody_events=events, harmony=harmony, phrase_lengths=pl, motif_refs=["m2"],
        register_hint=reg, brass_support_events=brass_ev,
        rhythm_section_plan={"style": "sparse", "density": 0.4},
    )


def compile_shout_section(section_plan: SectionPlan, composer_ir: ComposerIR, section_id: str, bar_start: int) -> CompiledSection:
    bars = section_plan.bar_count or 8
    bar_end = bar_start + bars
    cell = composer_ir.motivic_cells[0] if composer_ir.motivic_cells else MotivicCell(intervals=[5, 7, 12])
    developed = develop_motif_cell(cell, "brass_punch_expansion")
    reg = composer_ir.registral_plan.get("shout", cell.registral_center + 12)
    events = _melody_from_sectional(developed, bars, bar_start, section_id, reg, composer_ir.seed + 2)
    harm = derive_section_harmony(composer_ir.harmonic_field, "shout")
    harmony = [{"symbol": harm[i % len(harm)], "measure": bar_start + i, "duration": 4} for i in range(bars)]
    brass_ev = _brass_punch_events(bars, bar_start, composer_ir.seed + 2)
    return CompiledSection(
        section_id=section_id, role="shout", bar_start=bar_start, bar_end=bar_end,
        melody_events=events, harmony=harmony, phrase_lengths=[4, 4], motif_refs=["m1_punch"],
        register_hint=reg, brass_support_events=brass_ev,
        rhythm_section_plan={"style": "shout", "density": 0.9},
    )


def compile_return_section(section_plan: SectionPlan, composer_ir: ComposerIR, section_id: str, bar_start: int) -> CompiledSection:
    bars = section_plan.bar_count or 8
    bar_end = bar_start + bars
    cell = composer_ir.motivic_cells[0] if composer_ir.motivic_cells else MotivicCell(intervals=[5, 7, -4])
    developed = develop_motif_cell(cell, "sectional_transfer")
    reg = composer_ir.registral_plan.get("return", cell.registral_center + 7)
    events = _melody_from_sectional(developed, bars, bar_start, section_id, reg, composer_ir.seed + 3)
    harm = derive_section_harmony(composer_ir.harmonic_field, "primary")
    harmony = [{"symbol": harm[i % len(harm)], "measure": bar_start + i, "duration": 4} for i in range(bars)]
    return CompiledSection(
        section_id=section_id, role="return", bar_start=bar_start, bar_end=bar_end,
        melody_events=events, harmony=harmony, phrase_lengths=[4, 4], motif_refs=["m1_return"],
        register_hint=reg,
        rhythm_section_plan={"style": "comp", "density": 0.7},
    )


def _compile_generic_section(section_plan: SectionPlan, composer_ir: ComposerIR, section_id: str, bar_start: int) -> CompiledSection:
    bars = section_plan.bar_count or 6
    bar_end = bar_start + bars
    cell = composer_ir.motivic_cells[0] if composer_ir.motivic_cells else MotivicCell(intervals=[5, 7])
    events = _melody_from_sectional(cell, bars, bar_start, section_id, cell.registral_center, composer_ir.seed)
    harm = derive_section_harmony(composer_ir.harmonic_field, "primary")
    harmony = [{"symbol": harm[i % len(harm)], "measure": bar_start + i, "duration": 4} for i in range(bars)]
    return CompiledSection(section_id=section_id, role=section_plan.role, bar_start=bar_start, bar_end=bar_end,
        melody_events=events, harmony=harmony, phrase_lengths=[bars], register_hint=cell.registral_center)


def _melody_from_sectional(cell: MotivicCell, bars: int, bar_start: int, section_id: str, reg: int, seed: int) -> List[Dict]:
    """Sectional melody: layered figures, ensemble motion."""
    events = []
    pitch = reg
    total_beats = bars * 4
    h = _hash_int(seed)
    beat = 0.0
    idx = 0
    while beat < total_beats:
        for inc in cell.intervals:
            if beat >= total_beats:
                break
            pitch = max(40, min(88, pitch + inc))
            measure = bar_start + int(beat // 4)
            dur = 0.5 + (h % 2) * 0.5
            events.append({
                "pitch": pitch,
                "duration": dur,
                "measure": measure,
                "beat_position": beat % 4,
                "section_id": section_id,
            })
            beat += dur
            idx += 1
        beat += 0.5 + (h % 2) * 0.5
    return events


def _sax_support_events(cell: MotivicCell, bars: int, bar_start: int, seed: int) -> List[Dict]:
    """Sax section support: counterline hints."""
    events = []
    h = _hash_int(seed, 100)
    for b in range(bars):
        if h % 3 == 0:
            pitch = 55 + (h % 12)
            events.append({"pitch": pitch, "measure": bar_start + b, "beat_position": 2.0, "duration": 1.0})
        h = (h * 31 + 1) & 0xFFFFFFFF
    return events


def _brass_punch_events(bars: int, bar_start: int, seed: int) -> List[Dict]:
    """Brass punch hits."""
    events = []
    h = _hash_int(seed, 200)
    for b in range(bars):
        if h % 2 == 0:
            pitch = 60 + (h % 12)
            events.append({"pitch": pitch, "measure": bar_start + b, "beat_position": 0.0, "duration": 0.5})
        h = (h * 31 + 1) & 0xFFFFFFFF
    return events
