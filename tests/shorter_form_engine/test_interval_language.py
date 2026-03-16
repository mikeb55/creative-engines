"""Tests for Shorter Form Interval Language."""

import pytest

from interval_language import (
    build_interval_language,
    derive_shorter_cells,
    score_interval_character,
)


def test_build_interval_language():
    il = build_interval_language(42, "shorter_leap")
    assert il.primary_intervals
    assert il.tension_profile == "shorter_leap"


def test_profiles():
    for p in ["shorter_leap", "angular_modal", "minor_third_axis", "tritone_axis", "expanding_interval"]:
        il = build_interval_language(0, p)
        assert il.tension_profile == p


def test_derive_shorter_cells():
    il = build_interval_language(0, "shorter_leap")
    cells = derive_shorter_cells(il)
    assert cells
    assert all(isinstance(c, list) for c in cells)


def test_score_interval_character():
    il = build_interval_language(0, "shorter_leap")
    s = score_interval_character(il)
    assert 0 <= s <= 1
