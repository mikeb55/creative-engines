"""Tests for Big Band harmonic fields."""

from harmonic_fields import build_harmonic_field, derive_section_harmony, score_ensemble_harmonic_interest


def test_build_harmonic_field():
    hf = build_harmonic_field(0, "modern_big_band_modal")
    assert hf.centers
    assert hf.motion_type == "modern_big_band_modal"


def test_derive_section_harmony():
    hf = build_harmonic_field(0, "modern_big_band_modal")
    for role in ["primary", "contrast", "shout"]:
        harm = derive_section_harmony(hf, role)
        assert harm


def test_score_ensemble_harmonic_interest():
    hf = build_harmonic_field(0, "modern_big_band_modal")
    s = score_ensemble_harmonic_interest(hf)
    assert 0 <= s <= 1.0
