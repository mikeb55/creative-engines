"""Tests for texture_mapper."""
import pytest
from dataclasses import dataclass
from orchestration_bridge.texture_mapper import map_texture_strategy, assign_texture_layers
from orchestration_bridge.instrument_profiles import get_ensemble_profile


@dataclass
class FakeSection:
    melody_events: list
    harmony: list


@dataclass
class FakeCompiled:
    sections: list


def test_map_texture_strategy():
    comp = FakeCompiled([FakeSection([], [])])
    profile = get_ensemble_profile("chamber_jazz_sextet")
    strat = map_texture_strategy(comp, profile)
    assert strat in ["unison", "melody + pad", "melody + counterline", "polyphonic chamber", "sectional spread"]


def test_assign_texture_layers():
    comp = FakeCompiled([FakeSection([{"pitch": 60}], [])])
    profile = get_ensemble_profile("guitar_trio")
    layers = assign_texture_layers(comp, profile)
    assert len(layers) == 3
