"""Tests for Ligeti Texture motif development."""

from composer_ir import MotivicCell
from motif_development import generate_motivic_cells, develop_motif_cell, build_development_plan


def test_generate_motivic_cells():
    cells = generate_motivic_cells(0, 4)
    assert len(cells) == 4
    for c in cells:
        assert c.intervals


def test_develop_motif_density_accumulation():
    cell = MotivicCell(intervals=[1, 2, 3])
    out = develop_motif_cell(cell, "density_accumulation")
    assert len(out.intervals) >= len(cell.intervals)


def test_develop_motif_texture_thinning():
    cell = MotivicCell(intervals=[1, 2, 3])
    out = develop_motif_cell(cell, "texture_thinning")
    assert len(out.intervals) <= len(cell.intervals)


def test_build_development_plan():
    cells = generate_motivic_cells(0, 4)
    plan = build_development_plan(cells, 0)
    assert "primary" in plan
    assert "return" in plan
