# Ligeti Texture Engine

Models Ligeti-like texture thinking: micropolyphonic density fields, cluster clouds, registral swarms, slowly shifting textural masses, moving inner density, suspended pulse, texture as structure, asymmetrical density growth.

## What the Ligeti Texture Engine Does

- **Micropolyphonic density fields** — Multiple concurrent lines/clouds
- **Cluster clouds** — Semitone and chromatic interval clusters
- **Registral swarms** — Shifting register clouds
- **Slowly shifting masses** — Texture-led form
- **Suspended pulse** — Ambiguous beat, texture as structure
- **Asymmetrical density growth** — 3–5, 5–8, 7–11 bar phrase groups

## How Texture Is Modeled

- **Interval profiles**: cluster_semitone, micropoly_step, swarm_fourth, chromatic_cloud, registral_shimmer
- **Harmonic profiles**: cluster_mass, static_cloud, chromatic_swarm, suspended_density, shifting_register_field
- **Form profiles**: density_arc, suspended_texture_form, layered_cloud_form, asymmetrical_mass_growth, interrupted_texture_return
- **Texture plan**: per-section texture type (cloud, swarm, shimmer)
- **Density curve**: per-section density 0–1

## How Density Arcs Work

- `density_curve` maps section index to density
- Primary: moderate density
- Contrast: higher density (accumulation)
- Return: lower density (thinning)
- Form planner uses 3–5, 5–8, 7–11 bar phrase groups

## How to Export MusicXML

```python
from engines.shared_composer.engine_registry import get_engine, ensure_engines_loaded

ensure_engines_loaded()
eng = get_engine("ligeti_texture")
ir = eng.generate_ir("Cluster Cloud", mode="title", seed=0)
compiled = eng.compile_from_ir(ir)
xml = eng.export_musicxml(compiled)
```

## Appendix: 20 Ways to Start a Ligeti-Style Texture Composition

1. Single semitone cluster, slowly spread
2. Micropolyphonic line, add second line at +3
3. Registral swarm, 5-bar phrase
4. Chromatic cloud, static center
5. Density arc: sparse → dense → sparse
6. Cluster mass, suspended pulse
7. Swarm fourth, register drift
8. Shimmer contour, texture thinning return
9. Layered cloud form, 7+5+7+5
10. Interrupted texture return, 11-bar final section
11. Static cloud, no harmonic motion
12. Shifting register field, 3-bar phrases
13. Cluster spread operation
14. Register drift, return transposed
15. Micropolyphonic overlap
16. Swarm rotation
17. Density accumulation in contrast
18. Texture-as-structure, no melody default
19. Asymmetrical mass growth
20. Suspended texture form, 5+8+5
