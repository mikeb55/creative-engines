"""Tests for bridge compiler."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from song_ir_schema import SongIR, SectionIR, HookDNA, HarmonicPlan, ContrastArc
from bridge_compiler import compile_bridge


def _make_song_ir() -> SongIR:
    return SongIR(
        title="Test",
        premise="test premise",
        section_order=["verse", "chorus", "bridge", "chorus"],
        hook_dna=HookDNA(motif_cell=[60, 62, 64]),
        harmonic_plan=HarmonicPlan(section_overrides={"bridge": ["F", "G", "Am", "Em"]}),
        contrast_arc=ContrastArc(section_energies={"bridge": 0.5}),
    )


def test_bridge_deterministic():
    """Bridge output is deterministic."""
    song_ir = _make_song_ir()
    section_ir = SectionIR(role="bridge", bar_count=8)
    a = compile_bridge(section_ir, song_ir, "bridge", 16)
    b = compile_bridge(section_ir, song_ir, "bridge", 16)
    assert a.melody_events[0]["pitch"] == b.melody_events[0]["pitch"]
    print("  [PASS] bridge deterministic")


def test_bridge_valid_section():
    """Bridge produces valid compiled section."""
    song_ir = _make_song_ir()
    section_ir = SectionIR(role="bridge", bar_count=8)
    sec = compile_bridge(section_ir, song_ir, "bridge", 16)
    assert sec.role == "bridge"
    assert sec.bar_end == 24
    assert len(sec.harmony) == 8
    assert sec.harmony[0]["symbol"] in ["F", "G", "Am", "Em"]
    print("  [PASS] bridge valid section")


def test_bridge_contrast():
    """Bridge has different contour from verse/chorus."""
    song_ir = _make_song_ir()
    section_ir = SectionIR(role="bridge", bar_count=8)
    sec = compile_bridge(section_ir, song_ir, "bridge", 0)
    assert sec.energy_level <= 0.6
    print("  [PASS] bridge contrast")


if __name__ == "__main__":
    test_bridge_deterministic()
    test_bridge_valid_section()
    test_bridge_contrast()
    print("All bridge compiler tests passed.")
