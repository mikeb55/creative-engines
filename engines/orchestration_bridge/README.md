# Orchestration Bridge

Maps compiled compositions to ensemble arrangements with instrument profiles, range allocation, spacing rules, and texture mapping.

## Ensembles

- `string_quartet`
- `chamber_jazz_quintet`
- `chamber_jazz_sextet`
- `big_band_basic`
- `guitar_trio`
- `guitar_string_quartet`

## Usage

```python
from orchestration_bridge import orchestrate_composition, export_ensemble_to_musicxml

arrangement = orchestrate_composition(compiled, "string_quartet", seed=0)
xml = arrangement["musicxml"]
```
