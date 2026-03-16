"""Tests for Stravinsky Pulse generator."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines", "stravinsky-pulse-engine"))

from generator import generate_composer_ir_from_title, generate_composer_ir_from_premise, generate_composer_ir_candidates


def test_stravinsky_generate_from_title():
    ir = generate_composer_ir_from_title("Pulse Block", 0)
    assert ir.title == "Pulse Block"
    assert ir.section_order
    assert ir.motivic_cells


def test_stravinsky_generate_from_premise():
    ir = generate_composer_ir_from_premise("dry block study", 0)
    assert ir.title
    assert ir.section_roles


def test_stravinsky_generate_deterministic():
    a = generate_composer_ir_from_title("Test", 42)
    b = generate_composer_ir_from_title("Test", 42)
    assert a.seed == b.seed
    assert a.section_order == b.section_order


def test_stravinsky_generate_candidates():
    cands = generate_composer_ir_candidates("Pulse", count=4, seed=0)
    assert len(cands) == 4
    assert all(c.title for c in cands)
