"""Tests for voice assignment."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from hybrid_engine.hybrid_composer_ir import HybridComposerIR
from hybrid_engine.voice_assignment import assign_voice_roles, assign_register_ranges


def test_assign_voice_roles():
    ir = HybridComposerIR(primary_engine="wayne_shorter", harmony_engine="barry_harris")
    roles = assign_voice_roles(ir)
    assert roles
    assert any(r.role == "lead" for r in roles)


def test_assign_register_ranges():
    ir = HybridComposerIR(primary_engine="wayne_shorter", harmony_engine="barry_harris")
    ranges = assign_register_ranges(ir)
    assert "lead" in ranges
    assert "counterline" in ranges
    assert len(ranges["lead"]) == 2
