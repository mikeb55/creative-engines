"""Tests for style similarity."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from style_dna.style_similarity import compare_style_profiles, score_composition_against_style
from style_dna.style_profile import StyleProfile
from style_dna.style_dna_analyzer import build_engine_style_profile
from shared_composer.engine_registry import get_engine, ensure_engines_loaded


def test_compare_style_profiles():
    pa = build_engine_style_profile("wayne_shorter", sample_count=2, seed=0)
    pb = build_engine_style_profile("barry_harris", sample_count=2, seed=0)
    sim = compare_style_profiles(pa, pb)
    assert 0 <= sim <= 1


def test_compare_same_engine_profiles():
    pa = build_engine_style_profile("wayne_shorter", sample_count=2, seed=0)
    pb = build_engine_style_profile("wayne_shorter", sample_count=2, seed=1)
    sim = compare_style_profiles(pa, pb)
    assert 0 <= sim <= 1


def test_score_composition_against_style():
    ensure_engines_loaded()
    eng = get_engine("wayne_shorter")
    ir = eng.generate_ir("Test", mode="title", seed=0)
    comp = eng.compile_from_ir(ir)
    profile = build_engine_style_profile("wayne_shorter", sample_count=2, seed=0)
    score = score_composition_against_style(comp, profile)
    assert 0 <= score <= 1
