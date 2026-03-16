"""End-to-end tests for Stravinsky Pulse engine."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from shared_composer.engine_registry import get_engine, list_engines, ensure_engines_loaded


def test_stravinsky_registered():
    ensure_engines_loaded()
    assert "stravinsky_pulse" in list_engines()


def test_stravinsky_end_to_end_generation():
    eng = get_engine("stravinsky_pulse")
    ir = eng.generate_ir("Pulse Block Study", mode="title", seed=0)
    compiled = eng.compile_from_ir(ir)
    xml = eng.export_musicxml(compiled)
    assert "score-partwise" in xml
    assert compiled.sections


def test_stravinsky_validate_ir():
    eng = get_engine("stravinsky_pulse")
    ir = eng.generate_ir("Validate", mode="title", seed=0)
    r = eng.validate_ir(ir)
    assert r.valid
