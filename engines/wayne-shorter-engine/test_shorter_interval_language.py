"""Tests for Shorter interval language."""

import pytest

try:
    from .shorter_interval_language import build_interval_language, score_interval_tension, derive_melodic_cell_shapes
except ImportError:
    from shorter_interval_language import build_interval_language, score_interval_tension, derive_melodic_cell_shapes


def test_build_interval_language_deterministic():
    a = build_interval_language(42, "balanced")
    b = build_interval_language(42, "balanced")
    assert a.primary_intervals == b.primary_intervals
    assert a.tension_profile == "balanced"


def test_build_interval_language_profiles():
    for profile in ["balanced", "angular", "lyrical_ambiguous", "quartal_colored"]:
        il = build_interval_language(0, profile)
        assert il.primary_intervals
        assert il.tension_profile == profile


def test_score_interval_tension():
    il = build_interval_language(0, "balanced")
    s = score_interval_tension(il)
    assert 0 <= s <= 1


def test_derive_melodic_cell_shapes():
    il = build_interval_language(0, "balanced")
    shapes = derive_melodic_cell_shapes(il)
    assert len(shapes) >= 1
    for shape in shapes:
        assert isinstance(shape, list)
        assert all(isinstance(x, int) for x in shape)
