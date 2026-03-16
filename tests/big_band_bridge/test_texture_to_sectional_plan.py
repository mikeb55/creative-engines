"""Tests for texture to sectional plan."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from shared_composer.engine_registry import get_engine, ensure_engines_loaded
from texture_to_sectional_plan import translate_texture_to_big_band_sections, build_sectional_texture_layers


def test_translate_texture_to_big_band_sections():
    ensure_engines_loaded()
    ligeti = get_engine("ligeti_texture").generate_ir("Translate", mode="title", seed=0)
    big_band = get_engine("big_band").generate_ir("Translate", mode="title", seed=0)
    out = translate_texture_to_big_band_sections(ligeti, big_band)
    assert isinstance(out, dict)


def test_build_sectional_texture_layers():
    ensure_engines_loaded()
    ligeti = get_engine("ligeti_texture").generate_ir("Layers", mode="title", seed=0)
    big_band = get_engine("big_band").generate_ir("Layers", mode="title", seed=0)
    layers = build_sectional_texture_layers(ligeti, big_band, ligeti.section_order)
    assert layers
    for role, data in layers.items():
        assert "texture_type" in data
        assert "density" in data
