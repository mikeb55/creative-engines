"""Tests for editorial selector."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from songwriting_engine_runtime import load_rule_package, generate_song
from editorial_selector import compute_structural_health, compute_identity_strength, editorial_rank_candidates


def test_compute_structural_health():
    """Structural health score in valid range."""
    load_rule_package()
    c = generate_song(style_profiles=[], song_seed="9971", structure_type="short", use_population_search=True, use_hook_first=True)
    s = compute_structural_health(c)
    assert 0 <= s <= 10
    print("  [PASS] compute structural health")


def test_compute_identity_strength():
    """Identity strength score in valid range."""
    load_rule_package()
    c = generate_song(style_profiles=[], song_seed="9972", structure_type="short", use_population_search=True, use_hook_first=True)
    s = compute_identity_strength(c)
    assert 0 <= s <= 10
    print("  [PASS] compute identity strength")


def test_editorial_rank_prefers_identity():
    """Strong identity songs rank higher than weak identity with minor structural flaws."""
    load_rule_package()
    c1 = generate_song(style_profiles=[], song_seed="9973", structure_type="short", use_population_search=True, use_hook_first=True)
    c2 = generate_song(style_profiles=[], song_seed="9974", structure_type="short", use_population_search=True, use_hook_first=True)
    c1["evaluation_scores"] = c1.get("evaluation_scores", {})
    c2["evaluation_scores"] = c2.get("evaluation_scores", {})
    c1["evaluation_scores"]["identity_score"] = 8.0
    c1["evaluation_scores"]["hook_strength"] = 7.5
    c1["evaluation_scores"]["section_role_clarity"] = 5.0
    c2["evaluation_scores"]["identity_score"] = 5.0
    c2["evaluation_scores"]["hook_strength"] = 5.0
    c2["evaluation_scores"]["section_role_clarity"] = 7.0
    ranked = editorial_rank_candidates([c1, c2])
    assert ranked[0] == c1
    print("  [PASS] editorial rank prefers identity")


if __name__ == "__main__":
    test_compute_structural_health()
    test_compute_identity_strength()
    test_editorial_rank_prefers_identity()
    print("All editorial selector tests passed.")
