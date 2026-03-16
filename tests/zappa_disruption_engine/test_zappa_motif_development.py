"""Tests for Zappa Disruption motif development."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines", "zappa-disruption-engine"))

from composer_ir import MotivicCell
from motif_development import generate_motivic_cells, develop_motif_cell, build_development_plan


def test_zappa_generate_motivic_cells():
    cells = generate_motivic_cells(0, 3)
    assert len(cells) == 3
    assert cells[0].intervals


def test_zappa_develop_motif_interruption():
    cell = MotivicCell(intervals=[1, 6, 11])
    dev = develop_motif_cell(cell, "interruption")
    assert len(dev.intervals) >= 1


def test_zappa_build_development_plan():
    cells = generate_motivic_cells(0, 2)
    plan = build_development_plan(cells, 0)
    assert "primary" in plan
    assert len(plan) >= 2
