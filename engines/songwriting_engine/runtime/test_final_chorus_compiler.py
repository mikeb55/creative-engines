"""Tests for final chorus compiler."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from song_ir_schema import SongIR, SectionIR, HookDNA, HarmonicPlan, ContrastArc
from final_chorus_compiler import compile_final_chorus


def _make_song_ir() -> SongIR:
    return SongIR(
        title="Climax",
        premise="peak moment",
        section_order=["verse", "chorus", "final_chorus"],
        hook_dna=HookDNA(
            motif_cell=[60, 62, 64],
            title_phrase="Climax",
            chorus_melody_idea=[60, 62, 64, 65, 67],
            energy_level=0.85,
        ),
        harmonic_plan=HarmonicPlan(default_progression=["C", "Am", "F", "G"]),
        contrast_arc=ContrastArc(section_energies={"final_chorus": 0.92}, final_chorus_peak=True),
    )


def test_final_chorus_deterministic():
    """Final chorus output is deterministic."""
    song_ir = _make_song_ir()
    section_ir = SectionIR(role="final_chorus", bar_count=8)
    a = compile_final_chorus(section_ir, song_ir, "final_chorus", 16)
    b = compile_final_chorus(section_ir, song_ir, "final_chorus", 16)
    assert a.melody_events[0]["pitch"] == b.melody_events[0]["pitch"]
    print("  [PASS] final chorus deterministic")


def test_final_chorus_hook_dna():
    """Final chorus reuses hook DNA."""
    song_ir = _make_song_ir()
    section_ir = SectionIR(role="final_chorus", bar_count=8)
    sec = compile_final_chorus(section_ir, song_ir, "final_chorus", 0)
    pitches = [e["pitch"] for e in sec.melody_events]
    assert any(p >= 62 for p in pitches)
    assert "Climax" in sec.lyric_lines[0]
    print("  [PASS] final chorus hook DNA")


def test_final_chorus_energy():
    """Final chorus has higher energy."""
    song_ir = _make_song_ir()
    section_ir = SectionIR(role="final_chorus", bar_count=8)
    sec = compile_final_chorus(section_ir, song_ir, "final_chorus", 0)
    assert sec.energy_level >= 0.8
    print("  [PASS] final chorus energy")


if __name__ == "__main__":
    test_final_chorus_deterministic()
    test_final_chorus_hook_dna()
    test_final_chorus_energy()
    print("All final chorus compiler tests passed.")
