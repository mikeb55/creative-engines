"""Tests for Zappa Disruption harmonic fields."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines", "zappa-disruption-engine"))

from harmonic_fields import build_harmonic_field, derive_section_harmony


def test_zappa_build_harmonic_field():
    hf = build_harmonic_field(0, "collision_field")
    assert hf.centers
    assert hf.chord_types


def test_zappa_derive_section_harmony():
    hf = build_harmonic_field(0, "altered_shift")
    harm = derive_section_harmony(hf, "cut")
    assert len(harm) >= 2
