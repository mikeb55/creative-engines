"""Tests for Big Band bridge runtime."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from big_band_bridge_runtime import run_big_band_form_texture_bridge


def test_run_big_band_form_texture_bridge():
    result = run_big_band_form_texture_bridge(
        "Bridge Test",
        form_seed=0,
        texture_seed=0,
        ensemble_seed=0,
    )
    assert "form_ir" in result
    assert "texture_ir" in result
    assert "big_band_ir" in result
    assert "merged_ir" in result
    assert "compiled" in result
    assert "musicxml" in result
    assert result["compiled"].sections
    assert "<score-partwise" in result["musicxml"]
