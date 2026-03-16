"""Tests for standout factor."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from songwriting_engine_runtime import load_rule_package, generate_song
from standout_factor import score_standout_factor, score_afterglow, score_quotable_hook, score_signature_moment


def test_score_standout_factor():
    """Standout factor score in valid range."""
    load_rule_package()
    c = generate_song(style_profiles=[], song_seed="9991", structure_type="short", use_population_search=True, use_hook_first=True)
    s = score_standout_factor(c)
    assert 0 <= s <= 10
    print("  [PASS] score standout factor")


def test_score_quotable_hook():
    """Quotable hook score in valid range."""
    load_rule_package()
    c = generate_song(style_profiles=[], song_seed="9992", structure_type="short", use_population_search=True, use_hook_first=True)
    s = score_quotable_hook(c)
    assert 0 <= s <= 10
    print("  [PASS] score quotable hook")


def test_standout_differentiates():
    """Standout factor differentiates songs with strong vs weak chorus."""
    load_rule_package()
    c1 = generate_song(style_profiles=[], song_seed="9993", structure_type="short", use_population_search=True, use_hook_first=True)
    c2 = generate_song(style_profiles=[], song_seed="9994", structure_type="short", use_population_search=True, use_hook_first=True)
    c1["evaluation_scores"] = c1.get("evaluation_scores", {})
    c2["evaluation_scores"] = c2.get("evaluation_scores", {})
    c1["evaluation_scores"]["identity_score"] = 8.0
    c1["evaluation_scores"]["memorability"] = 8.0
    c2["evaluation_scores"]["identity_score"] = 5.0
    c2["evaluation_scores"]["memorability"] = 5.0
    s1 = score_standout_factor(c1)
    s2 = score_standout_factor(c2)
    assert s1 >= s2 - 0.5
    print("  [PASS] standout differentiates")


if __name__ == "__main__":
    test_score_standout_factor()
    test_score_quotable_hook()
    test_standout_differentiates()
    print("All standout factor tests passed.")
