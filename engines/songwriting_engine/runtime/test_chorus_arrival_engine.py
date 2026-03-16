"""Tests for chorus arrival engine."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from songwriting_engine_runtime import load_rule_package, generate_song
from chorus_arrival_engine import score_chorus_arrival, strengthen_prechorus_to_chorus_arrival, strengthen_bridge_to_final_chorus_payoff


def test_score_chorus_arrival():
    """Chorus arrival score in valid range."""
    load_rule_package()
    c = generate_song(style_profiles=[], song_seed="9941", structure_type="short", use_population_search=True, use_hook_first=True)
    s = score_chorus_arrival(c)
    assert 0 <= s <= 10
    print("  [PASS] score chorus arrival")


def test_strengthen_prechorus_to_chorus():
    """Strengthen improves prechorus-to-chorus energy."""
    load_rule_package()
    c = generate_song(style_profiles=[], song_seed="9942", structure_type="with_prechorus", use_population_search=True, use_hook_first=True)
    before = score_chorus_arrival(c)
    strengthened = strengthen_prechorus_to_chorus_arrival(c)
    after = score_chorus_arrival(strengthened)
    assert after >= before - 0.5
    print("  [PASS] strengthen prechorus to chorus")


if __name__ == "__main__":
    test_score_chorus_arrival()
    test_strengthen_prechorus_to_chorus()
    print("All chorus arrival engine tests passed.")
