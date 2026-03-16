"""Tests for style-adjusted evaluator integration."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from composition_evaluator.composition_evaluator import evaluate_composition
from shared_composer.engine_registry import get_engine, ensure_engines_loaded


def _make_compiled(engine_name: str, seed: int = 0):
    ensure_engines_loaded()
    eng = get_engine(engine_name)
    ir = eng.generate_ir("Test", mode="title", seed=seed)
    return eng.compile_from_ir(ir)


def test_evaluate_without_engine_name_unchanged():
    comp = _make_compiled("wayne_shorter")
    s1 = evaluate_composition(comp)
    s2 = evaluate_composition(comp, engine_name=None)
    assert abs(s1.total_score - s2.total_score) < 0.01


def test_evaluate_with_engine_name_returns_style_fields():
    comp = _make_compiled("wayne_shorter")
    score = evaluate_composition(comp, engine_name="wayne_shorter")
    assert hasattr(score, "style_fit_score")
    assert hasattr(score, "base_score")
    assert score.base_score >= 0


def test_style_adjusted_scores_differ_across_engines():
    scores_by_engine = {}
    for name in ["wayne_shorter", "barry_harris", "andrew_hill", "monk"]:
        comp = _make_compiled(name, seed=0)
        score = evaluate_composition(comp, engine_name=name)
        scores_by_engine[name] = score.total_score
    unique = len(set(round(s, 3) for s in scores_by_engine.values()))
    assert unique >= 2, "Style-adjusted scores should differ across engines"
