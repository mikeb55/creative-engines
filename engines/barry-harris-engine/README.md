# Barry Harris Engine

A deterministic composer engine for compositions using Barry Harris harmonic logic: 6th diminished system, diminished passing chords, bebop scale logic, voice-leading.

## Architecture

```
Composer IR → Validator → Generator → Form/Section Compiler → MusicXML Export
```

## Musical Grammar

- **Interval language**: step motion, chromatic enclosure
- **Harmonic fields**: major6_dim, minor6_dim, dominant_dim, minor_conversion
- **Motif development**: bebop cells, enclosure figures, scalar embellishment
- **Form**: compact jazz (8/16 bar cycles), AABA, blues, rhythm changes

## Run Tests

```bash
python -m pytest . -v
```

## Example Usage

```python
from generator import generate_composer_ir_from_title, generate_composer_ir_candidates
from section_compiler import compile_composition_from_ir
from musicxml_exporter import export_composition_to_musicxml

ir = generate_composer_ir_from_title("Bebop Head", seed=42)
comp = compile_composition_from_ir(ir)
xml = export_composition_to_musicxml(comp)
```

## Files

- composer_ir.py, composer_ir_validator.py
- interval_language.py, harmonic_fields.py, motif_development.py
- form_planner.py, generator.py
- compiled_composition_types.py, section_compiler.py, musicxml_exporter.py
- example_compositions.py
