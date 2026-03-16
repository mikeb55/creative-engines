"""Tests for Ligeti Texture generator."""

from generator import generate_composer_ir_from_title, generate_composer_ir_from_premise


def test_generate_from_title():
    ir = generate_composer_ir_from_title("Cluster Cloud", seed=0)
    assert ir.title == "Cluster Cloud"
    assert ir.section_order
    assert ir.motivic_cells
    assert ir.density_curve


def test_generate_from_premise():
    ir = generate_composer_ir_from_premise("micropolyphonic density arc", seed=42)
    assert ir.title
    assert ir.section_order


def test_generate_deterministic():
    a = generate_composer_ir_from_title("Det", seed=0)
    b = generate_composer_ir_from_title("Det", seed=0)
    assert a.section_order == b.section_order
    assert a.seed == b.seed
