"""Tests for Big Band composer IR."""

from composer_ir import ComposerIR, MotivicCell, IntervalLanguage, HarmonicField
from composer_ir_validator import (
    validate_composer_ir,
    validate_form_plan,
    validate_interval_language,
    validate_harmonic_field,
    validate_phrase_plan,
    validate_musicxml_constraints,
)


def test_composer_ir_has_required_fields():
    ir = ComposerIR(title="Test", seed=0)
    assert ir.title == "Test"
    assert ir.section_order
    assert ir.interval_language
    assert ir.harmonic_field
    assert hasattr(ir, "sectional_roles")
    assert hasattr(ir, "density_plan")
    assert hasattr(ir, "shout_chorus_flag")


def test_validate_composer_ir_valid():
    ir = ComposerIR(title="Valid", seed=0)
    r = validate_composer_ir(ir)
    assert r.valid


def test_validate_composer_ir_invalid_title():
    ir = ComposerIR(title="", seed=0)
    r = validate_composer_ir(ir)
    assert not r.valid
    assert any("title" in e for e in r.errors)


def test_validate_form_plan():
    ir = ComposerIR(title="Test", seed=0)
    r = validate_form_plan(ir)
    assert r.valid


def test_validate_interval_language():
    ir = ComposerIR(title="Test", seed=0)
    r = validate_interval_language(ir)
    assert r.valid


def test_validate_phrase_plan():
    ir = ComposerIR(title="Test", seed=0)
    r = validate_phrase_plan(ir)
    assert r.valid


def test_validate_musicxml_constraints():
    ir = ComposerIR(title="Test", seed=0)
    r = validate_musicxml_constraints(ir)
    assert r.valid
