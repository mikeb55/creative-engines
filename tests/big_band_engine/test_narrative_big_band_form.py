"""Tests for narrative_big_band_form module."""

from form_modules.narrative_big_band_form import (
    build_narrative_form_plan,
    score_narrative_form_interest,
    choose_next_state,
    build_solo_environment,
    score_solo_environment,
    get_section_function,
    map_narrative_to_big_band_sections,
    FORM_ARCHETYPES,
    PHRASE_ARCHETYPES,
    CODA_TYPES,
    RECAP_ARCHETYPES,
)
from form_planner import plan_form


def test_both_archetypes_build_valid_plans():
    for arch in ["luminous_arc_form", "transformed_return_form"]:
        plan = build_narrative_form_plan(42, arch)
        assert plan["profile"] == arch
        assert plan["section_order"]
        assert plan["phrase_lengths"]
        assert plan["total_bars"] == sum(plan["phrase_lengths"])
        assert len(plan["section_order"]) == len(plan["phrase_lengths"])
        assert plan["section_roles"]


def test_state_transitions_valid():
    plan = build_narrative_form_plan(0, "luminous_arc_form")
    next_s = choose_next_state("IntroAtmosphere", {"density": 0.5}, 0)
    assert next_s == "Exposition"
    next_s = choose_next_state("Coda", {}, 0)
    assert next_s is None
    next_s = choose_next_state("Exposition", {}, 1)
    assert next_s == "TransitionalBuild"


def test_section_functions_populated():
    for arch in ["luminous_arc_form", "transformed_return_form"]:
        for sec_id in ["IntroAtmosphere", "Exposition", "Recomposition", "Coda"]:
            meta = get_section_function(sec_id, arch)
            assert meta
            assert "function" in meta
            assert "duration_range" in meta
            assert "density" in meta


def test_recap_rules_transform():
    for name, rules in RECAP_ARCHETYPES.items():
        assert "what_returns" in rules
        assert "what_changes" in rules
        assert "register_shift" in rules
        assert "texture_shift" in rules


def test_coda_types_build():
    for name, spec in CODA_TYPES.items():
        assert "duration_range" in spec
        assert "motive" in spec
        assert "dynamic" in spec
        assert "texture" in spec


def test_integration_with_form_planner():
    form = plan_form(0, "narrative_big_band_form")
    assert form["profile"] == "narrative_big_band_form"
    assert form["section_order"]
    assert form["phrase_lengths"]
    assert form["total_bars"] > 0
    bb_roles = form["section_order"]
    assert "intro" in bb_roles or "primary" in bb_roles
    assert "narrative_plan" in form


def test_deterministic_same_seed():
    a = build_narrative_form_plan(123, "luminous_arc_form")
    b = build_narrative_form_plan(123, "luminous_arc_form")
    assert a["section_order"] == b["section_order"]
    assert a["phrase_lengths"] == b["phrase_lengths"]
    assert a["total_bars"] == b["total_bars"]


def test_score_narrative_form_interest():
    plan = build_narrative_form_plan(0, "luminous_arc_form")
    s = score_narrative_form_interest(plan)
    assert 0 <= s <= 1


def test_build_solo_environment():
    env = build_solo_environment(0, "floating")
    assert env["profile"] == "floating"
    assert env["bar_count"] >= 12
    assert "mode" in env
    assert "intensity_curve" in env


def test_score_solo_environment():
    env = build_solo_environment(0, "floating")
    s = score_solo_environment(env)
    assert 0 <= s <= 1


def test_map_narrative_to_big_band():
    plan = build_narrative_form_plan(0, "luminous_arc_form")
    bb = map_narrative_to_big_band_sections(plan)
    assert len(bb) == len(plan["section_order"])
    assert "primary" in bb or "intro" in bb
    assert "return" in bb or "coda" in bb
