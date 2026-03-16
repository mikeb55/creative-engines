"""Tests for Scofield Holland section compiler."""

from generator import generate_composer_ir_from_title
from section_compiler import compile_composition_from_ir


def test_scofield_compile_composition():
    ir = generate_composer_ir_from_title("Compile Test", seed=0)
    comp = compile_composition_from_ir(ir)
    assert comp.title == "Compile Test"
    assert comp.sections
    assert comp.melody.events


def test_scofield_compile_deterministic():
    ir = generate_composer_ir_from_title("Deterministic", seed=99)
    c1 = compile_composition_from_ir(ir)
    c2 = compile_composition_from_ir(ir)
    assert len(c1.melody.events) == len(c2.melody.events)


def test_scofield_compile_has_melody_events():
    ir = generate_composer_ir_from_title("Events", seed=0)
    comp = compile_composition_from_ir(ir)
    assert any(sec.melody_events for sec in comp.sections)
