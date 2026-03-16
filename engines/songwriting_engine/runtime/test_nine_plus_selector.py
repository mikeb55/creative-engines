"""Tests for nine-plus selector."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from songwriting_engine_runtime import load_rule_package, generate_song
from nine_plus_selector import is_nine_plus_candidate, rank_nine_plus_candidates


def test_is_nine_plus_candidate():
    """Nine-plus candidate check returns bool."""
    load_rule_package()
    c = generate_song(style_profiles=[], song_seed="9971", structure_type="short", use_population_search=True, use_hook_first=True)
    result = is_nine_plus_candidate(c)
    assert isinstance(result, bool)
    print("  [PASS] is nine plus candidate")


def test_rank_nine_plus_prefers_distinctive():
    """Nine-plus ranking prefers distinctive over merely balanced."""
    load_rule_package()
    c1 = generate_song(style_profiles=[], song_seed="9972", structure_type="short", use_population_search=True, use_hook_first=True)
    c2 = generate_song(style_profiles=[], song_seed="9973", structure_type="short", use_population_search=True, use_hook_first=True)
    c1["evaluation_scores"] = c1.get("evaluation_scores", {})
    c2["evaluation_scores"] = c2.get("evaluation_scores", {})
    c1["evaluation_scores"]["identity_score"] = 8.0
    c1["evaluation_scores"]["hook_strength"] = 7.5
    c1["evaluation_scores"]["section_role_clarity"] = 6.0
    c2["evaluation_scores"]["identity_score"] = 5.5
    c2["evaluation_scores"]["hook_strength"] = 5.0
    c2["evaluation_scores"]["section_role_clarity"] = 7.0
    ranked = rank_nine_plus_candidates([c1, c2])
    assert ranked[0] == c1
    print("  [PASS] rank nine plus prefers distinctive")


if __name__ == "__main__":
    test_is_nine_plus_candidate()
    test_rank_nine_plus_prefers_distinctive()
    print("All nine-plus selector tests passed.")
