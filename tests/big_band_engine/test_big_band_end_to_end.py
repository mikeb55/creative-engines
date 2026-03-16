"""End-to-end tests for Big Band engine."""

from shared_composer.engine_registry import get_engine, ensure_engines_loaded


def test_big_band_registered():
    ensure_engines_loaded()
    eng = get_engine("big_band")
    assert eng.engine_name == "big_band"


def test_end_to_end_generation():
    ensure_engines_loaded()
    eng = get_engine("big_band")
    ir = eng.generate_ir("Sectional Opener", mode="title", seed=0)
    compiled = eng.compile_from_ir(ir)
    xml = eng.export_musicxml(compiled)
    assert ir.title == "Sectional Opener"
    assert compiled.sections
    assert "<score-partwise" in xml


def test_validate_ir():
    ensure_engines_loaded()
    eng = get_engine("big_band")
    ir = eng.generate_ir("Validate", seed=0)
    r = eng.validate_ir(ir)
    assert r.valid
