"""Tests for harmonic interest scoring."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from composition_evaluator.harmonic_interest import score_harmonic_interest
from shared_composer.engine_registry import get_engine, ensure_engines_loaded


def _make_compiled():
    ensure_engines_loaded()
    eng = get_engine("wayne_shorter")
    ir = eng.generate_ir("Test", mode="title", seed=0)
    return eng.compile_from_ir(ir)


def test_score_harmonic_interest_returns_float():
    comp = _make_compiled()
    s = score_harmonic_interest(comp)
    assert isinstance(s, (int, float))
    assert 0 <= s <= 10


def test_score_harmonic_interest_empty():
    class Empty:
        sections = []
        harmony = type("H", (), {"chords": []})()
    s = score_harmonic_interest(Empty())
    assert s == 5.0
