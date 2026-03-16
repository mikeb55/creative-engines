"""Tests for Stravinsky Pulse MusicXML exporter."""

from example_compositions import get_example_composition
from musicxml_exporter import export_composition_to_musicxml


def test_stravinsky_export_musicxml():
    comp = get_example_composition(0)
    xml = export_composition_to_musicxml(comp)
    assert "score-partwise" in xml
    assert comp.title in xml


def test_stravinsky_export_has_notes():
    comp = get_example_composition(0)
    xml = export_composition_to_musicxml(comp)
    assert "<note>" in xml
    assert "<pitch>" in xml
