"""Tests for final chorus tools."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from songwriting_engine_runtime import load_rule_package, generate_song
from final_chorus_tools import intensify_final_chorus, score_final_chorus_payoff


def test_score_final_chorus_payoff():
    """Final chorus payoff score in valid range."""
    load_rule_package()
    c = generate_song(style_profiles=[], song_seed="9961", structure_type="short", use_population_search=True, use_hook_first=True)
    s = score_final_chorus_payoff(c)
    assert 0 <= s <= 10
    print("  [PASS] score final chorus payoff")


def test_intensify_final_chorus():
    """Intensify preserves structure."""
    load_rule_package()
    c = generate_song(style_profiles=[], song_seed="9962", structure_type="extended", use_population_search=True, use_hook_first=True)
    intensified = intensify_final_chorus(c)
    assert intensified.get("sections")
    assert intensified.get("melody")
    assert score_final_chorus_payoff(intensified) >= score_final_chorus_payoff(c) - 0.5
    print("  [PASS] intensify final chorus")


if __name__ == "__main__":
    test_score_final_chorus_payoff()
    test_intensify_final_chorus()
    print("All final chorus tools tests passed.")
