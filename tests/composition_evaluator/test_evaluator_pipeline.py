"""Tests for evaluator pipeline."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from composition_evaluator.composition_evaluator import evaluate_composition
from shared_composer.engine_registry import get_engine, ensure_engines_loaded


def _make_compiled():
    ensure_engines_loaded()
    eng = get_engine("wayne_shorter")
    ir = eng.generate_ir("Test", mode="title", seed=0)
    return eng.compile_from_ir(ir)


def test_evaluate_composition_returns_composition_score():
    comp = _make_compiled()
    score = evaluate_composition(comp)
    assert hasattr(score, "total_score")
    assert hasattr(score, "motif_score")
    assert hasattr(score, "harmony_score")
    assert hasattr(score, "interval_score")
    assert hasattr(score, "form_score")
    assert hasattr(score, "voice_leading_score")
    assert hasattr(score, "asymmetry_score")
    assert hasattr(score, "breakdown")


def test_evaluate_composition_scores_in_range():
    comp = _make_compiled()
    score = evaluate_composition(comp)
    assert 0 <= score.total_score <= 10
    assert 0 <= score.motif_score <= 10
    assert 0 <= score.harmony_score <= 10
    assert 0 <= score.interval_score <= 10
    assert 0 <= score.form_score <= 10
    assert 0 <= score.voice_leading_score <= 10
    assert 0 <= score.asymmetry_score <= 10


def test_evaluate_composition_breakdown():
    comp = _make_compiled()
    score = evaluate_composition(comp)
    assert "motif" in score.breakdown
    assert "harmony" in score.breakdown
    assert "interval" in score.breakdown
    assert "form" in score.breakdown
    assert "voice_leading" in score.breakdown
    assert "asymmetry" in score.breakdown


def test_evaluate_composition_deterministic():
    comp = _make_compiled()
    s1 = evaluate_composition(comp)
    s2 = evaluate_composition(comp)
    assert s1.total_score == s2.total_score
