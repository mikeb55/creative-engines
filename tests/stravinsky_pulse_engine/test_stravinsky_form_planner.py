"""Tests for Stravinsky Pulse form planner."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines", "stravinsky-pulse-engine"))

from form_planner import plan_form, build_phrase_plan


def test_stravinsky_plan_form():
    form = plan_form(0, "block_contrast")
    assert "section_order" in form
    assert form["section_order"]
    assert "phrase_lengths" in form


def test_stravinsky_build_phrase_plan():
    form = plan_form(0, "pulse_arc")
    pp = build_phrase_plan(form)
    assert pp.phrase_lengths
    assert pp.total_bars >= 0
