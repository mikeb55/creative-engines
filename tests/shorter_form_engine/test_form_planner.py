"""Tests for Shorter Form Planner."""

import pytest

from form_planner import (
    plan_form,
    build_phrase_plan,
    score_form_interest,
)


def test_plan_form():
    fp = plan_form(42, "narrative_arc_form")
    assert "phrase_lengths" in fp
    assert "section_order" in fp
    assert "total_bars" in fp
    assert fp["phrase_lengths"]
    assert fp["section_order"]


def test_profiles():
    for p in ["narrative_arc_form", "modular_shorter_form", "asymmetric_cycle_form", "transformed_return_form", "episode_variation_form"]:
        fp = plan_form(0, p)
        assert fp["profile"] == p


def test_phrase_groups():
    fp = plan_form(0, "narrative_arc_form")
    lengths = fp["phrase_lengths"]
    assert all(L >= 5 for L in lengths)


def test_build_phrase_plan():
    fp = plan_form(0, "narrative_arc_form")
    pp = build_phrase_plan(fp)
    assert pp.phrase_lengths
    assert pp.total_bars > 0
    assert pp.asymmetry_level > 0


def test_score_form_interest():
    fp = plan_form(0, "narrative_arc_form")
    s = score_form_interest(fp)
    assert 0 <= s <= 1
