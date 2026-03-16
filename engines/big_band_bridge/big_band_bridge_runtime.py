"""
Big Band Bridge Runtime — Form + Texture → Big Band pipeline.
"""

import os
import sys
from typing import Any, Dict, Optional

_base = os.path.dirname(os.path.abspath(__file__))
_engines = os.path.dirname(_base)
_bb = os.path.join(_engines, "big-band-engine")
_bridge = _base
for p in [_engines, _bb, _bridge]:
    if p not in sys.path:
        sys.path.append(p)

from shared_composer.engine_registry import get_engine, ensure_engines_loaded
from form_texture_bridge import merge_form_and_texture


def _load_bb_compile_and_export():
    """Load section_compiler and musicxml_exporter with big-band-engine first in path."""
    for p in (_bb, _engines, _bridge):
        if p in sys.path:
            sys.path.remove(p)
    sys.path.insert(0, _bridge)
    sys.path.insert(0, _engines)
    sys.path.insert(0, _bb)
    # Clear cached compiled_composition_types so section_compiler gets big-band's
    for k in list(sys.modules.keys()):
        if "compiled_composition_types" in k:
            del sys.modules[k]
    import importlib.util
    spec = importlib.util.spec_from_file_location("bb_section_compiler", os.path.join(_bb, "section_compiler.py"))
    comp = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(comp)
    spec2 = importlib.util.spec_from_file_location("bb_musicxml", os.path.join(_bb, "musicxml_exporter.py"))
    mxml = importlib.util.module_from_spec(spec2)
    spec2.loader.exec_module(mxml)
    return comp.compile_composition_from_ir, mxml.export_composition_to_musicxml


def run_big_band_form_texture_bridge(
    input_text: str,
    form_seed: int = 0,
    texture_seed: int = 0,
    ensemble_seed: int = 0,
) -> Dict[str, Any]:
    """
    Pipeline: generate Shorter form IR, Ligeti texture IR, Big Band IR;
    merge them; build sectional blueprint; export MusicXML.
    Returns: {form_ir, texture_ir, big_band_ir, merged_ir, compiled, musicxml}
    """
    ensure_engines_loaded()
    compile_composition_from_ir, export_composition_to_musicxml = _load_bb_compile_and_export()
    shorter_eng = get_engine("wayne_shorter")
    ligeti_eng = get_engine("ligeti_texture")
    big_band_eng = get_engine("big_band")
    title = (input_text or "Form Texture Bridge").strip() or "Untitled"
    form_ir = shorter_eng.generate_ir(title, mode="title", seed=form_seed)
    texture_ir = ligeti_eng.generate_ir(title, mode="title", seed=texture_seed)
    big_band_ir = big_band_eng.generate_ir(title, mode="title", seed=ensemble_seed)
    merged_ir = merge_form_and_texture(form_ir, texture_ir, big_band_ir)
    compiled = compile_composition_from_ir(merged_ir)
    musicxml = export_composition_to_musicxml(compiled)
    return {
        "form_ir": form_ir,
        "texture_ir": texture_ir,
        "big_band_ir": big_band_ir,
        "merged_ir": merged_ir,
        "compiled": compiled,
        "musicxml": musicxml,
    }
