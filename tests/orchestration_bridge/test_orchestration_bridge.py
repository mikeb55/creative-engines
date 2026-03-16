"""Tests for orchestration_bridge."""
import pytest
from dataclasses import dataclass
from orchestration_bridge.orchestration_bridge import orchestrate_composition, orchestrate_population


@dataclass
class FakeSection:
    section_id: str
    role: str
    bar_start: int
    bar_end: int
    melody_events: list
    harmony: list


@dataclass
class FakeCompiled:
    title: str
    sections: list
    metadata: dict


def test_orchestrate_composition():
    sec = FakeSection("A", "primary", 0, 8, [{"pitch": 60, "measure": 0, "beat_position": 0, "duration": 1}], [])
    comp = FakeCompiled("Test", [sec], {"tempo": 90})
    arr = orchestrate_composition(comp, "guitar_trio", seed=0)
    assert "musicxml" in arr
    assert "score-partwise" in arr["musicxml"]


def test_orchestrate_population():
    sec = FakeSection("A", "primary", 0, 8, [{"pitch": 60, "measure": 0, "beat_position": 0}], [])
    comp = FakeCompiled("Test", [sec], {})
    results = orchestrate_population([comp, comp], "string_quartet", seed=0)
    assert len(results) == 2
