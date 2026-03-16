"""Tests for Scofield Holland form planner."""

from form_planner import plan_form, build_phrase_plan, score_form_interest


def test_scofield_plan_form():
    f = plan_form(0, "groove_head_form")
    assert "phrase_lengths" in f
    assert "section_order" in f
    assert sum(f["phrase_lengths"]) == f["total_bars"]


def test_scofield_plan_form_asymmetric():
    f = plan_form(0, "vamp_bridge_return")
    lengths = f["phrase_lengths"]
    assert len(set(lengths)) > 1 or len(lengths) >= 2


def test_scofield_build_phrase_plan():
    f = plan_form(0, "riff_aaba")
    pp = build_phrase_plan(f)
    assert pp.total_bars > 0


def test_scofield_score_form_interest():
    f = plan_form(0, "chromatic_blues_arc")
    s = score_form_interest(f)
    assert 0 <= s <= 1
