"""Tests for hook DNA contract."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from songwriting_engine_runtime import load_rule_package, generate_song
from hook_search import generate_hook_candidates
from song_from_hook import build_song_from_hook
from hook_dna_contract import extract_hook_dna, validate_song_against_hook_dna, score_hook_dna_coherence


def test_extract_hook_dna():
    """Extract hook DNA returns valid contract."""
    load_rule_package()
    hooks = generate_hook_candidates(title="River Road", count=1, seed=9901)
    dna = extract_hook_dna(hooks[0])
    assert "motif_cell" in dna
    assert "contour_archetype" in dna
    assert "title_phrase" in dna
    assert "image_family" in dna
    assert "energy_profile" in dna
    print("  [PASS] extract hook dna")


def test_validate_song_against_hook_dna():
    """Validation returns valid structure."""
    load_rule_package()
    hooks = generate_hook_candidates(title="Dawn", count=1, seed=9902)
    song = build_song_from_hook(hooks[0], title="Dawn", seed=99020)
    dna = extract_hook_dna(hooks[0])
    v = validate_song_against_hook_dna(song, dna)
    assert "valid" in v
    assert "violations" in v
    assert "motif_present" in v
    print("  [PASS] validate song against hook dna")


def test_score_hook_dna_coherence():
    """Coherence score in 0-10 range."""
    load_rule_package()
    hooks = generate_hook_candidates(title="Edge", count=1, seed=9903)
    song = build_song_from_hook(hooks[0], title="Edge", seed=99030)
    score = score_hook_dna_coherence(song)
    assert 0 <= score <= 10
    print("  [PASS] score hook dna coherence")


def test_sections_inherit_hook_dna():
    """Song sections inherit hook DNA."""
    load_rule_package()
    hooks = generate_hook_candidates(title="River Road", count=1, seed=9904)
    song = build_song_from_hook(hooks[0], title="River Road", seed=99040)
    assert song.get("hook_dna")
    melody = song.get("melody", [])
    motif = set(song["hook_dna"].get("motif_cell", []))
    mel_pitches = set(e.get("pitch") for e in melody if e.get("pitch"))
    assert motif & mel_pitches or not motif
    print("  [PASS] sections inherit hook dna")


if __name__ == "__main__":
    test_extract_hook_dna()
    test_validate_song_against_hook_dna()
    test_score_hook_dna_coherence()
    test_sections_inherit_hook_dna()
    print("All hook DNA contract tests passed.")
