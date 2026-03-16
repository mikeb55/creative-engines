"""Tests for Stravinsky Pulse interval language."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines", "stravinsky-pulse-engine"))

from interval_language import build_interval_language


def test_stravinsky_build_interval_language():
    il = build_interval_language(0, "pulse_fifth")
    assert il.primary_intervals
    assert il.tension_profile == "pulse_fifth"


def test_stravinsky_interval_profile():
    il = build_interval_language(0, "sharp_second")
    assert il.tension_profile == "sharp_second"
