"""
Ligeti Texture Example Compositions — Cluster cloud, micropolyphonic density arc, etc.
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
    ("Cluster Cloud Study", 0, "cluster_semitone"),
    ("Micropolyphonic Density Arc", 42, "micropoly_step"),
    ("Suspended Swarm Miniature", 17, "registral_shimmer"),
    ("Asymmetrical Texture Return" , 99, "chromatic_cloud"),
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
