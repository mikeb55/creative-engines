"""
Slonimsky Harmonic Engine Adapter — ComposerEngine interface.
"""

from typing import Any, List

try:
    from .slonimsky_harmonic_engine import generate_ir, compile_from_ir, validate_ir
except ImportError:
    from slonimsky_harmonic_engine import generate_ir, compile_from_ir, validate_ir

# Use bartok's MusicXML exporter (shared format)
import os
import sys
_bartok = os.path.join(os.path.dirname(os.path.dirname(__file__)), "bartok-night-engine")
if _bartok not in sys.path:
    sys.path.insert(0, _bartok)
from musicxml_exporter import export_composition_to_musicxml

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


class SlonimskyHarmonicEngine(ComposerEngine):
    engine_name = "slonimsky_harmonic"
    supported_profiles = ["slonimsky_cycle", "interval_cycle", "chromatic_axis"]
    supported_forms = ["slonimsky_cycle", "exotic_movement"]

    def generate_ir(self, input_text: str, mode: str = "title", seed: int = 0, **kwargs) -> Any:
        return generate_ir(input_text, mode, seed, **kwargs)

    def compile_from_ir(self, ir: Any) -> Any:
        return compile_from_ir(ir)

    def export_musicxml(self, compiled: Any) -> str:
        return export_composition_to_musicxml(compiled)

    def validate_ir(self, ir: Any) -> Any:
        return validate_ir(ir)


register_engine("slonimsky_harmonic", SlonimskyHarmonicEngine)
