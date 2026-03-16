"""Tests for Frisell Atmosphere interval language."""
import sys
import os
for m in ("interval_language",):
    sys.modules.pop(m, None)
_eng = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "engines", "frisell-atmosphere-engine"))
sys.path.insert(0, _eng)

from interval_language import (
    build_interval_language,
    derive_atmosphere_cells,
    score_atmosphere_openness,
)


def test_build_interval_language():
    il = build_interval_language(0, "open_fifths")
    assert il.primary_intervals
    assert il.tension_profile == "open_fifths"


def test_derive_atmosphere_cells():
    il = build_interval_language(0, "pedal_melody")
    cells = derive_atmosphere_cells(il)
    assert cells
    assert all(isinstance(c, list) for c in cells)


def test_score_atmosphere_openness():
    il = build_interval_language(0, "ambient_fourths")
    s = score_atmosphere_openness(il)
    assert 0 <= s <= 1
