"""Tests for hybrid population runtime."""

import sys
import os

_engines = os.path.join(os.path.dirname(__file__), "..", "..", "engines")
if _engines not in sys.path:
    sys.path.insert(0, _engines)

from hybrid_engine.hybrid_population_runtime import (
    run_hybrid_population_search,
    export_top_hybrids,
)
import tempfile


def test_run_hybrid_population_search():
    top = run_hybrid_population_search(
        input_text="Runtime Test",
        count=4,
        generations=1,
        top_n=3,
        seed=0,
    )
    assert len(top) <= 3
    assert len(top) >= 1
    for c in top:
        assert hasattr(c, "adjusted_score")
        assert hasattr(c, "compiled_result")
        assert c.compiled_result.get("compiled")


def test_export_top_hybrids():
    top = run_hybrid_population_search(
        input_text="Export Test",
        count=2,
        generations=1,
        top_n=2,
        seed=0,
    )
    with tempfile.TemporaryDirectory() as d:
        paths = export_top_hybrids(top, output_dir=d, prefix="test_hybrid")
        assert len(paths) == len(top)
        for p in paths:
            assert os.path.exists(p)
            with open(p, encoding="utf-8") as f:
                xml = f.read()
            assert "<score-partwise" in xml
