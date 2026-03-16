"""Tests for Frisell Atmosphere generator."""

from generator import (
    generate_composer_ir_from_title,
    generate_composer_ir_from_premise,
    generate_composer_ir_candidates,
)


def test_generate_from_title():
    ir = generate_composer_ir_from_title("Open Study", seed=0)
    assert ir.title == "Open Study"
    assert ir.section_order
    assert ir.motivic_cells


def test_generate_from_premise():
    ir = generate_composer_ir_from_premise("open Americana", seed=42)
    assert ir.title
    assert ir.section_order


def test_generate_deterministic():
    a = generate_composer_ir_from_title("Det", seed=0)
    b = generate_composer_ir_from_title("Det", seed=0)
    assert a.section_order == b.section_order
    assert a.seed == b.seed


def test_generate_candidates():
    cands = generate_composer_ir_candidates("Candidates", count=4, seed=0)
    assert len(cands) == 4
