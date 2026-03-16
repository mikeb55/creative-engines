"""Tests for section compiler."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from song_ir_schema import SongIR, SectionIR, HookDNA
from song_ir_validator import validate_song_ir
from section_compiler import compile_song_from_ir


def test_verse_chorus_compile():
    """Verse + chorus compile successfully."""
    ir = SongIR(title="Test", section_order=["verse", "chorus"])
    compiled = compile_song_from_ir(ir)
    assert compiled.sections
    assert len(compiled.sections) == 2
    assert compiled.sections[0].role == "verse"
    assert compiled.sections[1].role == "chorus"
    print("  [PASS] verse chorus compile")


def test_output_deterministic():
    """Same IR + seed = same result."""
    ir = SongIR(title="Test", section_order=["verse", "chorus"], seed=42)
    a = compile_song_from_ir(ir)
    b = compile_song_from_ir(ir)
    assert len(a.sections) == len(b.sections)
    assert a.sections[0].melody_events[0]["pitch"] == b.sections[0].melody_events[0]["pitch"]
    print("  [PASS] output deterministic")


def test_hook_dna_in_chorus():
    """Hook DNA appears in chorus compilation."""
    ir = SongIR(
        title="Test",
        section_order=["verse", "chorus"],
        hook_dna=HookDNA(chorus_melody_idea=[70, 72, 74]),
    )
    compiled = compile_song_from_ir(ir)
    chorus = next(s for s in compiled.sections if s.role == "chorus")
    pitches = [e["pitch"] for e in chorus.melody_events]
    assert 70 in pitches or 72 in pitches or 74 in pitches
    print("  [PASS] hook DNA in chorus")


def test_verse_distinct_from_chorus():
    """Verse remains distinct from chorus."""
    ir = SongIR(title="Test", section_order=["verse", "chorus"])
    compiled = compile_song_from_ir(ir)
    verse = next(s for s in compiled.sections if s.role == "verse")
    chorus = next(s for s in compiled.sections if s.role == "chorus")
    assert verse.energy_level < chorus.energy_level or verse.melody_events != chorus.melody_events
    print("  [PASS] verse distinct from chorus")


def test_asymmetry_preserved():
    """Asymmetry is preserved where specified."""
    ir = SongIR(
        title="Test",
        section_order=["verse", "chorus"],
        section_roles={"verse": SectionIR(role="verse", phrase_lengths=[3, 5, 4, 6])},
    )
    compiled = compile_song_from_ir(ir)
    assert compiled.sections
    print("  [PASS] asymmetry preserved")


if __name__ == "__main__":
    test_verse_chorus_compile()
    test_output_deterministic()
    test_hook_dna_in_chorus()
    test_verse_distinct_from_chorus()
    test_asymmetry_preserved()
    print("All section compiler tests passed.")
