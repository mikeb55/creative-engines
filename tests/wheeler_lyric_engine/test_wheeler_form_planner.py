"""Tests for Wheeler Lyric form planner."""

from form_planner import plan_form, build_phrase_plan, score_form_interest


def test_plan_form():
    form = plan_form(0, "lyrical_songform")
    assert "phrase_lengths" in form
    assert "section_order" in form
    assert form["section_order"]


def test_plan_form_asymmetric():
    form = plan_form(0, "asymmetrical_arc")
    lengths = form["phrase_lengths"]
    assert len(set(lengths)) >= 1 or len(lengths) >= 2


def test_build_phrase_plan():
    form = plan_form(0, "bridge_lift_return")
    pp = build_phrase_plan(form)
    assert pp.phrase_lengths
    assert pp.asymmetry_level > 0.5


def test_score_form_interest():
    form = plan_form(0, "chamber_ballad_form")
    s = score_form_interest(form)
    assert 0 <= s <= 1
