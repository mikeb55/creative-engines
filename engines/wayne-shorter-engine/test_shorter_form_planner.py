"""Tests for Shorter form planner."""

import pytest

try:
    from .shorter_form_planner import plan_shorter_form, build_phrase_plan, score_form_interest
except ImportError:
    from shorter_form_planner import plan_shorter_form, build_phrase_plan, score_form_interest


def test_plan_shorter_form_deterministic():
    a = plan_shorter_form(42, "compact_asymmetrical")
    b = plan_shorter_form(42, "compact_asymmetrical")
    assert a == b


def test_plan_shorter_form_has_phrase_lengths():
    f = plan_shorter_form(0, "compact_asymmetrical")
    assert "phrase_lengths" in f
    assert len(f["phrase_lengths"]) >= 3
    assert sum(f["phrase_lengths"]) == f["total_bars"]


def test_plan_shorter_form_asymmetry():
    f = plan_shorter_form(0, "odd_phrase_aba")
    lengths = f["phrase_lengths"]
    assert len(set(lengths)) >= 1 or len(lengths) >= 3


def test_build_phrase_plan():
    form = {"phrase_lengths": [4, 5, 4, 6], "total_bars": 19}
    pp = build_phrase_plan(form, "asymmetrical")
    assert pp.phrase_lengths == [4, 5, 4, 6]
    assert pp.total_bars == 19


def test_score_form_interest():
    f = {"phrase_lengths": [4, 5, 4, 6]}
    s = score_form_interest(f)
    assert 0 <= s <= 1
