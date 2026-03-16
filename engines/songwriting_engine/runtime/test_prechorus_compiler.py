"""Tests for prechorus compiler."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from song_ir_schema import SongIR, SectionIR, HookDNA, HarmonicPlan, ContrastArc
from prechorus_compiler import compile_prechorus


def _make_song_ir() -> SongIR:
    return SongIR(
        title="Test",
        premise="test premise",
        section_order=["verse", "prechorus", "chorus"],
        hook_dna=HookDNA(motif_cell=[60, 62, 64], chorus_melody_idea=[60, 62, 64, 65]),
        harmonic_plan=HarmonicPlan(default_progression=["C", "Am", "F", "G"]),
        contrast_arc=ContrastArc(section_energies={"prechorus": 0.6}),
    )


def test_prechorus_deterministic():
    """Prechorus output is deterministic."""
    song_ir = _make_song_ir()
    section_ir = SectionIR(role="prechorus", bar_count=4)
    a = compile_prechorus(section_ir, song_ir, "prechorus", 0)
    b = compile_prechorus(section_ir, song_ir, "prechorus", 0)
    assert a.bar_end == b.bar_end
    assert a.melody_events[0]["pitch"] == b.melody_events[0]["pitch"]
    print("  [PASS] prechorus deterministic")


def test_prechorus_valid_section():
    """Prechorus produces valid compiled section."""
    song_ir = _make_song_ir()
    section_ir = SectionIR(role="prechorus", bar_count=4)
    sec = compile_prechorus(section_ir, song_ir, "prechorus", 8)
    assert sec.role == "prechorus"
    assert sec.bar_start == 8
    assert sec.bar_end == 12
    assert len(sec.melody_events) > 0
    assert len(sec.lyric_lines) > 0
    assert sec.energy_level >= 0.5
    print("  [PASS] prechorus valid section")


def test_prechorus_hook_connection():
    """Prechorus inherits motif from hook."""
    song_ir = _make_song_ir()
    section_ir = SectionIR(role="prechorus", bar_count=4)
    sec = compile_prechorus(section_ir, song_ir, "prechorus", 0)
    pitches = [e["pitch"] for e in sec.melody_events]
    assert any(60 <= p <= 68 for p in pitches)
    print("  [PASS] prechorus hook connection")


if __name__ == "__main__":
    test_prechorus_deterministic()
    test_prechorus_valid_section()
    test_prechorus_hook_connection()
    print("All prechorus compiler tests passed.")
