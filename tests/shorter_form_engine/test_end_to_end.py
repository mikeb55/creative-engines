"""End-to-end tests for Shorter Form Engine."""

import pytest
import os

from generator import generate_composer_ir_from_title
from composer_ir_validator import validate_composer_ir
from section_compiler import compile_composition_from_ir
from musicxml_exporter import export_composition_to_musicxml
from example_compositions import run_examples


def test_full_pipeline():
    ir = generate_composer_ir_from_title("Full Pipeline", seed=0)
    r = validate_composer_ir(ir)
    assert r.valid, r.errors
    compiled = compile_composition_from_ir(ir)
    xml = export_composition_to_musicxml(compiled)
    assert "<score-partwise" in xml
    assert compiled.sections


def test_example_compositions():
    run_examples()


def test_self_check_export():
    ir = generate_composer_ir_from_title("Self-Check", seed=123)
    r = validate_composer_ir(ir)
    assert r.valid
    compiled = compile_composition_from_ir(ir)
    out_dir = os.path.join(os.path.dirname(__file__), "..", "..", "output")
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, "shorter_form_self_check.musicxml")
    export_composition_to_musicxml(compiled, path=path)
    assert os.path.exists(path)
