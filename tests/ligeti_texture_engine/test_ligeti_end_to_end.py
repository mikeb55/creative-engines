"""End-to-end tests for Ligeti Texture engine."""

from shared_composer.engine_registry import get_engine, ensure_engines_loaded


def test_ligeti_texture_registered():
    ensure_engines_loaded()
    eng = get_engine("ligeti_texture")
    assert eng.engine_name == "ligeti_texture"


def test_end_to_end_generation():
    ensure_engines_loaded()
    eng = get_engine("ligeti_texture")
    ir = eng.generate_ir("Cluster Cloud", mode="title", seed=0)
    compiled = eng.compile_from_ir(ir)
    xml = eng.export_musicxml(compiled)
    assert ir.title == "Cluster Cloud"
    assert compiled.sections
    assert "<score-partwise" in xml


def test_validate_ir():
    ensure_engines_loaded()
    eng = get_engine("ligeti_texture")
    ir = eng.generate_ir("Validate", seed=0)
    r = eng.validate_ir(ir)
    assert r.valid
