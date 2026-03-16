"""Tests for Wheeler Lyric MusicXML exporter."""

from generator import generate_composer_ir_from_title
from section_compiler import compile_composition_from_ir
from musicxml_exporter import export_composition_to_musicxml


def test_export_musicxml():
    ir = generate_composer_ir_from_title("Export Test", seed=0)
    compiled = compile_composition_from_ir(ir)
    xml = export_composition_to_musicxml(compiled)
    assert "<?xml" in xml
    assert "<score-partwise" in xml
    assert "Export Test" in xml
    assert "<measure " in xml


def test_export_has_notes_and_rests():
    ir = generate_composer_ir_from_title("Notes", seed=0)
    compiled = compile_composition_from_ir(ir)
    xml = export_composition_to_musicxml(compiled)
    assert "<note>" in xml
