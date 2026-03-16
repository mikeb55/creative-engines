"""Tests for Messiaen Colour interval language."""
import importlib.util
import os
import sys
for m in ("composer_ir", "interval_language"):
    sys.modules.pop(m, None)
_messiaen = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "engines", "messiaen-colour-engine"))
sys.path.insert(0, _messiaen)
_spec = importlib.util.spec_from_file_location("messiaen_interval", os.path.join(_messiaen, "interval_language.py"))
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
build_interval_language = _mod.build_interval_language
derive_colour_cells = _mod.derive_colour_cells
score_interval_colour = _mod.score_interval_colour


def test_messiaen_build_interval_language():
    il = build_interval_language(0, "birdsong_fragment")
    assert il.primary_intervals
    assert il.tension_profile == "birdsong_fragment"


def test_messiaen_derive_colour_cells():
    il = build_interval_language(0, "luminous_fourths")
    cells = derive_colour_cells(il)
    assert len(cells) >= 1
    assert all(len(c) >= 1 for c in cells)


def test_messiaen_score_interval_colour():
    il = build_interval_language(0, "ecstatic_leaps")
    s = score_interval_colour(il)
    assert 0 <= s <= 1
