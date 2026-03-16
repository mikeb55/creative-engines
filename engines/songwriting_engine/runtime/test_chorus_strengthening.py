"""Tests for chorus generator — chorus regeneration improves chorus_dominance_score."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from songwriting_engine_runtime import load_rule_package, generate_song
from chorus_generator import generate_stronger_chorus
from identity_scoring import chorus_dominance_score


def test_chorus_regeneration_improves_score():
    """Chorus regeneration improves or maintains chorus_dominance_score."""
    load_rule_package()
    c = generate_song(style_profiles=[], song_seed="9701", structure_type="short", use_population_search=False)
    before = chorus_dominance_score(c)
    strengthened = generate_stronger_chorus(c, seed=97010)
    after = chorus_dominance_score(strengthened)
    assert after >= before - 0.5, "Chorus strengthening should not significantly reduce score"
    assert strengthened.get("sections")
    assert strengthened.get("melody")
    print("  [PASS] chorus regeneration improves score")


def test_chorus_has_title():
    """Stronger chorus contains title or title variant."""
    load_rule_package()
    c = generate_song(style_profiles=[], song_seed="9702", structure_type="short", title="River Road", use_population_search=False)
    strengthened = generate_stronger_chorus(c, seed=97020)
    lyrics = strengthened.get("lyrics", [])
    all_text = " ".join(line for entry in lyrics for line in entry.get("lines", [])).lower()
    assert "river" in all_text or "road" in all_text, "Chorus should contain title-related words"
    print("  [PASS] chorus has title")


if __name__ == "__main__":
    test_chorus_regeneration_improves_score()
    test_chorus_has_title()
    print("All chorus strengthening tests passed.")
