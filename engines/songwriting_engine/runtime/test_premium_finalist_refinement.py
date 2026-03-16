"""Tests for premium finalist refinement."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from songwriting_engine_runtime import load_rule_package, generate_song
from premium_finalist_refinement import select_premium_finalists, premium_refine_finalist, premium_refine_hook_line


def test_select_premium_finalists():
    """Select premium finalists returns top N."""
    load_rule_package()
    c = generate_song(style_profiles=[], song_seed="9991", structure_type="short", use_population_search=True, use_hook_first=True)
    selected = select_premium_finalists([c, c, c, c], top_n=2)
    assert len(selected) == 2
    print("  [PASS] select premium finalists")


def test_premium_refine_preserves_structure():
    """Premium refinement preserves section structure."""
    load_rule_package()
    c = generate_song(style_profiles=[], song_seed="9992", structure_type="short", use_population_search=True, use_hook_first=True)
    refined = premium_refine_finalist(c)
    assert len(refined.get("sections", [])) == len(c.get("sections", []))
    assert refined.get("melody")
    print("  [PASS] premium refine preserves structure")


if __name__ == "__main__":
    test_select_premium_finalists()
    test_premium_refine_preserves_structure()
    print("All premium finalist refinement tests passed.")
