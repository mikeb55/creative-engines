"""Tests for selection engine."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from population_composer.population_types import Population, PopulationCandidate
from population_composer.selection_engine import select_top_candidates


def _make_candidate(score: float):
    return PopulationCandidate(composition=None, score=score, engine_source="test")


def test_select_top_candidates_returns_highest():
    pop = Population(
        candidates=[
            _make_candidate(3.0),
            _make_candidate(7.0),
            _make_candidate(5.0),
        ],
        generation_number=0,
    )
    top = select_top_candidates(pop, 2)
    assert len(top) == 2
    assert top[0].score == 7.0
    assert top[1].score == 5.0


def test_select_top_candidates_top_n_larger_than_population():
    pop = Population(candidates=[_make_candidate(1.0)], generation_number=0)
    top = select_top_candidates(pop, 5)
    assert len(top) == 1
    assert top[0].score == 1.0


def test_select_top_candidates_empty_population():
    pop = Population(candidates=[], generation_number=0)
    top = select_top_candidates(pop, 3)
    assert top == []
