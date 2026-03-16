# Andrew Hill Engine

A deterministic composer engine for angular modern jazz compositions: intervallic cells, cluster harmonies, irregular phrase structures.

## Architecture

```
Composer IR → Validator → Generator → Form/Section Compiler → MusicXML Export
```

## Musical Grammar

- **Interval language**: wide intervals, minor seconds, tritones, major sevenths
- **Harmonic fields**: cluster_based, ambiguous_modal, nonfunctional_cycle, pedal_center
- **Motif development**: fragmentation, registral displacement, irregular transformation
- **Form**: irregular phrase groups (5+7+5), asymmetrical forms, sectional contrast

## Run Tests

```bash
python -m pytest . -v
```

## Example Usage

```python
from generator import generate_composer_ir_from_title, generate_composer_ir_candidates
from section_compiler import compile_composition_from_ir
from musicxml_exporter import export_composition_to_musicxml

ir = generate_composer_ir_from_title("Angular Head", seed=42)
comp = compile_composition_from_ir(ir)
xml = export_composition_to_musicxml(comp)
```
