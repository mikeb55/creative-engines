"""Tests for Zappa Disruption MusicXML exporter."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines", "zappa-disruption-engine"))

from example_compositions import get_example_composition
from musicxml_exporter import export_composition_to_musicxml


def test_zappa_export_musicxml():
    comp = get_example_composition(0)
    xml = export_composition_to_musicxml(comp)
    assert "score-partwise" in xml
    assert comp.title in xml


def test_zappa_export_has_notes():
    comp = get_example_composition(0)
    xml = export_composition_to_musicxml(comp)
    assert "<note>" in xml
    assert "<pitch>" in xml
