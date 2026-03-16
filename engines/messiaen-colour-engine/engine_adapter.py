"""
Messiaen Colour Engine Adapter — ComposerEngine interface.
"""

from typing import Any, List

try:
    from .generator import generate_composer_ir_from_title, generate_composer_ir_from_premise
    from .section_compiler import compile_composition_from_ir
    from .musicxml_exporter import export_composition_to_musicxml
    from .composer_ir_validator import validate_composer_ir
except ImportError:
    from generator import generate_composer_ir_from_title, generate_composer_ir_from_premise
    from section_compiler import compile_composition_from_ir
    from musicxml_exporter import export_composition_to_musicxml
    from composer_ir_validator import validate_composer_ir

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


class MessiaenColourEngine(ComposerEngine):
    engine_name = "messiaen_colour"
    supported_profiles = ["birdsong_fragment", "luminous_fourths", "mode_coloured_seconds", "ecstatic_leaps", "chromatic_colour_cluster"]
    supported_forms = ["colour_panels", "ecstatic_arc", "asymmetrical_radiance", "birdsong_interruption_form", "static_center_transformed_return"]

    def generate_ir(self, input_text: str, mode: str = "title", seed: int = 0, **kwargs) -> Any:
        if mode == "premise":
            return generate_composer_ir_from_premise(input_text or "Untitled", seed, kwargs.get("profile", "birdsong_fragment"))
        return generate_composer_ir_from_title(input_text or "Untitled", seed, kwargs.get("profile", "birdsong_fragment"))

    def compile_from_ir(self, ir: Any) -> Any:
        return compile_composition_from_ir(ir)

    def export_musicxml(self, compiled: Any) -> str:
        return export_composition_to_musicxml(compiled)

    def validate_ir(self, ir: Any) -> Any:
        return validate_composer_ir(ir)


register_engine("messiaen_colour", MessiaenColourEngine)
