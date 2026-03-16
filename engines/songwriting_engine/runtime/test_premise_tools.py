"""Tests for premise tools — premise keywords persist across sections."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from songwriting_engine_runtime import load_rule_package, generate_song
from premise_tools import detect_premise_keywords, reinforce_premise_images


def test_detect_premise_keywords():
    """Detect premise keywords from lyrics."""
    load_rule_package()
    c = generate_song(style_profiles=[], song_seed="9721", structure_type="short", title="River Road", use_population_search=False)
    premise = detect_premise_keywords(c)
    assert "key_nouns" in premise
    assert "key_images" in premise
    assert "main_image_family" in premise
    print("  [PASS] detect premise keywords")


def test_reinforce_premise_images():
    """Reinforcement adds or preserves key images across sections."""
    load_rule_package()
    c = generate_song(style_profiles=[], song_seed="9722", structure_type="short", title="Dawn Breaks", use_population_search=False)
    reinforced = reinforce_premise_images(c, seed=97220)
    assert reinforced.get("lyrics")
    assert reinforced.get("song_identity", {}).get("key_images") is not None
    print("  [PASS] reinforce premise images")


def test_premise_keywords_persist():
    """Key images persist after reinforcement."""
    load_rule_package()
    c = generate_song(style_profiles=[], song_seed="9723", structure_type="short", use_population_search=False)
    premise_before = detect_premise_keywords(c)
    reinforced = reinforce_premise_images(c, seed=97230)
    premise_after = detect_premise_keywords(reinforced)
    assert len(premise_after.get("key_images", [])) >= len(premise_before.get("key_images", [])) - 1
    print("  [PASS] premise keywords persist")


if __name__ == "__main__":
    test_detect_premise_keywords()
    test_reinforce_premise_images()
    test_premise_keywords_persist()
    print("All premise tools tests passed.")
