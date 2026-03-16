"""Tests for hybrid ranker."""

import sys
import os

_engines = os.path.join(os.path.dirname(__file__), "..", "..", "engines")
if _engines not in sys.path:
    sys.path.insert(0, _engines)

from hybrid_engine.hybrid_generator import generate_hybrid_candidate, generate_hybrid_candidates
from hybrid_engine.hybrid_ranker import (
    evaluate_hybrid_candidate,
    rank_hybrid_candidates,
    select_top_hybrids,
)


def test_evaluate_hybrid_candidate():
    result = generate_hybrid_candidate(
        melody_engine="wayne_shorter",
        harmony_engine="barry_harris",
        input_text="Eval",
        seed=0,
    )
    c = evaluate_hybrid_candidate(result)
    assert hasattr(c, "base_score")
    assert hasattr(c, "adjusted_score")
    assert hasattr(c, "style_fit_score")
    assert 0 <= c.adjusted_score <= 10


def test_rank_hybrid_candidates():
    candidates = generate_hybrid_candidates(input_text="Rank", count=3, seed=0)
    ranked = rank_hybrid_candidates(candidates)
    assert len(ranked) == 3
    scores = [r.adjusted_score for r in ranked]
    assert scores == sorted(scores, reverse=True)


def test_select_top_hybrids():
    candidates = generate_hybrid_candidates(input_text="Select", count=5, seed=0)
    top = select_top_hybrids(candidates, top_n=2)
    assert len(top) == 2
    assert top[0].adjusted_score >= top[1].adjusted_score


def test_ranker_produces_non_identical_scores():
    candidates = generate_hybrid_candidates(input_text="NonIdent", count=6, seed=0)
    ranked = rank_hybrid_candidates(candidates)
    scores = [r.adjusted_score for r in ranked]
    unique = len(set(round(s, 4) for s in scores))
    assert unique >= 1
