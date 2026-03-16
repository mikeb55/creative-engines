"""
Monk Example Compositions — Blues-inflected head, angular motif, rhythmic displacement, quirky 16-bar.
"""

from typing import List

try:
    from .generator import generate_composer_ir_from_title, generate_composer_ir_from_premise
    from .section_compiler import compile_composition_from_ir
except ImportError:
    from generator import generate_composer_ir_from_title, generate_composer_ir_from_premise
    from section_compiler import compile_composition_from_ir


def example_blues_inflected_head():
    return generate_composer_ir_from_title("Blues-Inflected Head", seed=42, profile="angular")


def example_angular_motif_piece():
    return generate_composer_ir_from_premise("Angular motif piece with rhythmic displacement", seed=17, profile="repeated_cell")


def example_rhythmic_displacement_theme():
    return generate_composer_ir_from_title("Rhythmic Displacement Theme", seed=99, profile="leap_m2")


def example_quirky_16_bar():
    return generate_composer_ir_from_title("Quirky 16-Bar Tune", seed=333, profile="angular")


def all_examples():
    return [
        example_blues_inflected_head(),
        example_angular_motif_piece(),
        example_rhythmic_displacement_theme(),
        example_quirky_16_bar(),
    ]


def compile_all_examples():
    return [compile_composition_from_ir(ir) for ir in all_examples()]


if __name__ == "__main__":
    for ir in all_examples():
        comp = compile_composition_from_ir(ir)
        print(f"{ir.title}: {len(comp.sections)} sections, {sum(len(s.melody_events) for s in comp.sections)} melody events")
