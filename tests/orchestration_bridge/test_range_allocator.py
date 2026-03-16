"""Tests for range_allocator."""
import pytest
from dataclasses import dataclass
from orchestration_bridge.range_allocator import allocate_registers, assign_parts
from orchestration_bridge.instrument_profiles import get_ensemble_profile


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


def test_allocate_registers():
    sec = FakeSection("A", "primary", 0, 8, [{"pitch": 60, "measure": 0, "beat_position": 0}], [])
    comp = FakeCompiled("Test", [sec])
    profile = get_ensemble_profile("string_quartet")
    alloc = allocate_registers(comp, profile)
    assert len(alloc) == 4
    assert alloc[0]["role"] == "melody"


def test_assign_parts():
    sec = FakeSection("A", "primary", 0, 8, [{"pitch": 60, "measure": 0, "beat_position": 0}], [])
    comp = FakeCompiled("Test", [sec])
    profile = get_ensemble_profile("guitar_trio")
    parts = assign_parts(comp, profile)
    assert len(parts) == 3
    melody_part = next(p for p in parts if p["role"] == "melody")
    assert len(melody_part["events"]) >= 1
