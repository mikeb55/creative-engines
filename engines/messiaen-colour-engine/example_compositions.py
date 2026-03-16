"""
Messiaen Colour Example Compositions.
"""

try:
    from .generator import generate_composer_ir_from_title
    from .section_compiler import compile_composition_from_ir
except ImportError:
    from generator import generate_composer_ir_from_title
    from section_compiler import compile_composition_from_ir

EXAMPLES = [
    ("Mode-2 Colour Panel", "birdsong_fragment", 100),
    ("Birdsong Fragment Miniature", "luminous_fourths", 200),
    ("Ecstatic Asymmetrical Arc", "ecstatic_leaps", 300),
    ("Static Centre with Transformed Return", "mode_coloured_seconds", 400),
]


def get_example_composition(index: int = 0):
    title, profile, seed = EXAMPLES[index % len(EXAMPLES)]
    ir = generate_composer_ir_from_title(title, seed, profile)
    return compile_composition_from_ir(ir)
