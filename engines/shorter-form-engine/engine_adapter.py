"""
Shorter Form Engine Adapter — ComposerEngine interface.
"""

from typing import Any

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
    import os
    _base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    import sys
    if _base not in sys.path:
        sys.path.insert(0, _base)
    from shared_composer.composer_engine_interface import ComposerEngine
    from shared_composer.engine_registry import register_engine


class ShorterFormEngine(ComposerEngine):
    engine_name = "shorter_form"
    supported_profiles = ["narrative_arc_form", "modular_shorter_form", "asymmetric_cycle_form", "transformed_return_form", "episode_variation_form"]
    supported_forms = supported_profiles

    def generate_ir(self, input_text: str, mode: str = "title", seed: int = 0, **kwargs) -> Any:
        title = input_text or "Untitled"
        if mode == "premise":
            premise = kwargs if isinstance(kwargs, dict) else {"form_profile": kwargs.get("profile", "narrative_arc_form")}
            return generate_composer_ir_from_premise(title, premise, seed)
        return generate_composer_ir_from_title(title, seed)

    def compile_from_ir(self, ir: Any) -> Any:
        return compile_composition_from_ir(ir)

    def export_musicxml(self, compiled: Any) -> str:
        return export_composition_to_musicxml(compiled)

    def validate_ir(self, ir: Any) -> Any:
        return validate_composer_ir(ir)


register_engine("shorter_form", ShorterFormEngine)
