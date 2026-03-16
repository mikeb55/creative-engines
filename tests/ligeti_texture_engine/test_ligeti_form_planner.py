"""Tests for Ligeti Texture form planner."""

from form_planner import plan_form, build_phrase_plan, score_form_interest


def test_plan_form():
    f = plan_form(0, "density_arc")
    assert "phrase_lengths" in f
    assert "section_order" in f
    assert "total_bars" in f


def test_build_phrase_plan():
    f = plan_form(0, "density_arc")
    pp = build_phrase_plan(f, "asymmetric")
    assert pp.phrase_lengths
    assert pp.asymmetry_level > 0


def test_score_form_interest():
    f = plan_form(0, "density_arc")
    s = score_form_interest(f)
    assert 0 <= s <= 1.0
