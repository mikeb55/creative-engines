"""Tests for shared rhythm/disruption asymmetrical_cycle_tools."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))

from shared_rhythm_disruption.asymmetrical_cycle_tools import build_asymmetrical_cycle, score_cycle_irregularity


def test_build_asymmetrical_cycle():
    cycle = build_asymmetrical_cycle(0, "ostinato_5_3")
    assert cycle.lengths
    assert cycle.break_points
    assert cycle.profile == "ostinato_5_3"


def test_score_cycle_irregularity():
    cycle = build_asymmetrical_cycle(0, "disrupt_4_3_2")
    s = score_cycle_irregularity(cycle)
    assert 0 <= s <= 1
