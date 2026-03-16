"""Tests for Shorter Form Section Compiler."""

import pytest

from generator import generate_composer_ir_from_title
from section_compiler import (
    compile_composition_from_ir,
    compile_section,
    compile_primary_theme,
    compile_development_section,
    compile_transformed_return,
)


def test_compile_composition():
    ir = generate_composer_ir_from_title("Test", seed=0)
    compiled = compile_composition_from_ir(ir)
    assert compiled.title == "Test"
    assert compiled.sections
    assert compiled.total_bars > 0
    assert compiled.narrative_arc


def test_compile_section():
    ir = generate_composer_ir_from_title("Test", seed=0)
    sec = compile_section(ir, "primary")
    assert sec.role == "primary"
    assert sec.bar_count > 0
    assert sec.melody_blueprint.intervals
    assert sec.harmony_plan.chords


def test_compile_primary_theme():
    ir = generate_composer_ir_from_title("Test", seed=0)
    mb = compile_primary_theme(ir)
    assert mb.intervals
    assert mb.durations


def test_compile_development_section():
    ir = generate_composer_ir_from_title("Test", seed=0)
    mb = compile_development_section(ir)
    assert mb.intervals


def test_compile_transformed_return():
    ir = generate_composer_ir_from_title("Test", seed=0)
    mb = compile_transformed_return(ir)
    assert mb.intervals
