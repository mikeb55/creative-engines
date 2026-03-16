# Wayne Shorter Form Engine

Modern jazz compositional architecture: asymmetrical forms, narrative section design, thematic transformation, non-cyclical development, return-with-change structures, modular composition grammar.

## Philosophy

This engine generates **form intelligence** only. It does not produce orchestration or ensemble textures. It produces:

- Narrative form arcs
- Asymmetrical sections
- Motif transformation across sections
- Harmony shifts tied to narrative moments
- Returns that change meaning
- Modular sections that recombine
- Melody-driven harmony

## Avoids

- Rigid AABA loops
- Mechanical ii–V cycling
- Symmetrical phrase repetition

## Using with Other Engines

The Shorter Form Engine is designed to feed other engines:

1. **Form skeleton** — Use `CompiledComposition` as structural input for melody, harmony, or texture engines.
2. **Section roles** — `primary`, `development`, `return` (and `episode`, `coda` in modular forms) drive downstream orchestration.
3. **Motif blueprints** — `CompiledMelodyBlueprint` intervals and contours can be expanded by melodic engines.
4. **Harmonic fields** — `CompiledHarmonyPlan` provides chord centers for harmonic engines.

## Profiles

- **narrative_arc_form** — Exposition → development → return
- **modular_shorter_form** — Primary, development, return, coda
- **asymmetric_cycle_form** — 5–9–7 phrase groups
- **transformed_return_form** — 7–9–11 phrase groups
- **episode_variation_form** — Primary, episode, development, return

## Quick Start

```python
from shared_composer.engine_registry import get_engine, ensure_engines_loaded

ensure_engines_loaded()
eng = get_engine("shorter_form")
ir = eng.generate_ir("Footprints", mode="title", seed=0)
r = eng.validate_ir(ir)
compiled = eng.compile_from_ir(ir)
xml = eng.export_musicxml(compiled)
```
