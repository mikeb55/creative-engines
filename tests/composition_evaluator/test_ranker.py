"""Tests for composition ranker."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from composition_evaluator.composition_ranker import rank_compositions
from shared_composer.engine_registry import get_engine, ensure_engines_loaded


def _make_compiled(seed: int):
    ensure_engines_loaded()
    eng = get_engine("wayne_shorter")
    ir = eng.generate_ir("Test", mode="title", seed=seed)
    return eng.compile_from_ir(ir)


def test_rank_compositions_returns_sorted():
    comps = [_make_compiled(i) for i in range(3)]
    ranked = rank_compositions(comps)
    assert len(ranked) == 3
    scores = [s.total_score for _, s in ranked]
    assert scores == sorted(scores, reverse=True)


def test_rank_compositions_pairs():
    comps = [_make_compiled(0)]
    ranked = rank_compositions(comps)
    assert len(ranked) == 1
    comp, score = ranked[0]
    assert comp is comps[0]
    assert 0 <= score.total_score <= 10


def test_rank_compositions_empty():
    ranked = rank_compositions([])
    assert ranked == []
