"""Tests for section density mapper."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from shared_composer.engine_registry import get_engine, ensure_engines_loaded
from section_density_mapper import map_density_to_sections, assign_density_roles


def test_map_density_to_sections():
    ensure_engines_loaded()
    ligeti = get_engine("ligeti_texture").generate_ir("Density", mode="title", seed=0)
    big_band = get_engine("big_band").generate_ir("Density", mode="title", seed=0)
    density_curve = getattr(ligeti, "density_curve", [0.5, 0.7, 0.4])
    texture_plan = {"density_curve": density_curve}
    form_plan = {"section_order": ligeti.section_order}
    m = map_density_to_sections(texture_plan, form_plan, big_band)
    assert m
    for k, v in m.items():
        assert 0 <= v <= 1.0


def test_assign_density_roles():
    """Test assign_density_roles merges density_map into IR's density_plan."""
    from dataclasses import dataclass
    @dataclass
    class MockIR:
        density_plan: dict
    ir = MockIR(density_plan={"primary": 0.3})
    density_map = {"primary": 0.6, "contrast": 0.8}
    out = assign_density_roles(density_map, ir)
    assert getattr(out, "density_plan", {}).get("primary") == 0.6
    assert getattr(out, "density_plan", {}).get("contrast") == 0.8
