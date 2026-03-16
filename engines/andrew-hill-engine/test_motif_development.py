"""Tests for Hill motif development."""

try:
    from .composer_ir import MotivicCell
    from .motif_development import generate_motivic_cells, develop_motif_cell, build_development_plan
except ImportError:
    from composer_ir import MotivicCell
    from motif_development import generate_motivic_cells, develop_motif_cell, build_development_plan


def test_generate_motivic_cells_deterministic():
    a = generate_motivic_cells(42, 3)
    b = generate_motivic_cells(42, 3)
    assert len(a) == len(b) == 3
    for ca, cb in zip(a, b):
        assert ca.intervals == cb.intervals


def test_develop_motif_cell_operations():
    cell = MotivicCell(intervals=[6, 1, 11])
    for op in ["fragmentation", "registral_displacement", "irregular_transformation"]:
        developed = develop_motif_cell(cell, op)
        assert developed.intervals


def test_build_development_plan():
    cells = generate_motivic_cells(0, 3)
    plan = build_development_plan(cells, 0)
    assert "primary" in plan
    assert "contrast" in plan
    assert "return" in plan
