"""Tests for Song IR schema and validator."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from song_ir_schema import SongIR, SectionIR, HookDNA
from song_ir_validator import validate_song_ir, validate_section_order, validate_hook_dna


def test_valid_song_ir_passes():
    """Valid Song IR passes validation."""
    ir = SongIR(title="Test", section_order=["verse", "chorus", "verse", "chorus"])
    result = validate_song_ir(ir)
    assert result.valid
    print("  [PASS] valid Song IR passes")


def test_invalid_missing_chorus_fails():
    """Missing chorus fails validation."""
    ir = SongIR(title="Test", section_order=["verse", "verse"])
    result = validate_section_order(ir)
    assert not result.valid
    assert "chorus" in str(result.errors).lower()
    print("  [PASS] missing chorus fails")


def test_invalid_title_placement_fails():
    """Invalid title placement section fails."""
    ir = SongIR(
        title="Test",
        section_order=["verse", "chorus"],
        title_placements={"nonexistent_section": "first_line"},
    )
    result = validate_section_order(ir)
    assert not result.valid
    assert "nonexistent" in str(result.errors).lower() or "title" in str(result.errors).lower()
    print("  [PASS] invalid title placement fails")


def test_empty_title_fails():
    """Empty title fails."""
    ir = SongIR(title="", section_order=["verse", "chorus"])
    result = validate_song_ir(ir)
    assert not result.valid
    print("  [PASS] empty title fails")


def test_hook_dna_validation():
    """Hook DNA validation runs."""
    ir = SongIR(title="Test", section_order=["verse", "chorus"], hook_dna=HookDNA(chorus_melody_idea=[60, 62]))
    result = validate_hook_dna(ir)
    assert result.valid
    print("  [PASS] hook DNA validation")


if __name__ == "__main__":
    test_valid_song_ir_passes()
    test_invalid_missing_chorus_fails()
    test_invalid_title_placement_fails()
    test_empty_title_fails()
    test_hook_dna_validation()
    print("All Song IR schema tests passed.")
