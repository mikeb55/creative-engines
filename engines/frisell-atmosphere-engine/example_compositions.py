"""
Frisell Atmosphere Example Compositions — Predefined atmosphere studies.
"""

from typing import List

try:
    from .composer_ir import ComposerIR
    from .generator import generate_composer_ir_from_title
    from .section_compiler import compile_composition_from_ir
    from .compiled_composition_types import CompiledComposition
except ImportError:
    from composer_ir import ComposerIR
    from generator import generate_composer_ir_from_title
    from section_compiler import compile_composition_from_ir
    from compiled_composition_types import CompiledComposition

EXAMPLES = [
    ("Open Americana Miniature", 0, "open_fifths"),
    ("Ambient Modal Line", 42, "ambient_fourths"),
    ("Pedal-Tone Chamber Theme", 17, "pedal_melody"),
    ("Floating Asymmetrical Refrain", 99, "wistful_leaps"),
]


def get_example_irs() -> List[ComposerIR]:
    """Return IRs for all example compositions."""
    return [
        generate_composer_ir_from_title(title, seed, profile)
        for title, seed, profile in EXAMPLES
    ]


def compile_examples() -> List[CompiledComposition]:
    """Compile all examples; returns list of CompiledComposition."""
    return [compile_composition_from_ir(ir) for ir in get_example_irs()]
