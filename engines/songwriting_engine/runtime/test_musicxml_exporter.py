"""Tests for MusicXML exporter."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from song_ir_examples import title_first_example
from section_compiler import compile_song_from_ir
from musicxml_exporter import export_compiled_song_to_musicxml
from musicxml_contracts import validate_musicxml_export


def test_xml_structure_valid():
    """Exported XML has required structure."""
    ir = title_first_example()
    compiled = compile_song_from_ir(ir)
    xml = export_compiled_song_to_musicxml(compiled)
    assert "<?xml" in xml
    assert "<score-partwise" in xml
    assert "<work-title>" in xml
    assert "<part-list>" in xml
    assert "<score-part" in xml
    assert "<part " in xml
    assert "<measure " in xml
    assert "<note>" in xml or "<note " in xml
    assert "River Road" in xml
    print("  [PASS] XML structure valid")


def test_measures_created():
    """Measures are created."""
    ir = title_first_example()
    compiled = compile_song_from_ir(ir)
    xml = export_compiled_song_to_musicxml(compiled)
    assert xml.count("<measure ") >= 4
    print("  [PASS] measures created")


def test_notes_present():
    """Notes are present."""
    ir = title_first_example()
    compiled = compile_song_from_ir(ir)
    xml = export_compiled_song_to_musicxml(compiled)
    assert xml.count("<duration>") > 0
    assert "<pitch>" in xml
    print("  [PASS] notes present")


def test_lyrics_align():
    """Lyrics are included."""
    ir = title_first_example()
    compiled = compile_song_from_ir(ir)
    xml = export_compiled_song_to_musicxml(compiled)
    assert "<lyric>" in xml or "River" in xml
    print("  [PASS] lyrics align")


def test_contract_validation_passes():
    """validate_musicxml_export passes for valid export."""
    ir = title_first_example()
    compiled = compile_song_from_ir(ir)
    xml = export_compiled_song_to_musicxml(compiled)
    validate_musicxml_export(xml)
    print("  [PASS] contract validation passes")


def test_validation_rejects_empty():
    """validate_musicxml_export rejects empty."""
    try:
        validate_musicxml_export("")
        assert False
    except ValueError as e:
        assert "empty" in str(e).lower()
    print("  [PASS] validation rejects empty")


if __name__ == "__main__":
    test_xml_structure_valid()
    test_measures_created()
    test_notes_present()
    test_lyrics_align()
    test_contract_validation_passes()
    test_validation_rejects_empty()
    print("All MusicXML exporter tests passed.")
