"""
Example Compositions — Canonical examples for the Wayne Shorter engine.
All validate and compile.
"""

from typing import List

try:
    from .composer_ir import ComposerIR
    from .shorter_generator import generate_composer_ir_from_title, generate_composer_ir_from_premise
    from .shorter_section_compiler import compile_composition_from_ir
except ImportError:
    from composer_ir import ComposerIR
    from shorter_generator import generate_composer_ir_from_title, generate_composer_ir_from_premise
    from shorter_section_compiler import compile_composition_from_ir


def example_dark_lyrical() -> ComposerIR:
    """Title-based dark lyrical example."""
    return generate_composer_ir_from_title("Footprints in the Rain", seed=42, profile="lyrical_ambiguous")


def example_ambiguous_modal() -> ComposerIR:
    """Premise-based ambiguous modal example."""
    return generate_composer_ir_from_premise(
        "A melody that drifts between F and Bb without resolving",
        seed=17,
        profile="balanced",
    )


def example_asymmetrical_phrase() -> ComposerIR:
    """Asymmetrical phrase structure example."""
    return generate_composer_ir_from_title("Odd Hours", seed=99, profile="angular")


def example_bridge_reframed_return() -> ComposerIR:
    """Bridge with reframed return example."""
    return generate_composer_ir_from_title("Nefertiti's Shadow", seed=333, profile="quartal_colored")


def all_examples() -> List[ComposerIR]:
    """Return all canonical examples."""
    return [
        example_dark_lyrical(),
        example_ambiguous_modal(),
        example_asymmetrical_phrase(),
        example_bridge_reframed_return(),
    ]


def compile_all_examples():
    """Compile all examples; returns list of CompiledComposition."""
    return [compile_composition_from_ir(ir) for ir in all_examples()]


if __name__ == "__main__":
    for ir in all_examples():
        comp = compile_composition_from_ir(ir)
        print(f"{ir.title}: {len(comp.sections)} sections, {sum(len(s.melody_events) for s in comp.sections)} melody events")
