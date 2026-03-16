# Wayne Shorter Form Engine — User Guide

## Shorter Compositional Thinking

Wayne Shorter’s compositions emphasize:

- **Narrative arcs** — Sections tell a story; development and return are not mechanical repeats.
- **Asymmetry** — Phrase lengths vary (5, 7, 9, 11 bars); symmetry is avoided.
- **Thematic transformation** — Motifs return in altered form (fragment, register shift, contour reversal).
- **Harmony as narrative** — Modal shifts and chromatic drift support the form, not ii–V cycles.
- **Modular structure** — Sections can be recombined; form is flexible.

## Narrative Form Planning

1. Choose a **form profile** (e.g. `narrative_arc_form`, `modular_shorter_form`).
2. The engine plans **phrase lengths** (5–7, 7–9, 9–11 bars).
3. **Section roles** map to narrative moments: exposition, development, return.
4. **Asymmetry** is preserved; phrase lengths are not balanced.

## Motif Transformation Workflow

1. **Primary theme** — Motivic cells are stated.
2. **Development** — Operations: `interval_expansion`, `motif_recontextualization`, `rhythmic_mutation`, `register_reposition`, `contour_reversal`.
3. **Return** — `fragment_return` or `motif_recontextualization`; the return changes meaning.

## Hybrid Engine Usage

Use the Shorter Form Engine as the **form source** in a hybrid:

- **Form engine** — `shorter_form` provides structure.
- **Melody engine** — Expands `CompiledMelodyBlueprint` into full melody.
- **Harmony engine** — Uses `CompiledHarmonyPlan` chord centers.
- **Texture engine** — Applies orchestration per section role.

Example:

```python
from shared_composer.engine_registry import get_engine, ensure_engines_loaded

ensure_engines_loaded()
form_eng = get_engine("shorter_form")
melody_eng = get_engine("wayne_shorter")  # or another melodic engine

ir = form_eng.generate_ir("Narrative Theme", mode="title", seed=0)
compiled = form_eng.compile_from_ir(ir)
# Use compiled.sections, compiled.narrative_arc for downstream engines
```
