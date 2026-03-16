"""Tests for Monk form planner."""

try:
    from .form_planner import plan_form, build_phrase_plan, score_form_interest
except ImportError:
    from form_planner import plan_form, build_phrase_plan, score_form_interest


def test_plan_form_deterministic():
    a = plan_form(42, "compact_16")
    b = plan_form(42, "compact_16")
    assert a == b


def test_plan_form_has_phrase_lengths():
    f = plan_form(0, "compact_16")
    assert "phrase_lengths" in f
    assert sum(f["phrase_lengths"]) == f["total_bars"]


def test_build_phrase_plan():
    form = {"phrase_lengths": [4, 5, 4, 4], "total_bars": 17}
    pp = build_phrase_plan(form, "compact")
    assert pp.phrase_lengths == [4, 5, 4, 4]
