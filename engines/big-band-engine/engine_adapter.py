"""
Big Band Engine Adapter — ComposerEngine interface.
"""

import importlib.util
import os
from typing import Any, List

_bb_dir = os.path.dirname(os.path.abspath(__file__))


def _load_bb_module(name: str):
    """Load big-band-engine module by path to avoid sys.modules collision with other engines."""
    path = os.path.join(_bb_dir, name + ".py")
    spec = importlib.util.spec_from_file_location("big_band_" + name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_bb_gen = _load_bb_module("generator")
_bb_comp = _load_bb_module("section_compiler")
_bb_mxml = _load_bb_module("musicxml_exporter")
_bb_val = _load_bb_module("composer_ir_validator")

generate_composer_ir_from_title = _bb_gen.generate_composer_ir_from_title
generate_composer_ir_from_premise = _bb_gen.generate_composer_ir_from_premise
compile_composition_from_ir = _bb_comp.compile_composition_from_ir
export_composition_to_musicxml = _bb_mxml.export_composition_to_musicxml
validate_composer_ir = _bb_val.validate_composer_ir

try:
    from ..shared_composer.composer_engine_interface import ComposerEngine
    from ..shared_composer.engine_registry import register_engine
except ImportError:
    import sys
    import os
    _base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if _base not in sys.path:
        sys.path.insert(0, _base)
    from shared_composer.composer_engine_interface import ComposerEngine
    from shared_composer.engine_registry import register_engine


class BigBandEngine(ComposerEngine):
    engine_name = "big_band"
    supported_profiles = ["brass_punch", "sax_counterline", "shout_leap", "sectional_unison", "layered_ensemble_motion"]
    supported_forms = ["chart_arc", "modular_big_band_form", "asymmetrical_shout_form", "sectional_wave_form", "episode_return_chart", "narrative_big_band_form"]

    def generate_ir(self, input_text: str, mode: str = "title", seed: int = 0, **kwargs) -> Any:
        profile = kwargs.get("profile", "brass_punch")
        form_profile = kwargs.get("form_profile")
        if mode == "premise":
            return generate_composer_ir_from_premise(input_text or "Untitled", seed, profile, form_profile=form_profile)
        return generate_composer_ir_from_title(input_text or "Untitled", seed, profile, form_profile=form_profile)

    def compile_from_ir(self, ir: Any) -> Any:
        return compile_composition_from_ir(ir)

    def export_musicxml(self, compiled: Any) -> str:
        return export_composition_to_musicxml(compiled)

    def validate_ir(self, ir: Any) -> Any:
        return validate_composer_ir(ir)


register_engine("big_band", BigBandEngine)
