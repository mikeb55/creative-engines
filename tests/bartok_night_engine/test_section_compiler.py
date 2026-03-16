"""Tests for Bartók Night section compiler."""

from generator import generate_composer_ir_from_title
from section_compiler import compile_composition_from_ir


def test_compile_composition():
    ir = generate_composer_ir_from_title("Compile Test", seed=0)
    compiled = compile_composition_from_ir(ir)
    assert compiled.sections
    assert compiled.title == "Compile Test"


def test_compile_deterministic():
    ir = generate_composer_ir_from_title("Det", seed=42)
    a = compile_composition_from_ir(ir)
    b = compile_composition_from_ir(ir)
    assert len(a.sections) == len(b.sections)
    assert len(a.sections[0].melody_events) == len(b.sections[0].melody_events)


def test_compile_has_melody_events():
    ir = generate_composer_ir_from_title("Melody", seed=0)
    compiled = compile_composition_from_ir(ir)
    for sec in compiled.sections:
        assert hasattr(sec, "melody_events")
        assert hasattr(sec, "harmony")
