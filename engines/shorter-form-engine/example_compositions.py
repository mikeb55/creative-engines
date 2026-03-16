"""
Shorter Form Example Compositions — Narrative, modular, transformed return, asymmetrical.
"""

try:
    from .composer_ir import ComposerIR
    from .composer_ir_validator import validate_composer_ir
    from .generator import generate_composer_ir_from_title, generate_composer_ir_from_premise
    from .section_compiler import compile_composition_from_ir
    from .musicxml_exporter import export_composition_to_musicxml
except ImportError:
    from composer_ir import ComposerIR
    from composer_ir_validator import validate_composer_ir
    from generator import generate_composer_ir_from_title, generate_composer_ir_from_premise
    from section_compiler import compile_composition_from_ir
    from musicxml_exporter import export_composition_to_musicxml


def example_narrative_modern_jazz_theme() -> ComposerIR:
    """Narrative modern jazz theme."""
    return generate_composer_ir_from_premise(
        "Narrative Theme",
        {"form_profile": "narrative_arc_form", "interval_profile": "shorter_leap", "harmonic_profile": "shorter_modal_shift"},
        seed=42,
    )


def example_modular_shorter_form() -> ComposerIR:
    """Modular Shorter form."""
    return generate_composer_ir_from_premise(
        "Modular Study",
        {"form_profile": "modular_shorter_form", "interval_profile": "angular_modal", "harmonic_profile": "chromatic_center_drift"},
        seed=17,
    )


def example_transformed_return_study() -> ComposerIR:
    """Transformed return study."""
    return generate_composer_ir_from_premise(
        "Return Study",
        {"form_profile": "transformed_return_form", "interval_profile": "tritone_axis", "harmonic_profile": "suspended_axis"},
        seed=99,
    )


def example_asymmetrical_motif_piece() -> ComposerIR:
    """Asymmetrical motif piece."""
    return generate_composer_ir_from_premise(
        "Asymmetrical Motif",
        {"form_profile": "asymmetric_cycle_form", "interval_profile": "expanding_interval", "harmonic_profile": "minor_major_duality"},
        seed=7,
    )


def run_examples():
    """Validate, compile, export all examples."""
    examples = [
        ("narrative", example_narrative_modern_jazz_theme),
        ("modular", example_modular_shorter_form),
        ("return", example_transformed_return_study),
        ("asymmetrical", example_asymmetrical_motif_piece),
    ]
    for name, fn in examples:
        ir = fn()
        r = validate_composer_ir(ir)
        assert r.valid, f"{name}: {r.errors}"
        compiled = compile_composition_from_ir(ir)
        xml = export_composition_to_musicxml(compiled)
        assert "<score-partwise" in xml
    return True
