"""End-to-end Song IR tests."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from song_ir_examples import get_example, title_first_example, image_driven_example, hook_forward_example
from section_compiler import compile_song_from_ir
from musicxml_contracts import compiled_song_to_musicxml_stub, validate_compiled_for_export


def test_title_first_compiles():
    """Title-first example compiles."""
    ir = title_first_example()
    compiled = compile_song_from_ir(ir)
    assert compiled.title == "River Road"
    assert len(compiled.sections) == 4
    assert any(s.role == "chorus" for s in compiled.sections)
    print("  [PASS] title first compiles")


def test_image_driven_compiles():
    """Image-driven example compiles."""
    ir = image_driven_example()
    compiled = compile_song_from_ir(ir)
    assert compiled.title == "Dawn Breaks"
    assert compiled.sections
    print("  [PASS] image driven compiles")


def test_hook_forward_compiles():
    """Hook-forward example compiles."""
    ir = hook_forward_example()
    compiled = compile_song_from_ir(ir)
    assert compiled.title == "Edge of Night"
    assert compiled.sections
    print("  [PASS] hook forward compiles")


def test_coherent_section_sequence():
    """Compiled song has coherent section sequence."""
    ir = title_first_example()
    compiled = compile_song_from_ir(ir)
    prev_end = 0
    for sec in compiled.sections:
        assert sec.bar_start == prev_end
        prev_end = sec.bar_end
    print("  [PASS] coherent section sequence")


def test_export_stub_works():
    """Export stub produces valid XML."""
    ir = title_first_example()
    compiled = compile_song_from_ir(ir)
    stub = compiled_song_to_musicxml_stub(compiled)
    assert "<?xml" in stub
    assert "<score-partwise" in stub
    assert "River Road" in stub
    assert "<measure" in stub
    print("  [PASS] export stub works")


def test_get_example():
    """get_example returns correct fixture."""
    ir = get_example("title_first")
    assert ir.title == "River Road"
    try:
        get_example("invalid")
        assert False
    except ValueError:
        pass
    print("  [PASS] get example")


if __name__ == "__main__":
    test_title_first_compiles()
    test_image_driven_compiles()
    test_hook_forward_compiles()
    test_coherent_section_sequence()
    test_export_stub_works()
    test_get_example()
    print("All end-to-end Song IR tests passed.")
