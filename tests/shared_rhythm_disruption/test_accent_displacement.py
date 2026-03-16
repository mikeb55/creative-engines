"""Tests for shared rhythm/disruption accent_displacement."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from shared_rhythm_disruption.accent_displacement import displace_accents, score_accent_instability


def test_displace_accents():
    pattern = [1, 0, 0, 1]
    out = displace_accents(pattern, 1)
    assert len(out) == len(pattern)
    assert out != pattern or pattern == [0, 0, 0, 0]


def test_score_accent_instability():
    s = score_accent_instability([1, 0, 1, 0])
    assert 0 <= s <= 1
