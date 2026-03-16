"""Tests for Wheeler Lyric interval language."""

from interval_language import (
    build_interval_language,
    derive_lyric_cells,
    score_melodic_lyricism,
)


def test_build_interval_language():
    il = build_interval_language(0, "lyrical_wide")
    assert il.primary_intervals
    assert il.lyric_profile == "lyrical_wide"


def test_derive_lyric_cells():
    il = build_interval_language(0, "sixth_ninth_arc")
    cells = derive_lyric_cells(il)
    assert cells
    assert all(isinstance(c, list) for c in cells)


def test_score_melodic_lyricism():
    il = build_interval_language(0, "suspended_fourths")
    s = score_melodic_lyricism(il)
    assert 0 <= s <= 1
