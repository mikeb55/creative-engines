"""Tests for BH form planner."""

try:
    from .form_planner import plan_form, build_phrase_plan, score_form_interest
except ImportError:
    from form_planner import plan_form, build_phrase_plan, score_form_interest


def test_plan_form_deterministic():
    a = plan_form(42, "aaba_16")
    b = plan_form(42, "aaba_16")
    assert a == b


def test_plan_form_has_phrase_lengths():
    f = plan_form(0, "aaba_16")
    assert "phrase_lengths" in f
    assert sum(f["phrase_lengths"]) == f["total_bars"]


def test_build_phrase_plan():
    form = {"phrase_lengths": [4, 4, 4, 4], "total_bars": 16}
    pp = build_phrase_plan(form, "compact")
    assert pp.phrase_lengths == [4, 4, 4, 4]
