"""Tests for style DNA analyzer."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from style_dna.style_dna_analyzer import (
    build_engine_style_profile,
    build_all_style_profiles,
    analyze_composition_style,
)
from shared_composer.engine_registry import get_engine, ensure_engines_loaded


def test_build_engine_style_profile():
    p = build_engine_style_profile("wayne_shorter", sample_count=2, seed=0)
    assert p.engine_name == "wayne_shorter"
    assert p.interval_fingerprint
    assert p.harmonic_fingerprint
    assert p.motif_fingerprint
    assert p.form_fingerprint
    assert p.rhythm_fingerprint
    assert p.asymmetry_fingerprint


def test_build_all_style_profiles():
    profiles = build_all_style_profiles(sample_count=2, seed=0)
    assert "wayne_shorter" in profiles
    assert "barry_harris" in profiles
    assert "andrew_hill" in profiles
    assert "monk" in profiles


def test_profiles_are_distinct():
    profiles = build_all_style_profiles(sample_count=3, seed=0)
    ws = profiles.get("wayne_shorter")
    bh = profiles.get("barry_harris")
    if ws and bh:
        assert ws.interval_fingerprint != bh.interval_fingerprint or ws.harmonic_fingerprint != bh.harmonic_fingerprint


def test_analyze_composition_style():
    ensure_engines_loaded()
    eng = get_engine("wayne_shorter")
    ir = eng.generate_ir("Test", mode="title", seed=0)
    comp = eng.compile_from_ir(ir)
    fit = analyze_composition_style(comp, "wayne_shorter")
    assert 0 <= fit <= 1
