"""
Wheeler Lyric Example Compositions — Predefined lyrical studies.
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
    ("Long-Arc ECM Melody", 0, "lyrical_wide"),
    ("Suspended Chamber Ballad", 42, "suspended_fourths"),
    ("Asymmetrical Lyrical Head", 17, "sixth_ninth_arc"),
    ("Bridge-Lift Return Composition", 99, "wistful_minor_major"),
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
