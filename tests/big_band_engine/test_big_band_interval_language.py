"""Tests for Big Band interval language."""

from interval_language import build_interval_language, derive_sectional_cells, score_sectional_identity


def test_build_interval_language():
    il = build_interval_language(0, "brass_punch")
    assert il.primary_intervals
    assert il.tension_profile == "brass_punch"


def test_build_all_profiles():
    for p in ["brass_punch", "sax_counterline", "shout_leap", "sectional_unison", "layered_ensemble_motion"]:
        il = build_interval_language(0, p)
        assert il.tension_profile == p


def test_derive_sectional_cells():
    il = build_interval_language(0, "brass_punch")
    cells = derive_sectional_cells(il)
    assert len(cells) >= 4
    assert all(isinstance(c, list) for c in cells)


def test_score_sectional_identity():
    il = build_interval_language(0, "brass_punch")
    s = score_sectional_identity(il)
    assert 0 <= s <= 1.0
