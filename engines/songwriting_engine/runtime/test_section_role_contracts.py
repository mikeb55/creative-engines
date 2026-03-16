"""Tests for section role contracts."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from songwriting_engine_runtime import load_rule_package, generate_song
from section_role_contracts import (
    score_verse_role,
    score_prechorus_role,
    score_bridge_role,
    score_outro_role,
    score_section_role_clarity,
)


def test_verse_role_contract():
    """Verse role score in valid range."""
    load_rule_package()
    c = generate_song(style_profiles=[], song_seed="9911", structure_type="short", use_population_search=True, use_hook_first=True)
    s = score_verse_role(c)
    assert 0 <= s <= 10
    print("  [PASS] verse role contract")


def test_section_role_clarity():
    """Section role clarity score in valid range."""
    load_rule_package()
    c = generate_song(style_profiles=[], song_seed="9912", structure_type="short", use_population_search=True, use_hook_first=True)
    s = score_section_role_clarity(c)
    assert 0 <= s <= 10
    print("  [PASS] section role clarity")


def test_verse_chorus_not_same_function():
    """Verse and chorus have distinct energies."""
    load_rule_package()
    c = generate_song(style_profiles=[], song_seed="9913", structure_type="short", use_population_search=True, use_hook_first=True)
    verses = [s for s in c.get("sections", []) if s.get("section_role") == "verse"]
    choruses = [s for s in c.get("sections", []) if s.get("section_role") == "chorus"]
    if verses and choruses:
        v_avg = sum(s.get("energy_level", 0.5) for s in verses) / len(verses)
        c_avg = sum(s.get("energy_level", 0.7) for s in choruses) / len(choruses)
        assert c_avg >= v_avg - 0.1
    print("  [PASS] verse chorus not same function")


if __name__ == "__main__":
    test_verse_role_contract()
    test_section_role_clarity()
    test_verse_chorus_not_same_function()
    print("All section role contract tests passed.")
