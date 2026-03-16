"""Tests for shared rhythm/disruption pulse_cells."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from shared_rhythm_disruption.pulse_cells import build_pulse_cell, score_pulse_identity


def test_build_pulse_cell():
    cell = build_pulse_cell(0, "stravinsky_pulse")
    assert cell.beats
    assert cell.accents
    assert cell.profile == "stravinsky_pulse"


def test_score_pulse_identity():
    cell = build_pulse_cell(0, "block_contrast")
    s = score_pulse_identity(cell)
    assert 0 <= s <= 1
