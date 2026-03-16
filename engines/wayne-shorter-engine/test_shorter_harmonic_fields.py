"""Tests for Shorter harmonic fields."""

import pytest

try:
    from .shorter_harmonic_fields import build_harmonic_field, derive_section_harmony, score_harmonic_ambiguity
except ImportError:
    from shorter_harmonic_fields import build_harmonic_field, derive_section_harmony, score_harmonic_ambiguity


def test_build_harmonic_field_deterministic():
    a = build_harmonic_field(42, "ambiguous_modal")
    b = build_harmonic_field(42, "ambiguous_modal")
    assert a.centers == b.centers
    assert a.motion_type == "ambiguous_modal"


def test_build_harmonic_field_profiles():
    for profile in ["ambiguous_modal", "nonfunctional_cycle", "blues_shadowed"]:
        hf = build_harmonic_field(0, profile)
        assert hf.centers
        assert hf.chord_types


def test_derive_section_harmony():
    hf = build_harmonic_field(0, "ambiguous_modal")
    harm = derive_section_harmony(hf, "primary")
    assert len(harm) >= 1
    harm_contrast = derive_section_harmony(hf, "contrast")
    assert len(harm_contrast) >= 1


def test_score_harmonic_ambiguity():
    hf = build_harmonic_field(0, "ambiguous_modal")
    s = score_harmonic_ambiguity(hf)
    assert 0 <= s <= 1
