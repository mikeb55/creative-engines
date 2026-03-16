"""
Hybrid Section Compiler — Compile sections by calling appropriate engines.
"""

from typing import Any, Dict, List

import sys
import os
_base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _base not in sys.path:
    sys.path.insert(0, _base)
try:
    from shared_composer.engine_registry import get_engine, ensure_engines_loaded
    from hybrid_engine.hybrid_composer_ir import HybridComposerIR
    from hybrid_engine.counterpoint_planner import plan_counterpoint_layout
    from hybrid_engine.counterpoint_generator import build_polyphonic_texture
except ImportError:
    from shared_composer.engine_registry import get_engine, ensure_engines_loaded
    from hybrid_composer_ir import HybridComposerIR
    from counterpoint_planner import plan_counterpoint_layout
    from counterpoint_generator import build_polyphonic_texture


def compile_hybrid_composition(hybrid_ir: HybridComposerIR, input_text: str = "Untitled") -> Dict[str, Any]:
    """Compile hybrid: lead, optional counterline, optional inner voice."""
    ensure_engines_loaded()
    melody_eng = get_engine(hybrid_ir.primary_engine)
    harmony_eng = get_engine(hybrid_ir.harmony_engine)
    ir = melody_eng.generate_ir(input_text, mode="title", seed=hybrid_ir.seed)
    compiled = melody_eng.compile_from_ir(ir)
    if harmony_eng.engine_name != melody_eng.engine_name:
        harm_ir = harmony_eng.generate_ir(input_text, mode="title", seed=hybrid_ir.seed + 1)
        harm_compiled = harmony_eng.compile_from_ir(harm_ir)
        for i, sec in enumerate(compiled.sections):
            if i < len(harm_compiled.sections):
                sec.harmony = harm_compiled.sections[i].harmony
    result = {
        "compiled": compiled,
        "melody_engine": hybrid_ir.primary_engine,
        "harmony_engine": hybrid_ir.harmony_engine,
        "counter_engine": hybrid_ir.counter_engine,
        "rhythm_engine": hybrid_ir.rhythm_engine,
        "ir": ir,
        "counterline_events": [],
        "inner_voice_events": [],
    }
    if hybrid_ir.counter_engine and hybrid_ir.voice_count >= 2:
        layout = plan_counterpoint_layout(hybrid_ir)
        texture = build_polyphonic_texture(compiled.sections, layout)
        result["counterline_events"] = texture.get("counterline", [])
        result["inner_voice_events"] = texture.get("inner_voice", [])
    return result
