"""
Composition Adapter — Convert engine-specific IRs and compiled outputs to shared base types.
"""

from typing import Any

try:
    from .composer_ir_base import ComposerIRBase, PhrasePlanBase, ExportHintsBase, MusicXMLConstraintsBase
    from .compiled_composition_base import CompiledCompositionBase, CompiledSectionBase, MelodyBlueprint, HarmonyBlueprint
except ImportError:
    from composer_ir_base import ComposerIRBase, PhrasePlanBase, ExportHintsBase, MusicXMLConstraintsBase
    from compiled_composition_base import CompiledCompositionBase, CompiledSectionBase, MelodyBlueprint, HarmonyBlueprint


def adapt_ir(engine_ir: Any) -> ComposerIRBase:
    """Convert engine-specific IR to ComposerIRBase."""
    pp = getattr(engine_ir, "phrase_plan", None)
    phrase_plan = PhrasePlanBase(
        phrase_lengths=getattr(pp, "phrase_lengths", [4, 4]) if pp else [4, 4],
        total_bars=getattr(pp, "total_bars", 0) if pp else 0,
        asymmetry_level=getattr(pp, "asymmetry_level", 0.5) if pp else 0.5,
    )
    eh = getattr(engine_ir, "export_hints", None)
    export_hints = ExportHintsBase(
        tempo=getattr(eh, "tempo", 90) if eh else 90,
        key_hint=getattr(eh, "key_hint", "C") if eh else "C",
        part_name=getattr(eh, "part_name", "Melody") if eh else "Melody",
    )
    mc = getattr(engine_ir, "musicxml_constraints", None)
    musicxml_constraints = MusicXMLConstraintsBase(
        divisions=getattr(mc, "divisions", 4) if mc else 4,
        supported_durations=getattr(mc, "supported_durations", ["quarter", "eighth", "half", "whole", "16th"]) if mc else ["quarter", "eighth", "half", "whole", "16th"],
    )
    return ComposerIRBase(
        title=getattr(engine_ir, "title", "Untitled"),
        seed=getattr(engine_ir, "seed", 0),
        tempo_hint=getattr(engine_ir, "tempo_hint", 90),
        meter_plan=getattr(engine_ir, "meter_plan", (4, 4)),
        form_plan=getattr(engine_ir, "form_plan", ""),
        section_order=getattr(engine_ir, "section_order", []),
        phrase_plan=phrase_plan,
        export_hints=export_hints,
        musicxml_constraints=musicxml_constraints,
    )


def adapt_compiled(engine_compiled: Any) -> CompiledCompositionBase:
    """Convert engine-specific compiled output to CompiledCompositionBase."""
    sections = []
    for sec in getattr(engine_compiled, "sections", []):
        sections.append(CompiledSectionBase(
            section_id=getattr(sec, "section_id", ""),
            role=getattr(sec, "role", ""),
            bar_start=getattr(sec, "bar_start", 0),
            bar_end=getattr(sec, "bar_end", 0),
            melody_events=getattr(sec, "melody_events", []),
            harmony=getattr(sec, "harmony", []),
            phrase_lengths=getattr(sec, "phrase_lengths", []),
            motif_refs=getattr(sec, "motif_refs", []),
            register_hint=getattr(sec, "register_hint", 60),
        ))
    melody = getattr(engine_compiled, "melody", None)
    melody_bp = MelodyBlueprint(
        events=getattr(melody, "events", []) if melody else [],
        phrase_boundaries=getattr(melody, "phrase_boundaries", []) if melody else [],
    )
    harmony = getattr(engine_compiled, "harmony", None)
    harmony_bp = HarmonyBlueprint(
        chords=getattr(harmony, "chords", []) if harmony else [],
    )
    return CompiledCompositionBase(
        title=getattr(engine_compiled, "title", "Untitled"),
        sections=sections,
        melody=melody_bp,
        harmony=harmony_bp,
        metadata=getattr(engine_compiled, "metadata", {}),
    )
