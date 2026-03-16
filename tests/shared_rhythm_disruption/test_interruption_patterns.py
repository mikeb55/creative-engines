"""Tests for shared rhythm/disruption interruption_patterns."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from shared_rhythm_disruption.interruption_patterns import build_interruption_pattern, score_disruption_energy


def test_build_interruption_pattern():
    pat = build_interruption_pattern(0, "abrupt_cut")
    assert pat.positions
    assert pat.types
    assert pat.profile == "abrupt_cut"


def test_score_disruption_energy():
    pat = build_interruption_pattern(0, "zappa_disrupt")
    s = score_disruption_energy(pat)
    assert 0 <= s <= 1
