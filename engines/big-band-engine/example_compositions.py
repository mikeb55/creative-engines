"""
Big Band Example Compositions — Sectional opener, modern chart, shout study, layered arc.
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
    ("Sectional Opener", 0, "brass_punch"),
    ("Modern Chart Theme", 42, "sax_counterline"),
    ("Asymmetrical Shout Study", 17, "shout_leap"),
    ("Layered Ensemble Arc", 99, "layered_ensemble_motion"),
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
