"""Tests for Hill generator."""

try:
    from .generator import generate_composer_ir_from_title, generate_composer_ir_from_premise, generate_composer_ir_candidates
    from .composer_ir_validator import validate_composer_ir
except ImportError:
    from generator import generate_composer_ir_from_title, generate_composer_ir_from_premise, generate_composer_ir_candidates
    from composer_ir_validator import validate_composer_ir


def test_generate_from_title_deterministic():
    a = generate_composer_ir_from_title("Angular Head", seed=42)
    b = generate_composer_ir_from_title("Angular Head", seed=42)
    assert a.title == b.title
    assert a.section_order == b.section_order


def test_generate_from_premise():
    ir = generate_composer_ir_from_premise("Cluster harmony", seed=0)
    assert ir.title
    assert validate_composer_ir(ir).valid


def test_candidates_count():
    cands = generate_composer_ir_candidates("Test", mode="title", count=12, seed=0)
    assert len(cands) == 12
    for c in cands:
        assert validate_composer_ir(c).valid
