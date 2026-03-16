"""Stage 3 end-to-end: full song compile and MusicXML export."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from song_ir_examples import full_song_example, title_first_example
from section_compiler import compile_song_from_ir
from musicxml_exporter import export_compiled_song_to_musicxml
from musicxml_contracts import validate_musicxml_export


def test_full_song_compiles():
    """Full song with all section types compiles."""
    ir = full_song_example()
    compiled = compile_song_from_ir(ir)
    roles = [s.role for s in compiled.sections]
    assert "prechorus" in roles
    assert "bridge" in roles
    assert "final_chorus" in roles
    assert "outro" in roles
    assert compiled.title == "Full Song"
    print("  [PASS] full song compiles")


def test_full_song_export():
    """Full song exports to valid MusicXML."""
    ir = full_song_example()
    compiled = compile_song_from_ir(ir)
    xml = export_compiled_song_to_musicxml(compiled)
    validate_musicxml_export(xml)
    assert "<measure " in xml
    assert "Full Song" in xml
    print("  [PASS] full song export")


def test_title_flow_export():
    """Title-first flow compiles and exports."""
    ir = title_first_example()
    compiled = compile_song_from_ir(ir)
    xml = export_compiled_song_to_musicxml(compiled)
    validate_musicxml_export(xml)
    print("  [PASS] title flow export")


def test_deterministic_export():
    """Same IR produces same MusicXML."""
    ir = title_first_example()
    a = compile_song_from_ir(ir)
    b = compile_song_from_ir(ir)
    xml_a = export_compiled_song_to_musicxml(a)
    xml_b = export_compiled_song_to_musicxml(b)
    assert xml_a == xml_b
    print("  [PASS] deterministic export")


def test_section_sequence_coherent():
    """Section bar ranges are coherent."""
    ir = full_song_example()
    compiled = compile_song_from_ir(ir)
    prev_end = 0
    for sec in compiled.sections:
        assert sec.bar_start == prev_end
        prev_end = sec.bar_end
    print("  [PASS] section sequence coherent")


if __name__ == "__main__":
    test_full_song_compiles()
    test_full_song_export()
    test_title_flow_export()
    test_deterministic_export()
    test_section_sequence_coherent()
    print("All Stage 3 full song compile tests passed.")
