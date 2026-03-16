"""End-to-end tests for hybrid engine."""

import sys
import os

_engines = os.path.join(os.path.dirname(__file__), "..", "..", "engines")
if _engines not in sys.path:
    sys.path.insert(0, _engines)

from hybrid_engine.hybrid_planner import plan_hybrid_composition
from hybrid_engine.hybrid_section_compiler import compile_hybrid_composition
from hybrid_engine.hybrid_musicxml_exporter import export_hybrid_to_musicxml
from hybrid_engine.hybrid_population_runtime import run_hybrid_population_search, export_top_hybrids
import tempfile


def test_hybrid_end_to_end_compile_export():
    h = plan_hybrid_composition(
        melody_engine="wayne_shorter",
        harmony_engine="barry_harris",
        seed=0,
        title="E2E Test",
    )
    result = compile_hybrid_composition(h, "E2E Test")
    xml = export_hybrid_to_musicxml(result)
    assert "<score-partwise" in xml
    assert "E2E Test" in xml
    assert "<part " in xml


def test_hybrid_search_exports_valid_musicxml():
    top = run_hybrid_population_search(
        input_text="Search Export",
        count=3,
        generations=1,
        top_n=2,
        seed=0,
    )
    assert len(top) >= 1
    with tempfile.TemporaryDirectory() as d:
        paths = export_top_hybrids(top, output_dir=d)
        for p in paths:
            with open(p, encoding="utf-8") as f:
                xml = f.read()
            assert "<?xml" in xml
            assert "<score-partwise" in xml
            assert "<measure " in xml
