"""Tests for lead_sheet_exporter."""
import pytest
from songwriting_bridge.lead_sheet_types import LeadSheet, VocalMelody, ChordSymbolTrack, LyricAlignment, SongFormSummary
from songwriting_bridge.lead_sheet_exporter import export_lead_sheet_to_musicxml, export_lead_sheet_summary


def test_export_lead_sheet_to_musicxml():
    vm = VocalMelody([{"pitch": 60, "measure": 0, "beat_position": 0, "duration": 1}], "male_tenor", (55, 72), (55, 72))
    cs = ChordSymbolTrack([{"measure": 0, "beat": 0, "chord": "C", "duration": 4}])
    la = LyricAlignment([], "phrase_based", ["verse"])
    fs = SongFormSummary(sections=[])
    ls = LeadSheet("Test", vm, cs, la, fs)
    xml = export_lead_sheet_to_musicxml(ls)
    assert "score-partwise" in xml
    assert "<note>" in xml


def test_export_lead_sheet_summary():
    vm = VocalMelody([], "male_tenor", (55, 72), (55, 72))
    cs = ChordSymbolTrack([])
    la = LyricAlignment([], "phrase_based", [])
    fs = SongFormSummary(sections=[])
    ls = LeadSheet("Test", vm, cs, la, fs)
    s = export_lead_sheet_summary(ls)
    assert s["title"] == "Test"
