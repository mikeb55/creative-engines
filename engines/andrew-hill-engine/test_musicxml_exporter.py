"""Tests for Hill MusicXML exporter."""

try:
    from .generator import generate_composer_ir_from_title
    from .section_compiler import compile_composition_from_ir
    from .musicxml_exporter import export_composition_to_musicxml
except ImportError:
    from generator import generate_composer_ir_from_title
    from section_compiler import compile_composition_from_ir
    from musicxml_exporter import export_composition_to_musicxml


def test_export_produces_valid_xml():
    ir = generate_composer_ir_from_title("Test", seed=0)
    comp = compile_composition_from_ir(ir)
    xml = export_composition_to_musicxml(comp)
    assert xml.startswith('<?xml version="1.0"')
    assert "<score-partwise" in xml
    assert "</score-partwise>" in xml


def test_export_has_measures_and_notes():
    ir = generate_composer_ir_from_title("Test", seed=0)
    comp = compile_composition_from_ir(ir)
    xml = export_composition_to_musicxml(comp)
    assert "<measure" in xml
    assert "<note>" in xml
