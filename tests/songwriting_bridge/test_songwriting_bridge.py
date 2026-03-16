"""Tests for songwriting_bridge."""
import pytest
from dataclasses import dataclass
from songwriting_bridge.songwriting_bridge import build_lead_sheet_from_composition, build_lead_sheets_from_population


@dataclass
class FakeSection:
    role: str
    bar_start: int
    bar_end: int
    melody_events: list
    harmony: list


@dataclass
class FakeCompiled:
    title: str
    sections: list


def test_build_lead_sheet_from_composition():
    sec = FakeSection("primary", 0, 8, [{"pitch": 60, "measure": 0, "beat_position": 0}], [])
    comp = FakeCompiled("Test", [sec])
    ls = build_lead_sheet_from_composition(comp, "male_tenor")
    assert ls.title == "Test"
    assert len(ls.vocal_melody.events) >= 1


def test_build_lead_sheets_from_population():
    sec = FakeSection("primary", 0, 8, [{"pitch": 60, "measure": 0}], [])
    comp = FakeCompiled("Test", [sec])
    sheets = build_lead_sheets_from_population([comp], "male_tenor")
    assert len(sheets) == 1
