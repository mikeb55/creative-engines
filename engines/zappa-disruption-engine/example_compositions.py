"""
Zappa Disruption Example Compositions.
"""

try:
    from .generator import generate_composer_ir_from_title
    from .section_compiler import compile_composition_from_ir
except ImportError:
    from generator import generate_composer_ir_from_title
    from section_compiler import compile_composition_from_ir

EXAMPLES = [
    ("Interruption Collage", "jagged_cut", 100),
    ("False-Return Miniature", "chromatic_burst", 200),
    ("Asymmetrical Disruption Theme", "disruption_cell", 300),
    ("Abrupt Modal Cut Piece", "satirical_leap", 400),
]


def get_example_composition(index: int = 0):
    title, profile, seed = EXAMPLES[index % len(EXAMPLES)]
    ir = generate_composer_ir_from_title(title, seed, profile)
    return compile_composition_from_ir(ir)
