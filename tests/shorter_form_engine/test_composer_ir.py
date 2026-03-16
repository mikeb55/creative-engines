"""Tests for Shorter Form Composer IR."""

import pytest

from composer_ir import (
    ComposerIR,
    MotivicCell,
    IntervalLanguage,
    HarmonicField,
    PhrasePlan,
    SectionPlan,
)


def test_composer_ir_required_fields():
    ir = ComposerIR(title="Test", seed=0)
    assert ir.title == "Test"
    assert ir.seed == 0
    assert ir.section_order
    assert ir.form_plan


def test_motivic_cell():
    c = MotivicCell(intervals=[3, 5, 7], contour="arch")
    assert c.intervals == [3, 5, 7]
    assert c.contour == "arch"


def test_shorter_specific_fields():
    ir = ComposerIR(
        title="Arc",
        narrative_arc={"primary": "exposition", "return": "return"},
        section_transformation_map={"return": "transformed"},
        theme_variation_plan={"return": "fragment_return"},
        modular_section_map={"primary": ["primary", "development"]},
    )
    assert ir.narrative_arc["primary"] == "exposition"
    assert ir.section_transformation_map["return"] == "transformed"
    assert "primary" in ir.modular_section_map
