# Ligeti Texture Engine — User Guide

## Modern Texture Workflow

1. **Generate IR** — From title or premise; seed controls determinism.
2. **Validate** — IR validator checks required fields.
3. **Compile** — Section compiler produces texture blueprint (multiple lines/clouds).
4. **Export** — MusicXML exporter writes valid compact blueprint.

## Texture Modeling

- **Texture plan**: primary=cloud, contrast=swarm, return=shimmer
- **Density curve**: per-section density values
- **Cluster field type**: chromatic_cloud, cluster_semitone, etc.
- **Micropolyphony flag**: enables multiple concurrent lines

## Density Arc Logic

- Primary: moderate density (0.5)
- Contrast: higher density (0.7+)
- Return: lower density (0.4), texture thinning

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
