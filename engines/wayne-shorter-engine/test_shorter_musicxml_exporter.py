"""Tests for Shorter MusicXML exporter."""

import pytest

try:
    from .shorter_generator import generate_composer_ir_from_title
    from .shorter_section_compiler import compile_composition_from_ir
    from .shorter_musicxml_exporter import export_composition_to_musicxml
except ImportError:
    from shorter_generator import generate_composer_ir_from_title
    from shorter_section_compiler import compile_composition_from_ir
    from shorter_musicxml_exporter import export_composition_to_musicxml


def test_export_produces_valid_xml():
    ir = generate_composer_ir_from_title("Test", seed=0)
    comp = compile_composition_from_ir(ir)
    xml = export_composition_to_musicxml(comp)
    assert xml.startswith('<?xml version="1.0"')
    assert "<score-partwise" in xml
    assert "</score-partwise>" in xml
    assert "<work-title>Test</work-title>" in xml


def test_export_has_measures():
    ir = generate_composer_ir_from_title("Test", seed=0)
    comp = compile_composition_from_ir(ir)
    xml = export_composition_to_musicxml(comp)
    assert "<measure" in xml
    assert "</measure>" in xml


def test_export_has_notes():
    ir = generate_composer_ir_from_title("Test", seed=0)
    comp = compile_composition_from_ir(ir)
    xml = export_composition_to_musicxml(comp)
    assert "<note>" in xml
    assert "<pitch>" in xml or "<rest/>" in xml


def test_export_deterministic():
    ir = generate_composer_ir_from_title("Test", seed=0)
    comp = compile_composition_from_ir(ir)
    a = export_composition_to_musicxml(comp)
    b = export_composition_to_musicxml(comp)
    assert a == b
