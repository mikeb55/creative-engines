"""Tests for Scofield Holland harmonic fields."""

import importlib.util
import os
_scofield = os.path.join(os.path.dirname(__file__), "..", "..", "engines", "scofield-holland-engine")
# harmonic_fields defines its own HarmonicField (no composer_ir import) - load directly
_spec = importlib.util.spec_from_file_location("scofield_harmonic_fields", os.path.join(_scofield, "harmonic_fields.py"))
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
build_harmonic_field = _mod.build_harmonic_field
derive_section_harmony = _mod.derive_section_harmony
score_harmonic_groove = _mod.score_harmonic_groove


def test_scofield_build_harmonic_field():
    hf = build_harmonic_field(0, "funk_blues_modern")
    assert hf.centers
    assert "7" in str(hf.chord_types)


def test_scofield_derive_section_harmony():
    hf = build_harmonic_field(0, "chromatic_dominant")
    harm = derive_section_harmony(hf, "primary")
    assert len(harm) >= 2


def test_scofield_score_harmonic_groove():
    hf = build_harmonic_field(0, "bass_axis_motion")
    s = score_harmonic_groove(hf)
    assert 0 <= s <= 1
