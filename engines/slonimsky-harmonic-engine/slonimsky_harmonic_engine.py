"""
Slonimsky Harmonic Engine — Stub: simple harmonic pattern, valid Composition.
Intervallic symmetry, exotic movement. Placeholder until full implementation.
"""

import os
import sys
from dataclasses import dataclass, field
from typing import Any, Dict, List

# Ensure bartok-night-engine is on path for shared types
_base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_bartok = os.path.join(_base, "bartok-night-engine")
if _base not in sys.path:
    sys.path.insert(0, _base)
if _bartok not in sys.path:
    sys.path.insert(0, _bartok)

from composer_ir import (
    ComposerIR, MotivicCell, IntervalLanguage, HarmonicField,
    SectionPlan, ExportHints,
)
from compiled_composition_types import (
    CompiledComposition, CompiledSection, CompiledMelodyBlueprint, CompiledHarmonyPlan,
)
from musicxml_exporter import export_composition_to_musicxml


def _hash_int(seed: int, extra: int = 0) -> int:
    return (seed * 31 + extra) & 0xFFFFFFFF


def generate_ir(input_text: str, mode: str = "title", seed: int = 0, **kwargs) -> ComposerIR:
    """Generate minimal ComposerIR: Slonimsky-style intervallic pattern."""
    title = (input_text or "Untitled").strip() or "Slonimsky Study"
    h = _hash_int(seed)
    # Intervallic cycles: 1, 6, 11 (chromatic, tritone, semitone)
    intervals = [1, 6, 11, 5, 7][(h >> 2) % 5:(h >> 2) % 5 + 3]
    if h % 2 == 0:
        intervals = [-x for x in intervals]
    cell = MotivicCell(intervals=intervals, contour="cycle", registral_center=60 + (h % 12))
    il = IntervalLanguage(primary_intervals=intervals, tension_profile="slonimsky_cycle")
    hf = HarmonicField(centers=["C", "F#", "G"], motion_type="interval_cycle", chord_types=["maj7", "7", "sus4"])
    section_roles = {
        "primary": SectionPlan(role="primary", bar_count=8, phrase_lengths=[4, 4]),
        "contrast": SectionPlan(role="contrast", bar_count=6, phrase_lengths=[3, 3]),
        "return": SectionPlan(role="return", bar_count=6, phrase_lengths=[3, 3]),
    }
    return ComposerIR(
        title=title,
        seed=seed,
        tempo_hint=72,
        form_plan="slonimsky_cycle",
        section_order=["primary", "contrast", "return"],
        section_roles=section_roles,
        motivic_cells=[cell],
        interval_language=il,
        harmonic_field=hf,
        registral_plan={"primary": cell.registral_center, "contrast": cell.registral_center + 7, "return": cell.registral_center},
        export_hints=ExportHints(tempo=72, key_hint="C"),
    )


def compile_from_ir(ir: ComposerIR) -> CompiledComposition:
    """Compile IR to minimal CompiledComposition."""
    events = []
    bar = 0
    for role in ir.section_order:
        sp = ir.section_roles.get(role)
        bars = sp.bar_count if sp else 6
        reg = ir.registral_plan.get(role, 60)
        cell = ir.motivic_cells[0] if ir.motivic_cells else MotivicCell(intervals=[5, 7])
        for b in range(bars):
            for i, iv in enumerate(cell.intervals[:4]):
                beat = i * 1.0
                pitch = reg + (iv * (1 if i % 2 == 0 else -1))
                pitch = max(36, min(84, pitch))
                events.append({
                    "measure": bar + b,
                    "beat_position": beat,
                    "duration": 1.0,
                    "pitch": pitch,
                })
        bar += bars
    sections = []
    bar_start = 0
    for role in ir.section_order:
        sp = ir.section_roles.get(role)
        bars = sp.bar_count if sp else 6
        sec_events = [e for e in events if bar_start <= e["measure"] < bar_start + bars]
        harm = [{"symbol": "Cmaj7", "measure": bar_start + i, "duration": 4} for i in range(bars)]
        sections.append(CompiledSection(
            section_id=role,
            role=role,
            bar_start=bar_start,
            bar_end=bar_start + bars,
            melody_events=sec_events,
            harmony=harm,
            phrase_lengths=[4, 4],
            register_hint=60,
        ))
        bar_start += bars
    return CompiledComposition(
        title=ir.title,
        sections=sections,
        melody=CompiledMelodyBlueprint(events=events),
        harmony=CompiledHarmonyPlan(chords=[{"symbol": "Cmaj7", "measure": i, "duration": 4} for i in range(bar_start)]),
        metadata={"seed": ir.seed, "key_hint": "C", "tempo": 72},
    )


def validate_ir(ir: ComposerIR) -> Any:
    """Validate IR. Returns object with valid, errors, warnings."""
    @dataclass
    class Result:
        valid: bool
        errors: List[str]
        warnings: List[str]
    errs = []
    if not ir.title:
        errs.append("title required")
    if not ir.motivic_cells:
        errs.append("at least one motivic cell required")
    return Result(valid=len(errs) == 0, errors=errs, warnings=[])
