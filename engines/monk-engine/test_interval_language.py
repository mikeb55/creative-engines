"""Tests for Monk interval language."""

try:
    from .interval_language import build_interval_language, score_interval_tension, derive_melodic_cell_shapes
except ImportError:
    from interval_language import build_interval_language, score_interval_tension, derive_melodic_cell_shapes


def test_build_interval_language_deterministic():
    a = build_interval_language(42, "angular")
    b = build_interval_language(42, "angular")
    assert a.primary_intervals == b.primary_intervals


def test_build_interval_language_profiles():
    for profile in ["angular", "repeated_cell", "leap_m2"]:
        il = build_interval_language(0, profile)
        assert il.primary_intervals
        assert il.tension_profile == profile


def test_derive_melodic_cell_shapes():
    il = build_interval_language(0, "angular")
    shapes = derive_melodic_cell_shapes(il)
    assert len(shapes) >= 1
