"""Tests for melodic identity tools — motif recurrence increases."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from songwriting_engine_runtime import load_rule_package, generate_song
from melodic_identity_tools import calculate_melodic_fingerprint, reinforce_melodic_identity
from evaluation_adapter import _motif_identity_score


def test_calculate_melodic_fingerprint():
    """Fingerprint returns valid structure."""
    load_rule_package()
    c = generate_song(style_profiles=[], song_seed="9711", structure_type="short", use_population_search=False)
    melody = c.get("melody", [])
    fp = calculate_melodic_fingerprint(melody)
    assert "intervals" in fp
    assert "contour" in fp
    assert fp["contour"] in ("rise", "fall", "arch", "narrow")
    print("  [PASS] calculate melodic fingerprint")


def test_reinforce_melodic_identity():
    """Reinforcement preserves structure and melody."""
    load_rule_package()
    c = generate_song(style_profiles=[], song_seed="9712", structure_type="short", use_population_search=False)
    sections_before = len(c.get("sections", []))
    reinforced = reinforce_melodic_identity(c, seed=97120)
    assert len(reinforced.get("sections", [])) == sections_before
    assert reinforced.get("melody")
    motifs = reinforced.get("motifs", [])
    melody = reinforced.get("melody", [])
    score = _motif_identity_score(motifs, melody)
    assert 0 <= score <= 10
    print("  [PASS] reinforce melodic identity")


if __name__ == "__main__":
    test_calculate_melodic_fingerprint()
    test_reinforce_melodic_identity()
    print("All melodic identity tests passed.")
