"""Tests for Song IR generator."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from song_ir_generator import (
    generate_song_ir_from_title,
    generate_song_ir_from_premise,
    generate_song_ir_from_hook,
    generate_song_ir_candidates,
)
from song_ir_validator import validate_song_ir


def test_title_generation_valid():
    """Title generation returns valid SongIR."""
    ir = generate_song_ir_from_title("River Road", seed=42)
    r = validate_song_ir(ir)
    assert r.valid
    assert ir.title == "River Road"
    assert "chorus" in ir.section_order
    print("  [PASS] title generation valid")


def test_premise_generation_valid():
    """Premise generation returns valid SongIR."""
    ir = generate_song_ir_from_premise("journey and return", seed=43)
    r = validate_song_ir(ir)
    assert r.valid
    assert ir.premise == "journey and return"
    print("  [PASS] premise generation valid")


def test_hook_generation_valid():
    """Hook generation returns valid SongIR."""
    ir = generate_song_ir_from_hook("Edge of Night", seed=44)
    r = validate_song_ir(ir)
    assert r.valid
    assert "Edge" in ir.title or "Night" in ir.title
    print("  [PASS] hook generation valid")


def test_candidates_count():
    """Candidate generation returns count requested."""
    cands = generate_song_ir_candidates("Test Song", mode="title", count=12, seed=100)
    assert len(cands) == 12
    for c in cands:
        r = validate_song_ir(c)
        assert r.valid
    print("  [PASS] candidates count")


def test_generator_deterministic():
    """Same input + seed = same result."""
    a = generate_song_ir_from_title("Deterministic", seed=999)
    b = generate_song_ir_from_title("Deterministic", seed=999)
    assert a.title == b.title
    assert a.section_order == b.section_order
    assert a.hook_dna.chorus_melody_idea == b.hook_dna.chorus_melody_idea
    print("  [PASS] generator deterministic")


if __name__ == "__main__":
    test_title_generation_valid()
    test_premise_generation_valid()
    test_hook_generation_valid()
    test_candidates_count()
    test_generator_deterministic()
    print("All Song IR generator tests passed.")
