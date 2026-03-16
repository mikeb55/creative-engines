"""Tests for Bartók Night harmonic fields."""

from harmonic_fields import (
    build_harmonic_field,
    derive_section_harmony,
    score_harmonic_texture,
)


def test_build_harmonic_field():
    hf = build_harmonic_field(0, "cluster_field")
    assert hf.centers
    assert hf.chord_types
    assert hf.avoid_resolution


def test_derive_section_harmony():
    hf = build_harmonic_field(0, "modal_axis")
    harm = derive_section_harmony(hf, "primary")
    assert harm
    assert all("m7" in s or "sus" in s or "dim" in s for s in harm)


def test_score_harmonic_texture():
    hf = build_harmonic_field(0, "suspended_field")
    s = score_harmonic_texture(hf)
    assert 0 <= s <= 1
