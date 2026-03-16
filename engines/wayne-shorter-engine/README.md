# Wayne Shorter Engine

A deterministic **composer engine** for instrumental composition in a Wayne-Shorter-inspired language. Generates composition plans and compiled outputs—melody blueprints, harmony, form—from titles or premises.

## What This Is

- **Composer engine** (not a songwriting engine): instrumental composition, motivic development, harmonic ambiguity, asymmetrical form
- **Deterministic**: same title + seed → same result
- **Typed IR → Validator → Generator → Form/Section Compiler → MusicXML export**
- Template for future composer engines (Monk, Hill, Barry Harris, etc.)

## How It Differs From Songwriting Engine

| Songwriting Engine | Wayne Shorter Engine |
|--------------------|----------------------|
| Lyrics, verse/chorus, hooks | Instrumental, motivic, form-driven |
| Symmetrical phrasing | Asymmetrical phrase structures |
| Functional harmony | Harmonic ambiguity, nonfunctional motion |
| Song form | Through-composed, bridge-reframed returns |

## Architecture

```
Composer IR
    ↓
Validator
    ↓
Generator
    ↓
Form / section compiler
    ↓
Compiled composition
    ↓
MusicXML export
```

## Run Tests

From the engine directory:

```bash
python -m pytest test_*.py -v
```

Or from project root:

```bash
python -m pytest engines/wayne-shorter-engine/test_*.py -v
```

## Example Usage

```python
from shorter_generator import generate_composer_ir_from_title, generate_composer_ir_candidates
from shorter_section_compiler import compile_composition_from_ir
from shorter_musicxml_exporter import export_composition_to_musicxml

# From title
ir = generate_composer_ir_from_title("Footprints in the Rain", seed=42)
comp = compile_composition_from_ir(ir)
xml = export_composition_to_musicxml(comp)

# Multiple candidates
candidates = generate_composer_ir_candidates("Nefertiti", mode="title", count=12, seed=0)
```

## User Guide

- `docs/User_Guide.md` — Composer-friendly guide
- `docs/User_Guide.docx` — Same content (run `python build_docx.py` to regenerate)

## Files

- `composer_ir.py` — Typed IR
- `composer_ir_validator.py` — Validation
- `shorter_interval_language.py` — Interval fingerprints
- `shorter_harmonic_fields.py` — Harmonic fields
- `shorter_motif_development.py` — Motif development
- `shorter_form_planner.py` — Form and phrase planning
- `shorter_generator.py` — IR generation
- `shorter_section_compiler.py` — Section compilation
- `compiled_composition_types.py` — Compiled types
- `shorter_musicxml_exporter.py` — MusicXML export
- `example_compositions.py` — Canonical examples
