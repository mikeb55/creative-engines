"""Tests for Shorter section compiler."""

import pytest

try:
    from .composer_ir import ComposerIR, MotivicCell, SectionPlan
    from .shorter_generator import generate_composer_ir_from_title
    from .shorter_section_compiler import compile_composition_from_ir, compile_section
except ImportError:
    from composer_ir import ComposerIR, MotivicCell, SectionPlan
    from shorter_generator import generate_composer_ir_from_title
    from shorter_section_compiler import compile_composition_from_ir, compile_section


def test_compile_from_ir_deterministic():
    ir = generate_composer_ir_from_title("Test", seed=0)
    a = compile_composition_from_ir(ir)
    b = compile_composition_from_ir(ir)
    assert a.title == b.title
    assert len(a.sections) == len(b.sections)
    for sa, sb in zip(a.sections, b.sections):
        assert len(sa.melody_events) == len(sb.melody_events)
        assert sa.bar_start == sb.bar_start
        assert sa.bar_end == sb.bar_end


def test_compile_produces_melody_events():
    ir = generate_composer_ir_from_title("Test", seed=0)
    comp = compile_composition_from_ir(ir)
    assert len(comp.sections) >= 1
    total_events = sum(len(s.melody_events) for s in comp.sections)
    assert total_events > 0


def test_compile_section_metadata():
    ir = generate_composer_ir_from_title("Test", seed=0)
    comp = compile_composition_from_ir(ir)
    assert "tempo" in comp.metadata
    assert "key_hint" in comp.metadata


def test_compile_primary_contrast_return():
    ir = generate_composer_ir_from_title("Test", seed=0)
    comp = compile_composition_from_ir(ir)
    roles = [s.role for s in comp.sections]
    assert "primary" in roles or "return" in roles
