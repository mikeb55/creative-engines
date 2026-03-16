"""Tests for Bartók Night motif development."""

from composer_ir import MotivicCell
from motif_development import (
    generate_motivic_cells,
    develop_motif_cell,
    build_development_plan,
)


def test_generate_motivic_cells():
    cells = generate_motivic_cells(0, 3)
    assert len(cells) == 3
    assert all(hasattr(c, "intervals") for c in cells)


def test_develop_motif_fragmentation():
    cell = MotivicCell(intervals=[1, 6, -1])
    dev = develop_motif_cell(cell, "fragmentation")
    assert len(dev.intervals) <= len(cell.intervals)


def test_develop_motif_registral_shift():
    cell = MotivicCell(intervals=[1, 6])
    dev = develop_motif_cell(cell, "registral_shift")
    assert dev.registral_center != cell.registral_center


def test_build_development_plan():
    cells = generate_motivic_cells(0, 2)
    plan = build_development_plan(cells, 0)
    assert "primary" in plan
    assert "contrast" in plan
    assert "return" in plan
