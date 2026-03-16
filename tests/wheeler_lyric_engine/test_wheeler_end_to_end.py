"""End-to-end tests for Wheeler Lyric engine."""

from shared_composer.engine_registry import get_engine, ensure_engines_loaded


def test_wheeler_lyric_registered():
    ensure_engines_loaded()
    eng = get_engine("wheeler_lyric")
    assert eng.engine_name == "wheeler_lyric"


def test_end_to_end_generation():
    ensure_engines_loaded()
    eng = get_engine("wheeler_lyric")
    ir = eng.generate_ir("Lyrical Study", mode="title", seed=0)
    compiled = eng.compile_from_ir(ir)
    xml = eng.export_musicxml(compiled)
    assert ir.title == "Lyrical Study"
    assert compiled.sections
    assert "<score-partwise" in xml


def test_validate_ir():
    ensure_engines_loaded()
    eng = get_engine("wheeler_lyric")
    ir = eng.generate_ir("Validate", seed=0)
    r = eng.validate_ir(ir)
    assert r.valid
