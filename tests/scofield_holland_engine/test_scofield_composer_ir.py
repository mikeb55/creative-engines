"""Tests for Scofield Holland composer IR."""

from composer_ir import ComposerIR, MotivicCell, IntervalLanguage, HarmonicField
from composer_ir_validator import validate_composer_ir


def test_scofield_composer_ir_has_required_fields():
    ir = ComposerIR(title="Test", seed=0)
    assert ir.title == "Test"
    assert ir.section_order
    assert ir.interval_language
    assert ir.harmonic_field


def test_scofield_validate_composer_ir_valid():
    ir = ComposerIR(title="Valid", seed=0)
    r = validate_composer_ir(ir)
    assert r.valid


def test_scofield_validate_composer_ir_invalid_title():
    ir = ComposerIR(title="", seed=0)
    r = validate_composer_ir(ir)
    assert not r.valid
    assert any("title" in e for e in r.errors)
