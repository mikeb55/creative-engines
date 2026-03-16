"""Tests for Zappa Disruption composer IR."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines", "zappa-disruption-engine"))

from composer_ir import ComposerIR
from composer_ir_validator import validate_composer_ir


def test_zappa_composer_ir_has_required_fields():
    ir = ComposerIR(title="Test", seed=0)
    assert ir.title == "Test"
    assert ir.section_order
    assert ir.motivic_cells is not None


def test_zappa_validate_composer_ir_valid():
    ir = ComposerIR(title="Valid", seed=0)
    r = validate_composer_ir(ir)
    assert r.valid


def test_zappa_validate_composer_ir_invalid_title():
    ir = ComposerIR(title="", seed=0)
    r = validate_composer_ir(ir)
    assert not r.valid
