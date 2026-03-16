"""End-to-end tests for Frisell Atmosphere engine."""

from shared_composer.engine_registry import get_engine, ensure_engines_loaded


def test_frisell_atmosphere_registered():
    ensure_engines_loaded()
    eng = get_engine("frisell_atmosphere")
    assert eng.engine_name == "frisell_atmosphere"


def test_end_to_end_generation():
    ensure_engines_loaded()
    eng = get_engine("frisell_atmosphere")
    ir = eng.generate_ir("Open Study", mode="title", seed=0)
    compiled = eng.compile_from_ir(ir)
    xml = eng.export_musicxml(compiled)
    assert ir.title == "Open Study"
    assert compiled.sections
    assert "<score-partwise" in xml


def test_validate_ir():
    ensure_engines_loaded()
    eng = get_engine("frisell_atmosphere")
    ir = eng.generate_ir("Validate", seed=0)
    r = eng.validate_ir(ir)
    assert r.valid
