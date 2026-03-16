"""Tests for Scofield Holland interval language."""

import importlib.util
import os
_scofield = os.path.join(os.path.dirname(__file__), "..", "..", "engines", "scofield-holland-engine")
_spec = importlib.util.spec_from_file_location("scofield_interval_language", os.path.join(_scofield, "interval_language.py"))
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
build_interval_language = _mod.build_interval_language
derive_riff_cells = _mod.derive_riff_cells
score_groove_identity = _mod.score_groove_identity


def test_scofield_build_interval_language():
    il = build_interval_language(0, "chromatic_riff")
    assert il.primary_intervals
    assert 1 in il.primary_intervals or -1 in il.primary_intervals


def test_scofield_derive_riff_cells():
    il = build_interval_language(0, "groove_cell")
    cells = derive_riff_cells(il)
    assert len(cells) >= 3


def test_scofield_score_groove_identity():
    il = build_interval_language(0, "chromatic_riff")
    s = score_groove_identity(il)
    assert 0 <= s <= 1
