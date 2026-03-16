"""Tests for form/texture bridge."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from shared_composer.engine_registry import get_engine, ensure_engines_loaded
from form_texture_bridge import merge_form_and_texture, score_form_texture_fit


def test_merge_form_and_texture():
    ensure_engines_loaded()
    shorter = get_engine("wayne_shorter").generate_ir("Merge Test", mode="title", seed=0)
    ligeti = get_engine("ligeti_texture").generate_ir("Merge Test", mode="title", seed=0)
    big_band = get_engine("big_band").generate_ir("Merge Test", mode="title", seed=0)
    merged = merge_form_and_texture(shorter, ligeti, big_band)
    assert merged.section_order
    assert merged.density_plan
    assert merged.title


def test_score_form_texture_fit():
    ensure_engines_loaded()
    shorter = get_engine("wayne_shorter").generate_ir("Fit", mode="title", seed=0)
    ligeti = get_engine("ligeti_texture").generate_ir("Fit", mode="title", seed=0)
    big_band = get_engine("big_band").generate_ir("Fit", mode="title", seed=0)
    s = score_form_texture_fit(shorter, ligeti, big_band)
    assert 0 <= s <= 1.0
