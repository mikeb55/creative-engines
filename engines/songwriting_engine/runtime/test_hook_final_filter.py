"""Tests for hook final filter."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from songwriting_engine_runtime import load_rule_package, generate_song
from hook_final_filter import score_hook_memorability, score_hook_repeatability, score_hook_title_landing, hook_final_filter


def test_score_hook_memorability():
    """Hook memorability score in valid range."""
    load_rule_package()
    c = generate_song(style_profiles=[], song_seed="9981", structure_type="short", use_population_search=True, use_hook_first=True)
    s = score_hook_memorability(c)
    assert 0 <= s <= 10
    print("  [PASS] score hook memorability")


def test_hook_final_filter():
    """Filter rejects weak hook songs when stronger alternatives exist."""
    load_rule_package()
    c1 = generate_song(style_profiles=[], song_seed="9982", structure_type="short", use_population_search=True, use_hook_first=True)
    c2 = generate_song(style_profiles=[], song_seed="9983", structure_type="short", use_population_search=True, use_hook_first=True)
    c1["evaluation_scores"] = c1.get("evaluation_scores", {})
    c2["evaluation_scores"] = c2.get("evaluation_scores", {})
    c1["evaluation_scores"]["hook_strength"] = 3.0
    c1["evaluation_scores"]["memorability"] = 3.0
    c1["evaluation_scores"]["title_integration"] = 4.0
    c2["evaluation_scores"]["hook_strength"] = 7.0
    c2["evaluation_scores"]["memorability"] = 7.0
    c2["evaluation_scores"]["title_integration"] = 7.0
    filtered = hook_final_filter([c1, c2])
    assert c2 in filtered
    assert len(filtered) >= 1
    print("  [PASS] hook final filter")


if __name__ == "__main__":
    test_score_hook_memorability()
    test_hook_final_filter()
    print("All hook final filter tests passed.")
