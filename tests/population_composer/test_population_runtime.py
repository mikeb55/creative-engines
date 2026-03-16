"""Tests for population runtime."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from population_composer.population_runtime import run_population_search


def test_run_population_search_returns_candidates():
    best = run_population_search(
        engine_name="wayne_shorter",
        population_size=4,
        generations=2,
        seed=0,
    )
    assert len(best) >= 1
    assert len(best) <= 4


def test_run_population_search_candidates_have_scores():
    best = run_population_search(
        engine_name="wayne_shorter",
        population_size=3,
        generations=2,
        seed=42,
    )
    for c in best:
        assert hasattr(c, "composition")
        assert hasattr(c, "score")
        assert hasattr(c, "engine_source")
        assert 0 <= c.score <= 10


def test_run_population_search_sorted_by_score():
    best = run_population_search(
        engine_name="wayne_shorter",
        population_size=4,
        generations=2,
        seed=7,
    )
    scores = [c.score for c in best]
    assert scores == sorted(scores, reverse=True)
