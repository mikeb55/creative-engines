"""Tests for Stravinsky Pulse harmonic fields."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines", "stravinsky-pulse-engine"))

from harmonic_fields import build_harmonic_field, derive_section_harmony


def test_stravinsky_build_harmonic_field():
    hf = build_harmonic_field(0, "block_modal")
    assert hf.centers
    assert hf.chord_types


def test_stravinsky_derive_section_harmony():
    hf = build_harmonic_field(0, "dry_axis")
    harm = derive_section_harmony(hf, "primary")
    assert len(harm) >= 2

