"""Tests for harmonic exchange."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from shared_composer.engine_registry import get_engine, ensure_engines_loaded
from shared_composer.harmonic_exchange import extract_harmony, translate_harmony_for_engine, inject_harmony


def test_extract_harmony():
    ensure_engines_loaded()
    eng = get_engine("wayne_shorter")
    ir = eng.generate_ir("Test", mode="title", seed=0)
    compiled = eng.compile_from_ir(ir)
    harmony = extract_harmony(compiled)
    assert isinstance(harmony, list)


def test_translate_harmony_for_engine():
    harmony = [{"symbol": "Cm7", "measure": 0, "duration": 4}]
    t = translate_harmony_for_engine(harmony, "barry_harris")
    assert len(t) == 1
    assert "symbol" in t[0]


def test_inject_harmony():
    ensure_engines_loaded()
    eng = get_engine("wayne_shorter")
    ir = eng.generate_ir("Test", mode="title", seed=0)
    harmony = [{"symbol": "Fm7", "measure": 0, "duration": 4}]
    ir2 = inject_harmony(ir, harmony)
    assert ir2 is not None
