"""Tests for Shorter Form Harmonic Fields."""

import pytest

from harmonic_fields import (
    build_harmonic_field,
    derive_section_harmony,
    score_harmonic_narrative,
)


def test_build_harmonic_field():
    hf = build_harmonic_field(42, "shorter_modal_shift")
    assert hf.centers
    assert hf.motion_type == "shorter_modal_shift"
    assert hf.chord_types


def test_profiles():
    for p in ["shorter_modal_shift", "chromatic_center_drift", "suspended_axis", "minor_major_duality", "floating_tonal_center"]:
        hf = build_harmonic_field(0, p)
        assert hf.motion_type == p


def test_derive_section_harmony():
    hf = build_harmonic_field(0, "shorter_modal_shift")
    chords = derive_section_harmony(hf, "primary")
    assert chords
    chords_dev = derive_section_harmony(hf, "development")
    assert chords_dev


def test_score_harmonic_narrative():
    hf = build_harmonic_field(0, "shorter_modal_shift")
    s = score_harmonic_narrative(hf)
    assert 0 <= s <= 1
