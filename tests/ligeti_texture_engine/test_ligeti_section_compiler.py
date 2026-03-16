"""Tests for Ligeti Texture section compiler."""

from generator import generate_composer_ir_from_title
from section_compiler import compile_composition_from_ir


def test_compile_from_ir():
    ir = generate_composer_ir_from_title("Compile Test", seed=0)
    compiled = compile_composition_from_ir(ir)
    assert compiled.sections
    assert compiled.melody
    assert compiled.harmony


def test_compile_deterministic():
    ir = generate_composer_ir_from_title("Det", seed=0)
    a = compile_composition_from_ir(ir)
    b = compile_composition_from_ir(ir)
    assert len(a.sections) == len(b.sections)
    assert len(a.melody.events) == len(b.melody.events)


def test_section_has_texture_lines():
    ir = generate_composer_ir_from_title("Texture", seed=0)
    compiled = compile_composition_from_ir(ir)
    primary = next((s for s in compiled.sections if s.role == "primary"), None)
    if primary:
        assert hasattr(primary, "texture_lines")
        assert hasattr(primary, "density_plan")
