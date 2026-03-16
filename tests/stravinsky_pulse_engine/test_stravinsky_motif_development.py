"""Tests for Stravinsky Pulse motif development."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines", "stravinsky-pulse-engine"))

from composer_ir import MotivicCell
from motif_development import generate_motivic_cells, develop_motif_cell, build_development_plan


def test_stravinsky_generate_motivic_cells():
    cells = generate_motivic_cells(0, 3)
    assert len(cells) == 3
    assert cells[0].intervals


def test_stravinsky_develop_motif_pulse_repeat():
    cell = MotivicCell(intervals=[7, 2, 5])
    dev = develop_motif_cell(cell, "pulse_repeat")
    assert len(dev.intervals) >= 2


def test_stravinsky_develop_motif_accent_shift():
    cell = MotivicCell(intervals=[7, 2])
    dev = develop_motif_cell(cell, "accent_shift")
    assert dev.intervals != cell.intervals or len(dev.intervals) == len(cell.intervals)


def test_stravinsky_build_development_plan():
    cells = generate_motivic_cells(0, 2)
    plan = build_development_plan(cells, 0)
    assert "primary" in plan
    assert "contrast" in plan
