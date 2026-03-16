"""Tests for BH harmonic fields."""

try:
    from .harmonic_fields import build_harmonic_field, derive_section_harmony, score_harmonic_ambiguity
except ImportError:
    from harmonic_fields import build_harmonic_field, derive_section_harmony, score_harmonic_ambiguity


def test_build_harmonic_field_deterministic():
    a = build_harmonic_field(42, "major6_dim")
    b = build_harmonic_field(42, "major6_dim")
    assert a.centers == b.centers


def test_build_harmonic_field_profiles():
    for profile in ["major6_dim", "minor6_dim", "dominant_dim", "minor_conversion"]:
        hf = build_harmonic_field(0, profile)
        assert hf.centers
        assert hf.chord_types


def test_derive_section_harmony():
    hf = build_harmonic_field(0, "major6_dim")
    harm = derive_section_harmony(hf, "primary")
    assert len(harm) >= 1
    harm_contrast = derive_section_harmony(hf, "contrast")
    assert len(harm_contrast) >= 1
