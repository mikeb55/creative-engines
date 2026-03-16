"""Tests for Big Band motif development."""

from composer_ir import MotivicCell
from motif_development import generate_motivic_cells, develop_motif_cell, build_development_plan


def test_generate_motivic_cells():
    cells = generate_motivic_cells(0, 4)
    assert len(cells) == 4
    for c in cells:
        assert c.intervals


def test_develop_motif_sectional_transfer():
    cell = MotivicCell(intervals=[5, 7, -4])
    out = develop_motif_cell(cell, "sectional_transfer")
    assert out.registral_center == cell.registral_center + 7


def test_develop_motif_brass_punch_expansion():
    cell = MotivicCell(intervals=[5, 7])
    out = develop_motif_cell(cell, "brass_punch_expansion")
    assert 12 in out.intervals or -12 in out.intervals


def test_build_development_plan():
    cells = generate_motivic_cells(0, 4)
    plan = build_development_plan(cells, 0)
    assert "primary" in plan
    assert "shout" in plan
