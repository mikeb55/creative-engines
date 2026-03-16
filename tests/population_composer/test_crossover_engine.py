"""Tests for crossover engine."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from population_composer.crossover_engine import crossover_melody, crossover_harmony, crossover_motif
from shared_composer.engine_registry import get_engine, ensure_engines_loaded


def _make_compiled(seed: int):
    ensure_engines_loaded()
    eng = get_engine("wayne_shorter")
    ir = eng.generate_ir("Test", mode="title", seed=seed)
    return eng.compile_from_ir(ir)


def test_crossover_melody_produces_offspring():
    a, b = _make_compiled(0), _make_compiled(1)
    out = crossover_melody(a, b, seed=42)
    assert out is not a and out is not b
    assert len(getattr(out, "sections", [])) >= 1


def test_crossover_harmony_produces_offspring():
    a, b = _make_compiled(0), _make_compiled(1)
    out = crossover_harmony(a, b, seed=7)
    assert out is not a and out is not b


def test_crossover_motif_produces_offspring():
    a, b = _make_compiled(0), _make_compiled(1)
    out = crossover_motif(a, b, seed=1)
    assert out is not a and out is not b
