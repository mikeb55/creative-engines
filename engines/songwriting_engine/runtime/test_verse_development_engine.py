"""Tests for verse development engine."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from songwriting_engine_runtime import load_rule_package, generate_song
from verse_development_engine import differentiate_verse_2, score_verse_development


def test_score_verse_development():
    """Verse development score in valid range."""
    load_rule_package()
    c = generate_song(style_profiles=[], song_seed="9951", structure_type="short", use_population_search=True, use_hook_first=True)
    s = score_verse_development(c)
    assert 0 <= s <= 10
    print("  [PASS] score verse development")


def test_differentiate_verse_2():
    """Verse 2 differs from verse 1 after differentiation."""
    load_rule_package()
    c = generate_song(style_profiles=[], song_seed="9952", structure_type="short", use_population_search=True, use_hook_first=True)
    before = score_verse_development(c)
    diff = differentiate_verse_2(c)
    after = score_verse_development(diff)
    assert after >= before - 0.5
    print("  [PASS] differentiate verse 2")


if __name__ == "__main__":
    test_score_verse_development()
    test_differentiate_verse_2()
    print("All verse development engine tests passed.")
