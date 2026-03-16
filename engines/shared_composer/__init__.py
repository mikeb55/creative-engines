"""
Shared Composer — Interface layer for composer engines.
"""

from .composer_engine_interface import ComposerEngine
from .composer_ir_base import ComposerIRBase, PhrasePlanBase, ExportHintsBase, MusicXMLConstraintsBase
from .compiled_composition_base import CompiledCompositionBase, CompiledSectionBase, MelodyBlueprint, HarmonyBlueprint
from .engine_registry import register_engine, get_engine, list_engines, ensure_engines_loaded
from .composition_adapter import adapt_ir, adapt_compiled
