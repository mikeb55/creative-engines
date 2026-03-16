"""Tests for Composer IR and validator."""

import pytest

try:
    from .composer_ir import ComposerIR, MotivicCell, IntervalLanguage, HarmonicField, PhrasePlan, SectionPlan
    from .composer_ir_validator import validate_composer_ir, validate_form_plan
except ImportError:
    from composer_ir import ComposerIR, MotivicCell, IntervalLanguage, HarmonicField, PhrasePlan, SectionPlan
    from composer_ir_validator import validate_composer_ir, validate_form_plan


def test_valid_composer_ir():
    ir = ComposerIR(
        title="Test",
        section_order=["primary", "return"],
        section_roles={
            "primary": SectionPlan(role="primary", bar_count=8),
            "return": SectionPlan(role="return", bar_count=8),
        },
    )
    r = validate_composer_ir(ir)
    assert r.valid
    assert len(r.errors) == 0


def test_invalid_no_primary_or_return():
    ir = ComposerIR(
        title="Test",
        section_order=["intro", "coda"],
        section_roles={"intro": SectionPlan(role="intro"), "coda": SectionPlan(role="coda")},
    )
    r = validate_composer_ir(ir)
    assert not r.valid
    assert any("primary" in e or "return" in e for e in r.errors)


def test_section_roles_must_match_order():
    ir = ComposerIR(
        title="Test",
        section_order=["primary"],
        section_roles={"primary": SectionPlan(role="primary"), "orphan": SectionPlan(role="contrast")},
    )
    r = validate_form_plan(ir)
    assert not r.valid


def test_phrase_plan_asymmetry_allowed():
    ir = ComposerIR(
        title="Test",
        section_order=["primary"],
        section_roles={"primary": SectionPlan(role="primary", phrase_lengths=[7, 9, 7])},
        phrase_plan=PhrasePlan(phrase_lengths=[7, 9, 7], asymmetry_level=0.8),
    )
    r = validate_composer_ir(ir)
    assert r.valid
