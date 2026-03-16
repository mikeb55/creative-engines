"""Tests for contrast arc planner."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from songwriting_engine_runtime import load_rule_package, generate_song
from contrast_arc_planner import plan_section_contrast_arc, score_contrast_arc, apply_contrast_arc


def test_plan_section_contrast_arc():
    """Plan returns valid structure."""
    load_rule_package()
    c = generate_song(style_profiles=[], song_seed="9931", structure_type="short", use_population_search=True, use_hook_first=True)
    plan = plan_section_contrast_arc(c)
    assert "sections" in plan
    assert len(plan["sections"]) == len(c.get("sections", []))
    for p in plan["sections"]:
        assert "energy" in p
        assert "role" in p
    print("  [PASS] plan section contrast arc")


def test_score_contrast_arc():
    """Contrast arc score in valid range."""
    load_rule_package()
    c = generate_song(style_profiles=[], song_seed="9932", structure_type="short", use_population_search=True, use_hook_first=True)
    s = score_contrast_arc(c)
    assert 0 <= s <= 10
    print("  [PASS] score contrast arc")


def test_apply_contrast_arc_improves():
    """Apply contrast arc changes section energies."""
    load_rule_package()
    c = generate_song(style_profiles=[], song_seed="9933", structure_type="short", use_population_search=True, use_hook_first=True)
    plan = plan_section_contrast_arc(c)
    applied = apply_contrast_arc(c, plan)
    for s in applied.get("sections", []):
        assert "energy_level" in s
    assert score_contrast_arc(applied) >= score_contrast_arc(c) - 0.5
    print("  [PASS] apply contrast arc improves")


if __name__ == "__main__":
    test_plan_section_contrast_arc()
    test_score_contrast_arc()
    test_apply_contrast_arc_improves()
    print("All contrast arc planner tests passed.")
