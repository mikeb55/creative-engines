"""Tests for Wheeler Lyric harmonic fields."""
import sys
import os
for m in ("harmonic_fields",):
    sys.modules.pop(m, None)
_eng = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "engines", "wheeler-lyric-engine"))
sys.path.insert(0, _eng)

from harmonic_fields import (
    build_harmonic_field,
    derive_section_harmony,
    score_harmonic_suspension,
)


def test_build_harmonic_field():
    hf = build_harmonic_field(0, "suspended_lyric")
    assert hf.centers
    assert hf.chord_types
    assert hf.avoid_resolution


def test_derive_section_harmony():
    hf = build_harmonic_field(0, "floating_modal")
    harm = derive_section_harmony(hf, "primary")
    assert harm
    assert any("sus" in s or "maj7" in s or "m7" in s for s in harm)


def test_score_harmonic_suspension():
    hf = build_harmonic_field(0, "chamber_ecm")
    s = score_harmonic_suspension(hf)
    assert 0 <= s <= 1
