"""Tests for asymmetry scoring."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from composition_evaluator.asymmetry_score import score_asymmetry
from shared_composer.engine_registry import get_engine, ensure_engines_loaded


def _make_compiled():
    ensure_engines_loaded()
    eng = get_engine("wayne_shorter")
    ir = eng.generate_ir("Test", mode="title", seed=0)
    return eng.compile_from_ir(ir)


def test_score_asymmetry_returns_float():
    comp = _make_compiled()
    s = score_asymmetry(comp)
    assert isinstance(s, (int, float))
    assert 0 <= s <= 10


def test_score_asymmetry_empty():
    class Empty:
        sections = []
        melody = type("M", (), {"events": []})()
    s = score_asymmetry(Empty())
    assert 0 <= s <= 10
