"""
Stravinsky Pulse Example Compositions.
"""

try:
    from .generator import generate_composer_ir_from_title
    from .section_compiler import compile_composition_from_ir
except ImportError:
    from generator import generate_composer_ir_from_title
    from section_compiler import compile_composition_from_ir

EXAMPLES = [
    ("Pulse Block Study", "pulse_fifth", 100),
    ("Accent Displacement Miniature", "sharp_second", 200),
    ("Asymmetrical Ostinato Piece", "block_fourth", 300),
    ("Stark Sectional Refrain", "dry_leap_cell", 400),
]


def get_example_composition(index: int = 0):
    """Return compiled composition for example at index."""
    title, profile, seed = EXAMPLES[index % len(EXAMPLES)]
    ir = generate_composer_ir_from_title(title, seed, profile)
    return compile_composition_from_ir(ir)
