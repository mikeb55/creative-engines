"""
Andrew Hill Engine Adapter — ComposerEngine interface.
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


class AndrewHillEngine(ComposerEngine):
    engine_name = "andrew_hill"
    supported_profiles = ["angular", "wide_angular", "cluster_adjacent"]
    supported_forms = ["irregular_5_7_5", "asymmetrical_7_9", "sectional_contrast", "floating_odd"]

    def generate_ir(self, input_text: str, mode: str = "title", seed: int = 0, **kwargs) -> Any:
        if mode == "premise":
            return generate_composer_ir_from_premise(input_text or "Untitled", seed, kwargs.get("profile", "angular"))
        return generate_composer_ir_from_title(input_text or "Untitled", seed, kwargs.get("profile", "angular"))

    def compile_from_ir(self, ir: Any) -> Any:
        return compile_composition_from_ir(ir)

    def export_musicxml(self, compiled: Any) -> str:
        return export_composition_to_musicxml(compiled)

    def validate_ir(self, ir: Any) -> Any:
        return validate_composer_ir(ir)


register_engine("andrew_hill", AndrewHillEngine)
