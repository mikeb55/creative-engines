"""Tests for Messiaen Colour harmonic fields."""

import importlib.util
import os
_messiaen = os.path.join(os.path.dirname(__file__), "..", "..", "engines", "messiaen-colour-engine")
_spec = importlib.util.spec_from_file_location("messiaen_harmonic", os.path.join(_messiaen, "harmonic_fields.py"))
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
build_harmonic_field = _mod.build_harmonic_field
derive_section_harmony = _mod.derive_section_harmony
score_harmonic_colour = _mod.score_harmonic_colour


def test_messiaen_build_harmonic_field():
    hf = build_harmonic_field(0, "mode_2_field")
    assert hf.centers
    assert hf.chord_types
    assert hf.mode_transpositions >= 2


def test_messiaen_derive_section_harmony():
    hf = build_harmonic_field(0, "colour_chord_field")
    harm = derive_section_harmony(hf, "primary")
    assert len(harm) >= 2


def test_messiaen_score_harmonic_colour():
    hf = build_harmonic_field(0, "radiant_axis")
    s = score_harmonic_colour(hf)
    assert 0 <= s <= 1
