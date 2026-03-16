"""Tests for Shorter Form Composer IR Validator."""

import pytest

from composer_ir import ComposerIR, SectionPlan
from composer_ir_validator import (
    validate_composer_ir,
    validate_form_plan,
    validate_interval_language,
    validate_harmonic_field,
    validate_phrase_plan,
)


def test_validate_valid_ir():
    ir = ComposerIR(title="Valid", section_order=["primary", "development", "return"])
    r = validate_composer_ir(ir)
    assert r.valid
    assert not r.errors


def test_validate_requires_title():
    ir = ComposerIR(title="", section_order=["primary"])
    r = validate_composer_ir(ir)
    assert not r.valid
    assert any("title" in e.lower() for e in r.errors)


def test_validate_requires_section_order():
    ir = ComposerIR(title="X", section_order=[])
    r = validate_composer_ir(ir)
    assert not r.valid


def test_validate_form_plan():
    ir = ComposerIR(
        title="Arc",
        section_order=["primary", "development", "return"],
        section_roles={
            "primary": SectionPlan(role="primary", bar_count=8),
            "development": SectionPlan(role="development", bar_count=8),
            "return": SectionPlan(role="return", bar_count=8),
        },
    )
    r = validate_form_plan(ir)
    assert r.valid