"""Tests for Messiaen Colour motif development."""

import importlib.util
import os
import sys
_messiaen = os.path.join(os.path.dirname(__file__), "..", "..", "engines", "messiaen-colour-engine")
_spec = importlib.util.spec_from_file_location("messiaen_motif", os.path.join(_messiaen, "motif_development.py"))
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
generate_motivic_cells = _mod.generate_motivic_cells
develop_motif_cell = _mod.develop_motif_cell
build_development_plan = _mod.build_development_plan
_spec_ir = importlib.util.spec_from_file_location("messiaen_ir", os.path.join(_messiaen, "composer_ir.py"))
_mod_ir = importlib.util.module_from_spec(_spec_ir)
_spec_ir.loader.exec_module(_mod_ir)
MotivicCell = _mod_ir.MotivicCell


def test_messiaen_generate_motivic_cells():
    cells = generate_motivic_cells(0, 3)
    assert len(cells) == 3
    assert cells[0].intervals


def test_messiaen_develop_motif_registral_illumination():
    cell = MotivicCell(intervals=[5, 2, 6], registral_center=72)
    dev = develop_motif_cell(cell, "registral_illumination")
    assert dev.registral_center == cell.registral_center + 12


def test_messiaen_build_development_plan():
    cells = generate_motivic_cells(0, 2)
    plan = build_development_plan(cells, 0)
    assert "primary" in plan
    assert "contrast" in plan
