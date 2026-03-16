"""Tests for Zappa Disruption interval language."""
import sys
import os
for m in ("composer_ir", "interval_language"):
    sys.modules.pop(m, None)
_eng = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "engines", "zappa-disruption-engine"))
sys.path.insert(0, _eng)

from interval_language import build_interval_language


def test_zappa_build_interval_language():
    il = build_interval_language(0, "jagged_cut")
    assert il.primary_intervals
    assert 1 in il.primary_intervals or 6 in il.primary_intervals or 11 in il.primary_intervals

