"""End-to-end tests for Barry Harris engine."""

try:
    from .generator import generate_composer_ir_from_title, generate_composer_ir_from_premise, generate_composer_ir_candidates
    from .section_compiler import compile_composition_from_ir
    from .musicxml_exporter import export_composition_to_musicxml
    from .example_compositions import all_examples, compile_all_examples
except ImportError:
    from generator import generate_composer_ir_from_title, generate_composer_ir_from_premise, generate_composer_ir_candidates
    from section_compiler import compile_composition_from_ir
    from musicxml_exporter import export_composition_to_musicxml
    from example_compositions import all_examples, compile_all_examples


def test_title_to_compile_to_musicxml():
    ir = generate_composer_ir_from_title("Bebop Head", seed=42)
    comp = compile_composition_from_ir(ir)
    xml = export_composition_to_musicxml(comp)
    assert "Bebop Head" in xml
    assert "</score-partwise>" in xml


def test_premise_to_compile_to_musicxml():
    ir = generate_composer_ir_from_premise("Blues in F", seed=17)
    comp = compile_composition_from_ir(ir)
    xml = export_composition_to_musicxml(comp)
    assert xml.startswith('<?xml')


def test_candidates_compile_and_export():
    cands = generate_composer_ir_candidates("Test", mode="title", count=4, seed=0)
    for ir in cands:
        comp = compile_composition_from_ir(ir)
        xml = export_composition_to_musicxml(comp)
        assert xml


def test_all_examples_compile():
    comps = compile_all_examples()
    assert len(comps) == 4
    for c in comps:
        assert c.title
        assert len(c.sections) >= 1


def test_all_examples_export():
    comps = compile_all_examples()
    for c in comps:
        xml = export_composition_to_musicxml(c)
        assert "<score-partwise" in xml
        assert "<work-title>" in xml
