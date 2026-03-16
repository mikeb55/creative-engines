"""Tests for ensemble_planner."""
import pytest
from dataclasses import dataclass
from orchestration_bridge.ensemble_planner import plan_ensemble_arrangement


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


def test_plan_ensemble_arrangement():
    sec = FakeSection("A", "primary", 0, 8, [{"pitch": 60, "measure": 0, "beat_position": 0}], [])
    comp = FakeCompiled("Test", [sec])
    arr = plan_ensemble_arrangement(comp, "string_quartet", seed=0)
    assert "parts" in arr
    assert "strategy" in arr
    assert arr["ensemble_type"] == "string_quartet"


def test_plan_ensemble_unknown():
    comp = FakeCompiled("Test", [])
    arr = plan_ensemble_arrangement(comp, "unknown", seed=0)
    assert arr["parts"] == []
