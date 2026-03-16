# Big Band Bridge — User Guide

## How Form, Texture, and Big Band Architecture Combine

- **Form** (Wayne Shorter): section_order, section_roles, phrase_plan
- **Texture** (Ligeti): texture_plan, density_curve, cluster_field_type
- **Big Band**: sectional_roles, density_plan, sax_texture_plan, shout_chorus_flag

The bridge merges these into one Big Band IR and compiles a sectional blueprint.

## Suggested Workflows

1. **Form-led** — Shorter form first; add Ligeti texture; host in Big Band
2. **Texture-led** — Ligeti texture first; map to form sections; host in Big Band
3. **Ensemble-led** — Big Band first; inject form + texture

## Pipeline

```python
from engines.big_band_bridge.big_band_bridge_runtime import run_big_band_form_texture_bridge

result = run_big_band_form_texture_bridge(
    "Form Texture Chart",
    form_seed=0,
    texture_seed=0,
    ensemble_seed=0,
)
compiled = result["compiled"]
xml = result["musicxml"]
```

## Appendix: 20 Form/Texture → Big Band Workflows

1. Shorter 7+9+7 + Ligeti density arc → Big Band
2. Compact asymmetrical + cluster cloud → sectional density
3. Odd phrase ABA + micropoly step → sax texture
4. Bridge reframed return + registral shimmer → brass placement
5. Floating sectional + suspended swarm → intro/primary/contrast/return
6. Form phrase lengths → section bar counts
7. Texture density curve → density_plan
8. Ligeti texture_plan → sax_texture_plan
9. Shout section → shout_chorus_flag
10. Cluster field → sectional hints
11. Three seeds → deterministic merge
12. run_big_band_form_texture_bridge() → full pipeline
13. merge_form_and_texture() → merged IR
14. map_density_to_sections() → density map
15. translate_texture_to_big_band_sections() → sax plan
16. build_sectional_texture_layers() → texture hints
17. score_form_texture_fit() → compatibility
18. Hybrid: Shorter + Ligeti + Big Band
19. Development: texture accumulation
20. Return: texture thinning + form return
