"""Tests for Shorter Form Motif Development."""

import pytest

from motif_development import (
    generate_motivic_cells,
    develop_motif_cell,
    build_development_plan,
)
from composer_ir import MotivicCell


def test_generate_motivic_cells():
    cells = generate_motivic_cells(42, count=3)
    assert len(cells) == 3
    assert all(isinstance(c, MotivicCell) for c in cells)
    assert all(c.intervals for c in cells)


def test_develop_motif_cell():
    c = MotivicCell(intervals=[3, 5, 7], contour="arch")
    for op in ["motif_recontextualization", "interval_expansion", "fragment_return", "rhythmic_mutation", "register_reposition", "contour_reversal"]:
        d = develop_motif_cell(c, op)
        assert d.intervals is not None


def test_build_development_plan():
    cells = generate_motivic_cells(0, 2)
    plan = build_development_plan(cells, 0)
    assert "primary" in plan or "development" in plan or "return" in plan
