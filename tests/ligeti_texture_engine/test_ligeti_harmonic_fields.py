"""Tests for Ligeti Texture harmonic fields."""

from harmonic_fields import build_harmonic_field, derive_section_harmony, score_harmonic_texture


def test_build_harmonic_field():
    hf = build_harmonic_field(0, "cluster_mass")
    assert hf.centers
    assert hf.motion_type == "cluster_mass"


def test_derive_section_harmony():
    hf = build_harmonic_field(0, "cluster_mass")
    for role in ["primary", "contrast"]:
        harm = derive_section_harmony(hf, role)
        assert harm


def test_score_harmonic_texture():
    hf = build_harmonic_field(0, "cluster_mass")
    s = score_harmonic_texture(hf)
    assert 0 <= s <= 1.0
