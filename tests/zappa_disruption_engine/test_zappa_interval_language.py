"""Tests for Zappa Disruption interval language."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines", "zappa-disruption-engine"))

from interval_language import build_interval_language


def test_zappa_build_interval_language():
    il = build_interval_language(0, "jagged_cut")
    assert il.primary_intervals
    assert 1 in il.primary_intervals or 6 in il.primary_intervals or 11 in il.primary_intervals

