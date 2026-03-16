"""
Songwriting Engine Runtime — creative-engines layer.

Consumes rule package from creative-rule-engines (sibling repo).
Generates complete song candidates with melody, lyrics, harmony, hooks.
"""

try:
    from .songwriting_engine_runtime import load_rule_package, generate_song, export_to_musicxml
except ImportError:
    from songwriting_engine_runtime import load_rule_package, generate_song, export_to_musicxml

__all__ = ["load_rule_package", "generate_song", "export_to_musicxml"]
