"""Tests for lead_sheet_types."""
import pytest
from songwriting_bridge.lead_sheet_types import (
    LeadSheet,
    VocalMelody,
    ChordSymbolTrack,
    LyricAlignment,
    SongFormSummary,
)


def test_vocal_melody():
    vm = VocalMelody(events=[], voice_type="male_tenor", original_range=(55, 72), adapted_range=(55, 72))
    assert vm.voice_type == "male_tenor"


def test_chord_symbol_track():
    cs = ChordSymbolTrack(symbols=[{"measure": 0, "chord": "C"}])
    assert len(cs.symbols) == 1


def test_lead_sheet():
    vm = VocalMelody([], "male_tenor", (55, 72), (55, 72))
    cs = ChordSymbolTrack([])
    la = LyricAlignment([], "phrase_based", ["verse"])
    fs = SongFormSummary(sections=[])
    ls = LeadSheet("Test", vm, cs, la, fs)
    assert ls.title == "Test"
