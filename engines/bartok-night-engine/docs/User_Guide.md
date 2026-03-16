# Bartók Night Engine — User Guide

## What Bartók Night Music Is

Bartók's "night music" style appears in works like *Out of Doors*, *Music for Strings, Percussion and Celesta*, and *Concerto for Orchestra*. It features sparse textures, atmospheric writing, dissonant clusters, isolated melodic fragments, irregular rhythms, and naturalistic gestures (bird calls, insect-like figures).

## How the Engine Models It

- **Interval fragments** — m2, tritone, P4/P5, isolated leaps
- **Cluster harmonic fields** — Nonfunctional, modal but unstable
- **Isolated motifs** — Short gestures separated by silence
- **Asymmetric form** — 3–5, 5–7, 7–9 bar phrase groups
- **Texture-driven sections** — Contrast through texture, not harmony

## How Interval Fragments Work

Profiles: `minor_second_cluster`, `tritone_axis`, `fourth_fifth_space`, `insect_motif`, `modal_fragment`.

Use `build_interval_language(seed, profile)` and `derive_fragment_cells(interval_language)` from the interval_language module. The engine applies these automatically when generating.

## How Cluster Fields Operate

Profiles: `cluster_field`, `modal_axis`, `chromatic_center`, `suspended_field`, `naturalistic_field`.

Harmony is nonfunctional, cluster-rich, and avoids resolution.

## How to Generate Pieces

```python
from shared_composer.engine_registry import get_engine

eng = get_engine("bartok_night")
ir = eng.generate_ir("Night Study", mode="title", seed=0)
compiled = eng.compile_from_ir(ir)
xml = eng.export_musicxml(compiled)
```

## How to Export MusicXML

The engine exports valid MusicXML with melody part, rests between fragments, tempo hint, and time signature. Use `eng.export_musicxml(compiled)`.

## Appendix: 20 Ways to Start a Bartók Night-Style Composition

1. Begin with a single m2 cluster gesture
2. Open with tritone + minor second
3. Start on a sustained pedal, add fragments above
4. Use P4/P5 leaps in sparse rhythm
5. Insect-like repeated m2 figures
6. Modal fragment in low register
7. Isolated gesture, long rest, second gesture
8. Cluster chord, silence, single note
9. Asymmetric 5-bar phrase, then 7-bar
10. Tritone axis with chromatic neighbor
11. Bird-call contour: up, down, up
12. Suspended harmony, no resolution
13. Naturalistic field: open fifths
14. Chromatic center, dim7 color
15. Fragmented return: first phrase truncated
16. Floating segments: 4+6+5+7 bars
17. Registral shift of opening motif
18. Rhythmic isolation: one note per bar
19. Cluster expansion of 2-note cell
20. Interval widening: small → large leap
