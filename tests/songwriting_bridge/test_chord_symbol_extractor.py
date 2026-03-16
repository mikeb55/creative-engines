"""Tests for chord_symbol_extractor."""
import pytest
from dataclasses import dataclass
from songwriting_bridge.chord_symbol_extractor import extract_chord_symbols, simplify_harmony_for_lead_sheet


@dataclass
class FakeSection:
    harmony: list
    bar_start: int
    bar_end: int


@dataclass
class FakeCompiled:
    sections: list


def test_extract_chord_symbols():
    sec = FakeSection([{"root": 0, "quality": "major", "measure": 0}], 0, 8)
    comp = FakeCompiled([sec])
    syms = extract_chord_symbols(comp)
    assert len(syms) >= 1


def test_simplify_harmony_for_lead_sheet():
    sec = FakeSection([], 0, 8)
    comp = FakeCompiled([sec])
    syms = simplify_harmony_for_lead_sheet(comp)
    assert len(syms) >= 1
