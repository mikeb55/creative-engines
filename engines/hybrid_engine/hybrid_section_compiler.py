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
except ImportError:
    from shared_composer.engine_registry import get_engine, ensure_engines_loaded
    from hybrid_composer_ir import HybridComposerIR


def compile_hybrid_composition(hybrid_ir: HybridComposerIR, input_text: str = "Untitled") -> Dict[str, Any]:
    """Compile hybrid by delegating: melody→primary, harmony→harmony, counter→counter, rhythm→rhythm."""
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
    return {
        "compiled": compiled,
        "melody_engine": hybrid_ir.primary_engine,
        "harmony_engine": hybrid_ir.harmony_engine,
        "ir": ir,
    }
