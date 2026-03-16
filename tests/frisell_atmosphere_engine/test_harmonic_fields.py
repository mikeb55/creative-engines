"""Tests for Frisell Atmosphere harmonic fields."""

from harmonic_fields import (
    build_harmonic_field,
    derive_section_harmony,
    score_harmonic_spaciousness,
)


def test_build_harmonic_field():
    hf = build_harmonic_field(0, "pedal_field")
    assert hf.centers
    assert hf.chord_types
    assert hf.avoid_resolution


def test_derive_section_harmony():
    hf = build_harmonic_field(0, "americana_open")
    harm = derive_section_harmony(hf, "primary")
    assert harm
    assert any("sus" in s or "maj7" in s or "5" in s for s in harm)


def test_score_harmonic_spaciousness():
    hf = build_harmonic_field(0, "suspended_plain")
    s = score_harmonic_spaciousness(hf)
    assert 0 <= s <= 1
