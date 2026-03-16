"""Tests for Hill harmonic fields."""

try:
    from .harmonic_fields import build_harmonic_field, derive_section_harmony, score_harmonic_ambiguity
except ImportError:
    from harmonic_fields import build_harmonic_field, derive_section_harmony, score_harmonic_ambiguity


def test_build_harmonic_field_deterministic():
    a = build_harmonic_field(42, "cluster_based")
    b = build_harmonic_field(42, "cluster_based")
    assert a.centers == b.centers


def test_build_harmonic_field_profiles():
    for profile in ["cluster_based", "ambiguous_modal", "nonfunctional_cycle", "pedal_center"]:
        hf = build_harmonic_field(0, profile)
        assert hf.centers
        assert hf.chord_types


def test_derive_section_harmony():
    hf = build_harmonic_field(0, "cluster_based")
    harm = derive_section_harmony(hf, "primary")
    assert len(harm) >= 1
