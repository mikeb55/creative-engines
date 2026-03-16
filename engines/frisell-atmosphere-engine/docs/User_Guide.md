# Frisell Atmosphere Engine — User Guide

## What This Engine Does

The Frisell Atmosphere Engine models Bill Frisell–style open harmony, Americana/ambient spaciousness, pedal tones, slow-moving harmonic fields, and warm ambiguity.

## How the Engine Models It

- **Open interval arcs** — Fifths, fourths, octaves, folk shadow
- **Pedal harmonic fields** — Slow-moving, suspended, maj7
- **Sparse lyric motifs** — Echo, registral drift, harmonic shadow
- **Asymmetric form** — Open songform, floating refrain
- **Chamber/ECM atmosphere** — Spacious, warm

## How Interval Atmosphere Works

Profiles: `open_fifths`, `pedal_melody`, `wistful_leaps`, `folk_shadow`, `ambient_fourths`.

Use `build_interval_language(seed, profile)` and `derive_atmosphere_cells(interval_language)` from the interval_language module.

## How Suspended / Open Harmony Works

Profiles: `pedal_field`, `americana_open`, `floating_major_minor`, `suspended_plain`, `ambient_modal`.

Harmony is nonfunctional, spacious, pedal-rich. Use `build_harmonic_field(seed, profile)` and `derive_section_harmony(harmonic_field, section_role)`.

## How to Generate Pieces

```python
from shared_composer.engine_registry import get_engine

eng = get_engine("frisell_atmosphere")
ir = eng.generate_ir("Open Study", mode="title", seed=0)
compiled = eng.compile_from_ir(ir)
xml = eng.export_musicxml(compiled)
```

## How to Export MusicXML

The engine exports valid MusicXML with melody part, rests where needed, tempo hint, and time signature. Use `eng.export_musicxml(compiled)`.

## Appendix: 20 Ways to Start a Frisell-Style Composition

1. Open with a pedal fifth, melody above
2. Start on sus4, add sparse fourths
3. Americana open fifths in low register
4. Wistful leap up, stepwise drift down
5. Folk shadow: fifth + fourth
6. Ambient fourths, slow motion
7. Pedal C, melody in sevenths
8. Floating major-minor blend
9. Asymmetric 7-bar phrase, then 5-bar
10. Echo of opening motif
11. Registral drift: phrase lifts
12. Elongation of first cell
13. Silence spacing between gestures
14. Contour softening: wide → narrow
15. Harmonic shadow: inverted return
16. Spacious return: 7+7+5 bars
17. Open songform: 5+7+5+6
18. Chamber ballad: 6+8+6
19. Pedal field: C–G–F centers
20. Melodic afterglow: last phrase fades
