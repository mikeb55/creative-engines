"""Tests for Bartók Night interval language."""

from interval_language import (
    build_interval_language,
    derive_fragment_cells,
    score_interval_color,
)


def test_build_interval_language():
    il = build_interval_language(0, "minor_second_cluster")
    assert il.primary_intervals
    assert il.tension_profile == "minor_second_cluster"


def test_derive_fragment_cells():
    il = build_interval_language(0, "insect_motif")
    cells = derive_fragment_cells(il)
    assert cells
    assert all(isinstance(c, list) for c in cells)


def test_score_interval_color():
    il = build_interval_language(0, "tritone_axis")
    s = score_interval_color(il)
    assert 0 <= s <= 1
