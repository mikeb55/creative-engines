"""Tests for form interest scoring."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from composition_evaluator.form_interest_score import score_form_interest
from shared_composer.engine_registry import get_engine, ensure_engines_loaded


def _make_compiled():
    ensure_engines_loaded()
    eng = get_engine("wayne_shorter")
    ir = eng.generate_ir("Test", mode="title", seed=0)
    return eng.compile_from_ir(ir)


def test_score_form_interest_returns_float():
    comp = _make_compiled()
    s = score_form_interest(comp)
    assert isinstance(s, (int, float))
    assert 0 <= s <= 10


def test_score_form_interest_empty():
    class Empty:
        sections = []
    s = score_form_interest(Empty())
    assert s == 5.0
