"""Tests for population generator."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from population_composer.population_generator import generate_population
from shared_composer.engine_registry import ensure_engines_loaded


def test_generate_population_returns_population():
    ensure_engines_loaded()
    pop = generate_population("wayne_shorter", population_size=3, seed=0)
    assert pop.generation_number == 0
    assert len(pop.candidates) == 3


def test_generate_population_candidates_scored():
    ensure_engines_loaded()
    pop = generate_population("wayne_shorter", population_size=2, seed=42)
    for c in pop.candidates:
        assert hasattr(c, "composition")
        assert hasattr(c, "score")
        assert hasattr(c, "engine_source")
        assert c.engine_source == "wayne_shorter"
        assert 0 <= c.score <= 10


def test_generate_population_different_seeds_different_compositions():
    ensure_engines_loaded()
    pop = generate_population("wayne_shorter", population_size=2, seed=0)
    comps = [c.composition for c in pop.candidates]
    assert comps[0] is not comps[1]
