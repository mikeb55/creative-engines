"""Tests for BH section compiler."""

try:
    from .generator import generate_composer_ir_from_title
    from .section_compiler import compile_composition_from_ir
except ImportError:
    from generator import generate_composer_ir_from_title
    from section_compiler import compile_composition_from_ir


def test_compile_from_ir_deterministic():
    ir = generate_composer_ir_from_title("Test", seed=0)
    a = compile_composition_from_ir(ir)
    b = compile_composition_from_ir(ir)
    assert a.title == b.title
    assert len(a.sections) == len(b.sections)


def test_compile_produces_melody_events():
    ir = generate_composer_ir_from_title("Test", seed=0)
    comp = compile_composition_from_ir(ir)
    assert len(comp.sections) >= 1
    assert sum(len(s.melody_events) for s in comp.sections) > 0


def test_compile_metadata():
    ir = generate_composer_ir_from_title("Test", seed=0)
    comp = compile_composition_from_ir(ir)
    assert "tempo" in comp.metadata
    assert "key_hint" in comp.metadata
