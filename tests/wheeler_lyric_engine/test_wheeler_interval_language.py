"""Tests for Wheeler Lyric interval language."""
import sys
import os
for m in ("interval_language", "composer_ir"):
    sys.modules.pop(m, None)
_eng = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "engines", "wheeler-lyric-engine"))
sys.path.insert(0, _eng)

from interval_language import (
    build_interval_language,
    derive_lyric_cells,
    score_melodic_lyricism,
)


def test_build_interval_language():
    il = build_interval_language(0, "lyrical_wide")
    assert il.primary_intervals
    assert il.lyric_profile == "lyrical_wide"


def test_derive_lyric_cells():
    il = build_interval_language(0, "sixth_ninth_arc")
    cells = derive_lyric_cells(il)
    assert cells
    assert all(isinstance(c, list) for c in cells)


def test_score_melodic_lyricism():
    il = build_interval_language(0, "suspended_fourths")
    s = score_melodic_lyricism(il)
    assert 0 <= s <= 1
