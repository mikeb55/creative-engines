"""
Scofield Holland Example Compositions — Chromatic groove, blues-modern, bass-aware.
"""

from .generator import generate_composer_ir_from_title
from .section_compiler import compile_composition_from_ir

EXAMPLES = [
    ("Chromatic Groove Head", "chromatic_riff", 100),
    ("Blues-Modern Riff Piece", "blues_modern", 200),
    ("Bass-Aware Asymmetrical Theme", "groove_cell", 300),
    ("Vamp-Bridge-Return Tune", "angular_funk", 400),
]


def get_example_composition(index: int = 0):
    """Return compiled composition for example at index."""
    title, profile, seed = EXAMPLES[index % len(EXAMPLES)]
    ir = generate_composer_ir_from_title(title, seed, profile)
    return compile_composition_from_ir(ir)
