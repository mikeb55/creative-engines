"""
BH Example Compositions — Bebop head, blues-derived, minor conversion, rhythm changes.
"""

from typing import List

try:
    from .generator import generate_composer_ir_from_title, generate_composer_ir_from_premise
    from .section_compiler import compile_composition_from_ir
except ImportError:
    from generator import generate_composer_ir_from_title, generate_composer_ir_from_premise
    from section_compiler import compile_composition_from_ir


def example_bebop_head():
    return generate_composer_ir_from_title("Bebop Head", seed=42, profile="bebop_step")


def example_blues_derived():
    return generate_composer_ir_from_premise("Blues-derived head in F", seed=17, profile="enclosure_heavy")


def example_minor_conversion():
    return generate_composer_ir_from_title("Minor Conversion", seed=99, profile="scalar_embellish")


def example_rhythm_changes():
    return generate_composer_ir_from_title("Rhythm Changes Variant", seed=333, profile="bebop_step")


def all_examples():
    return [
        example_bebop_head(),
        example_blues_derived(),
        example_minor_conversion(),
        example_rhythm_changes(),
    ]


def compile_all_examples():
    return [compile_composition_from_ir(ir) for ir in all_examples()]


if __name__ == "__main__":
    for ir in all_examples():
        comp = compile_composition_from_ir(ir)
        print(f"{ir.title}: {len(comp.sections)} sections, {sum(len(s.melody_events) for s in comp.sections)} melody events")
