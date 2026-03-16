"""Tests for Zappa Disruption form planner."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "engines", "zappa-disruption-engine"))

from form_planner import plan_form, build_phrase_plan


def test_zappa_plan_form():
    form = plan_form(0, "interruption_form")
    assert "section_order" in form
    assert form["section_order"]
    assert "phrase_lengths" in form


def test_zappa_build_phrase_plan():
    form = plan_form(0, "cut_collage")
    pp = build_phrase_plan(form)
    assert pp.phrase_lengths
    assert pp.total_bars >= 0
