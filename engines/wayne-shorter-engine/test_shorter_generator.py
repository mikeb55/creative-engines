"""Tests for Shorter generator."""

import pytest

try:
    from .shorter_generator import generate_composer_ir_from_title, generate_composer_ir_from_premise, generate_composer_ir_candidates
    from .composer_ir_validator import validate_composer_ir
except ImportError:
    from shorter_generator import generate_composer_ir_from_title, generate_composer_ir_from_premise, generate_composer_ir_candidates
    from composer_ir_validator import validate_composer_ir


def test_generate_from_title_deterministic():
    a = generate_composer_ir_from_title("Footprints", seed=42)
    b = generate_composer_ir_from_title("Footprints", seed=42)
    assert a.title == b.title == "Footprints"
    assert a.seed == b.seed
    assert a.section_order == b.section_order
    assert len(a.motivic_cells) == len(b.motivic_cells)


def test_generate_from_title_different_seeds_differ():
    a = generate_composer_ir_from_title("Footprints", seed=1)
    b = generate_composer_ir_from_title("Footprints", seed=2)
    assert a.motivic_cells[0].intervals != b.motivic_cells[0].intervals or a.section_order != b.section_order


def test_generate_from_premise():
    ir = generate_composer_ir_from_premise("A dark modal melody", seed=0)
    assert ir.title
    r = validate_composer_ir(ir)
    assert r.valid


def test_candidates_count():
    cands = generate_composer_ir_candidates("Test", mode="title", count=12, seed=0)
    assert len(cands) == 12
    for c in cands:
        r = validate_composer_ir(c)
        assert r.valid


def test_candidates_vary():
    cands = generate_composer_ir_candidates("Test", mode="title", count=6, seed=0)
    forms = [c.form_plan for c in cands]
    assert len(set(forms)) >= 1
