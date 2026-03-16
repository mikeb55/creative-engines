"""Tests for Shorter Form MusicXML Exporter."""

import pytest
import tempfile
import os

from generator import generate_composer_ir_from_title
from section_compiler import compile_composition_from_ir
from musicxml_exporter import export_composition_to_musicxml


def test_export_returns_xml():
    ir = generate_composer_ir_from_title("Export Test", seed=0)
    compiled = compile_composition_from_ir(ir)
    xml = export_composition_to_musicxml(compiled)
    assert "<score-partwise" in xml
    assert "Export Test" in xml
    assert "<part-list>" in xml
    assert "<measure" in xml
    assert "<note>" in xml


def test_export_to_path():
    ir = generate_composer_ir_from_title("Path Test", seed=0)
    compiled = compile_composition_from_ir(ir)
    with tempfile.NamedTemporaryFile(suffix=".musicxml", delete=False) as f:
        path = f.name
    try:
        export_composition_to_musicxml(compiled, path=path)
        with open(path, encoding="utf-8") as f:
            content = f.read()
        assert "<score-partwise" in content
    finally:
        if os.path.exists(path):
            os.unlink(path)


def test_export_contains_tempo():
    ir = generate_composer_ir_from_title("Tempo", seed=0)
    compiled = compile_composition_from_ir(ir)
    xml = export_composition_to_musicxml(compiled)
    assert "per-minute" in xml or "tempo" in xml
