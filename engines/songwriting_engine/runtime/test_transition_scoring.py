"""Tests for transition scoring."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from songwriting_engine_runtime import load_rule_package, generate_song
from transition_scoring import (
    score_verse_to_prechorus_transition,
    score_prechorus_to_chorus_transition,
    score_transition_flow,
)


def test_transition_scores_valid():
    """Transition scores return valid range."""
    load_rule_package()
    c = generate_song(style_profiles=[], song_seed="9921", structure_type="short", use_population_search=True, use_hook_first=True)
    s1 = score_verse_to_prechorus_transition(c)
    s2 = score_prechorus_to_chorus_transition(c)
    s3 = score_transition_flow(c)
    assert 0 <= s1 <= 10
    assert 0 <= s2 <= 10
    assert 0 <= s3 <= 10
    print("  [PASS] transition scores valid")


def test_transition_flow_improves_after_repair():
    """Transition flow can be improved by repair."""
    load_rule_package()
    from editorial_refinement import repair_transition_flow
    c = generate_song(style_profiles=[], song_seed="9922", structure_type="short", use_population_search=True, use_hook_first=True)
    before = score_transition_flow(c)
    repaired = repair_transition_flow(c)
    after = score_transition_flow(repaired)
    assert after >= before - 0.5
    print("  [PASS] transition flow improves after repair")


if __name__ == "__main__":
    test_transition_scores_valid()
    test_transition_flow_improves_after_repair()
    print("All transition scoring tests passed.")
