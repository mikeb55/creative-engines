"""Tests for style feature extractor."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from style_dna.style_feature_extractor import (
    extract_interval_fingerprint,
    extract_harmonic_fingerprint,
    extract_motif_fingerprint,
    extract_form_fingerprint,
    extract_rhythm_fingerprint,
    extract_asymmetry_fingerprint,
)
from shared_composer.engine_registry import get_engine, ensure_engines_loaded


def _make_compiled(engine_name: str, seed: int = 0):
    ensure_engines_loaded()
    eng = get_engine(engine_name)
    ir = eng.generate_ir("Test", mode="title", seed=seed)
    return eng.compile_from_ir(ir)


def test_extract_interval_fingerprint():
    comp = _make_compiled("wayne_shorter")
    fp = extract_interval_fingerprint(comp)
    assert isinstance(fp, dict)
    assert "step_ratio" in fp
    assert "leap_ratio" in fp
    assert 0 <= fp["step_ratio"] <= 1
    assert 0 <= fp["leap_ratio"] <= 1


def test_extract_harmonic_fingerprint():
    comp = _make_compiled("wayne_shorter")
    fp = extract_harmonic_fingerprint(comp)
    assert isinstance(fp, dict)
    assert "unique_roots" in fp or "m7_ratio" in fp


def test_extract_motif_fingerprint():
    comp = _make_compiled("wayne_shorter")
    fp = extract_motif_fingerprint(comp)
    assert isinstance(fp, dict)
    assert "reuse" in fp or "variation" in fp


def test_extract_form_fingerprint():
    comp = _make_compiled("wayne_shorter")
    fp = extract_form_fingerprint(comp)
    assert isinstance(fp, dict)
    assert "phrase_spread" in fp or "odd_ratio" in fp


def test_extract_rhythm_fingerprint():
    comp = _make_compiled("wayne_shorter")
    fp = extract_rhythm_fingerprint(comp)
    assert isinstance(fp, dict)


def test_extract_asymmetry_fingerprint():
    comp = _make_compiled("wayne_shorter")
    fp = extract_asymmetry_fingerprint(comp)
    assert isinstance(fp, dict)
    assert "irreg" in fp or "odd_ratio" in fp
