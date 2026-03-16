"""Tests for Scofield Holland motif development."""

import importlib.util
import os
import sys
_scofield = os.path.join(os.path.dirname(__file__), "..", "..", "engines", "scofield-holland-engine")
# Inject scofield's composer_ir so motif_development gets correct MotivicCell (repeat_count)
_spec_ir = importlib.util.spec_from_file_location("composer_ir", os.path.join(_scofield, "composer_ir.py"))
_mod_ir = importlib.util.module_from_spec(_spec_ir)
sys.modules["composer_ir"] = _mod_ir
_spec_ir.loader.exec_module(_mod_ir)
MotivicCell = _mod_ir.MotivicCell
# Load scofield motif_development (will use injected composer_ir)
_spec = importlib.util.spec_from_file_location("scofield_motif", os.path.join(_scofield, "motif_development.py"))
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
generate_motivic_cells = _mod.generate_motivic_cells
develop_motif_cell = _mod.develop_motif_cell
build_development_plan = _mod.build_development_plan


def test_scofield_generate_motivic_cells():
    cells = generate_motivic_cells(0, 3)
    assert len(cells) == 3
    assert cells[0].intervals


def test_scofield_develop_motif_riff_repeat():
    cell = MotivicCell(intervals=[1, 4, -1])
    dev = develop_motif_cell(cell, "riff_repeat")
    assert len(dev.intervals) >= 2


def test_scofield_develop_motif_chromatic_shift():
    cell = MotivicCell(intervals=[1, 4])
    dev = develop_motif_cell(cell, "chromatic_shift")
    assert dev.intervals != cell.intervals or len(dev.intervals) != len(cell.intervals)


def test_scofield_build_development_plan():
    cells = generate_motivic_cells(0, 2)
    plan = build_development_plan(cells, 0)
    assert "primary" in plan
    assert "contrast" in plan
