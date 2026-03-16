"""Tests for hybrid generator."""

import sys
import os

_engines = os.path.join(os.path.dirname(__file__), "..", "..", "engines")
if _engines not in sys.path:
    sys.path.insert(0, _engines)

from hybrid_engine.hybrid_generator import generate_hybrid_candidate, generate_hybrid_candidates


def test_generate_hybrid_candidate():
    result = generate_hybrid_candidate(
        melody_engine="wayne_shorter",
        harmony_engine="barry_harris",
        input_text="Test",
        seed=0,
    )
    assert "compiled" in result
    assert "melody_engine" in result
    assert "harmony_engine" in result
    assert result["melody_engine"] == "wayne_shorter"
    assert result["harmony_engine"] == "barry_harris"
    assert result["compiled"].sections


def test_generate_hybrid_candidates():
    candidates = generate_hybrid_candidates(input_text="Candidates", count=4, seed=0)
    assert len(candidates) == 4
    engines = [(c["melody_engine"], c["harmony_engine"]) for c in candidates]
    assert len(set(engines)) >= 1


def test_deterministic_same_seed():
    a = generate_hybrid_candidates(input_text="Det", count=2, seed=42)
    b = generate_hybrid_candidates(input_text="Det", count=2, seed=42)
    assert len(a) == len(b)
    for i in range(len(a)):
        assert a[i]["melody_engine"] == b[i]["melody_engine"]
        assert a[i]["harmony_engine"] == b[i]["harmony_engine"]
