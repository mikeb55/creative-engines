"""
Hill Example Compositions — Angular modern head, cluster harmony, pedal center, asymmetrical theme.
"""

from typing import List

try:
    from .generator import generate_composer_ir_from_title, generate_composer_ir_from_premise
    from .section_compiler import compile_composition_from_ir
except ImportError:
    from generator import generate_composer_ir_from_title, generate_composer_ir_from_premise
    from section_compiler import compile_composition_from_ir


def example_angular_modern_head():
    return generate_composer_ir_from_title("Angular Modern Head", seed=42, profile="angular")


def example_cluster_harmony():
    return generate_composer_ir_from_premise("Cluster harmony piece with intervallic cells", seed=17, profile="wide_angular")


def example_pedal_center():
    return generate_composer_ir_from_title("Pedal Center Exploration", seed=99, profile="cluster_adjacent")


def example_asymmetrical_theme():
    return generate_composer_ir_from_title("Asymmetrical Theme", seed=333, profile="angular")


def all_examples():
    return [
        example_angular_modern_head(),
        example_cluster_harmony(),
        example_pedal_center(),
        example_asymmetrical_theme(),
    ]


def compile_all_examples():
    return [compile_composition_from_ir(ir) for ir in all_examples()]


if __name__ == "__main__":
    for ir in all_examples():
        comp = compile_composition_from_ir(ir)
        print(f"{ir.title}: {len(comp.sections)} sections, {sum(len(s.melody_events) for s in comp.sections)} melody events")
