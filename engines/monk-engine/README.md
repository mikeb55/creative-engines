# Monk Engine

A deterministic composer engine for Monk-like compositions: angular melodic shapes, rhythmic displacement, off-beat accents, blues-inflected harmony, unexpected pauses.

## Architecture

```
Composer IR → Validator → Generator → Form/Section Compiler → MusicXML Export
```

## Musical Grammar

- **Interval language**: leaps, repeated pitch cells, minor seconds and tritones
- **Harmonic fields**: blues_shadowed, altered_dominant, chromatic_shift, stride_shadow
- **Motif development**: repetition, displacement, rhythmic stabs, silence punctuation
- **Form**: compact jazz (16-bar), quirky phrase extensions (17-bar), blues 12, odd 15

## Run Tests

```bash
python -m pytest . -v
```

## Example Usage

```python
from generator import generate_composer_ir_from_title, generate_composer_ir_candidates
from section_compiler import compile_composition_from_ir
from musicxml_exporter import export_composition_to_musicxml

ir = generate_composer_ir_from_title("Blues Head", seed=42)
comp = compile_composition_from_ir(ir)
xml = export_composition_to_musicxml(comp)
```
