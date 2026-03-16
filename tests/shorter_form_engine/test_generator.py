"""Tests for Shorter Form Generator."""

import pytest

from generator import (
    generate_composer_ir_from_title,
    generate_composer_ir_from_premise,
    generate_composer_ir_candidates,
)


def test_generate_from_title():
    ir = generate_composer_ir_from_title("Footprints", seed=0)
    assert ir.title == "Footprints"
    assert ir.section_order
    assert ir.motivic_cells
    assert ir.interval_language.primary_intervals
    assert ir.harmonic_field.centers


def test_generate_from_premise():
    ir = generate_composer_ir_from_premise(
        "Study",
        {"form_profile": "modular_shorter_form", "interval_profile": "tritone_axis"},
        seed=1,
    )
    assert ir.title == "Study"
    assert ir.form_plan == "modular_shorter_form"
    assert ir.interval_language.tension_profile == "tritone_axis"


def test_deterministic():
    a = generate_composer_ir_from_title("X", seed=42)
    b = generate_composer_ir_from_title("X", seed=42)
    assert a.section_order == b.section_order
    assert a.form_plan == b.form_plan


def test_candidates():
    cands = generate_composer_ir_candidates("Y", count=3)
    assert len(cands) == 3
    assert all(c.title == "Y" for c in cands)
