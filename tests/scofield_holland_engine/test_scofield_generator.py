"""Tests for Scofield Holland generator."""

from generator import generate_composer_ir_from_title, generate_composer_ir_from_premise, generate_composer_ir_candidates


def test_scofield_generate_from_title():
    ir = generate_composer_ir_from_title("Chromatic Groove", seed=0)
    assert ir.title == "Chromatic Groove"
    assert ir.motivic_cells
    assert ir.interval_language.primary_intervals


def test_scofield_generate_from_premise():
    ir = generate_composer_ir_from_premise("blues riff theme", seed=0)
    assert ir.title


def test_scofield_generate_deterministic():
    ir1 = generate_composer_ir_from_title("Test", seed=42)
    ir2 = generate_composer_ir_from_title("Test", seed=42)
    assert ir1.interval_language.primary_intervals == ir2.interval_language.primary_intervals


def test_scofield_generate_candidates():
    cands = generate_composer_ir_candidates("Groove", mode="title", count=3, seed=0)
    assert len(cands) == 3
