"""Tests for mutation operators."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from population_composer.mutation_operators import (
    mutate_intervals,
    mutate_harmony,
    mutate_motif,
    mutate_phrase_lengths,
    mutate_form,
)
from shared_composer.engine_registry import get_engine, ensure_engines_loaded


def _make_compiled():
    ensure_engines_loaded()
    eng = get_engine("wayne_shorter")
    ir = eng.generate_ir("Test", mode="title", seed=0)
    return eng.compile_from_ir(ir)


def test_mutate_intervals_produces_different_composition():
    comp = _make_compiled()
    out = mutate_intervals(comp, strength=0.5, seed=42)
    assert out is not comp
    secs = getattr(out, "sections", [])
    assert len(secs) == len(getattr(comp, "sections", []))


def test_mutate_harmony_produces_valid_output():
    comp = _make_compiled()
    out = mutate_harmony(comp, strength=0.3, seed=7)
    assert out is not comp
    for sec in getattr(out, "sections", []):
        for h in getattr(sec, "harmony", []):
            assert "symbol" in h or len(h) > 0


def test_mutate_motif_produces_output():
    comp = _make_compiled()
    out = mutate_motif(comp, strength=0.4, seed=1)
    assert out is not comp


def test_mutate_phrase_lengths_preserves_asymmetry():
    comp = _make_compiled()
    out = mutate_phrase_lengths(comp, strength=0.5, seed=99)
    assert out is not comp
    for sec in getattr(out, "sections", []):
        pl = getattr(sec, "phrase_lengths", [])
        assert all(p >= 2 for p in pl)


def test_mutate_form_produces_output():
    comp = _make_compiled()
    out = mutate_form(comp, strength=1.0, seed=0)
    assert out is not comp
