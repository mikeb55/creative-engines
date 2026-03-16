"""Tests for hybrid planner."""

import sys
import os

_engines = os.path.join(os.path.dirname(__file__), "..", "..", "engines")
if _engines not in sys.path:
    sys.path.insert(0, _engines)

from hybrid_engine.hybrid_planner import plan_hybrid_composition
from hybrid_engine.hybrid_composer_ir import HybridComposerIR
from hybrid_engine.hybrid_section_compiler import compile_hybrid_composition
from hybrid_engine.hybrid_musicxml_exporter import export_hybrid_to_musicxml


def test_plan_hybrid_composition():
    h = plan_hybrid_composition(
        melody_engine="wayne_shorter",
        harmony_engine="barry_harris",
        seed=0,
        title="Hybrid Test",
    )
    assert isinstance(h, HybridComposerIR)
    assert h.primary_engine == "wayne_shorter"
    assert h.harmony_engine == "barry_harris"
    assert h.title == "Hybrid Test"


def test_plan_hybrid_produces_valid_ir():
    h = plan_hybrid_composition(melody_engine="wayne_shorter", harmony_engine="monk", seed=42)
    assert h.section_order
    assert h.phrase_plan


def test_compile_hybrid_composition():
    h = plan_hybrid_composition(melody_engine="wayne_shorter", harmony_engine="barry_harris", seed=0)
    result = compile_hybrid_composition(h, "Hybrid Test")
    assert "compiled" in result
    assert result["compiled"].sections


def test_export_hybrid_musicxml():
    h = plan_hybrid_composition(melody_engine="wayne_shorter", harmony_engine="barry_harris", seed=0)
    result = compile_hybrid_composition(h, "Hybrid Test")
    xml = export_hybrid_to_musicxml(result)
    assert "<score-partwise" in xml
    assert "Hybrid Test" in xml
