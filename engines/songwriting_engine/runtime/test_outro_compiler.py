"""Tests for outro compiler."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from song_ir_schema import SongIR, SectionIR, HookDNA, HarmonicPlan, ContrastArc
from outro_compiler import compile_outro


def _make_song_ir() -> SongIR:
    return SongIR(
        title="Fade Out",
        premise="ending",
        section_order=["verse", "chorus", "outro"],
        hook_dna=HookDNA(motif_cell=[60, 62, 64]),
        harmonic_plan=HarmonicPlan(section_overrides={"outro": ["C", "G", "C"]}),
        contrast_arc=ContrastArc(section_energies={"outro": 0.35}),
    )


def test_outro_deterministic():
    """Outro output is deterministic."""
    song_ir = _make_song_ir()
    section_ir = SectionIR(role="outro", bar_count=4)
    a = compile_outro(section_ir, song_ir, "outro", 16)
    b = compile_outro(section_ir, song_ir, "outro", 16)
    assert a.melody_events[0]["pitch"] == b.melody_events[0]["pitch"]
    print("  [PASS] outro deterministic")


def test_outro_valid_section():
    """Outro produces valid compiled section."""
    song_ir = _make_song_ir()
    section_ir = SectionIR(role="outro", bar_count=4)
    sec = compile_outro(section_ir, song_ir, "outro", 16)
    assert sec.role == "outro"
    assert sec.bar_end == 20
    assert "Fade Out" in sec.lyric_lines
    assert sec.energy_level < 0.5
    print("  [PASS] outro valid section")


def test_outro_motif_echo():
    """Outro echoes motif."""
    song_ir = _make_song_ir()
    section_ir = SectionIR(role="outro", bar_count=4)
    sec = compile_outro(section_ir, song_ir, "outro", 0)
    pitches = [e["pitch"] for e in sec.melody_events]
    assert any(58 <= p <= 64 for p in pitches)
    print("  [PASS] outro motif echo")


if __name__ == "__main__":
    test_outro_deterministic()
    test_outro_valid_section()
    test_outro_motif_echo()
    print("All outro compiler tests passed.")
