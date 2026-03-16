"""Tests for Messiaen Colour section compiler."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines", "messiaen-colour-engine"))

from generator import generate_composer_ir_from_title
from section_compiler import compile_composition_from_ir


def test_messiaen_compile_composition():
    ir = generate_composer_ir_from_title("Mode-2 Colour Panel", 0)
    comp = compile_composition_from_ir(ir)
    assert comp.sections
    assert comp.title == "Mode-2 Colour Panel"


def test_messiaen_compile_deterministic():
    ir = generate_composer_ir_from_title("Test", 0)
    a = compile_composition_from_ir(ir)
    b = compile_composition_from_ir(ir)
    assert len(a.sections) == len(b.sections)
    assert a.melody.events and b.melody.events
