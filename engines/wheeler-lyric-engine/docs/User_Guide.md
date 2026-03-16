# Wheeler Lyric Engine — User Guide

## What This Engine Does

The Wheeler Lyric Engine models Kenny Wheeler–style lyrical modern jazz: long-arc melody, suspended harmony, wide intervals used lyrically, chamber-jazz atmosphere, and asymmetric phrase design.

## How the Engine Models It

- **Lyrical interval arcs** — 4ths, 5ths, 6ths, 9th-like contour
- **Suspended harmonic fields** — maj7, sus4, sus2, spacious and warm
- **Long-arc motifs** — Elongation, registral lift, return variation
- **Asymmetric form** — 5–7, 7–9, 9–11 bar phrase groups
- **Emotionally coherent returns** — Transformed reprise with lift

## How Lyrical Interval Arcs Work

Profiles: `lyrical_wide`, `suspended_fourths`, `sixth_ninth_arc`, `wistful_minor_major`, `floating_octave_leap`.

Use `build_interval_language(seed, profile)` and `derive_lyric_cells(interval_language)` from the interval_language module. The engine applies these automatically when generating.

## How Suspended Harmony Works

Profiles: `suspended_lyric`, `floating_modal`, `open_tonal_center`, `major_minor_shade`, `chamber_ecm`, `soft_axis`.

Harmony is nonfunctional but warm, spacious, and suspended. Use `build_harmonic_field(seed, profile)` and `derive_section_harmony(harmonic_field, section_role)`.

## How to Generate Pieces

```python
from shared_composer.engine_registry import get_engine

eng = get_engine("wheeler_lyric")
ir = eng.generate_ir("Lyrical Study", mode="title", seed=0)
compiled = eng.compile_from_ir(ir)
xml = eng.export_musicxml(compiled)
```

## How to Export MusicXML

The engine exports valid MusicXML with melody part, rests where needed, tempo hint, and time signature. Use `eng.export_musicxml(compiled)`.

## Appendix: 20 Ways to Start a Wheeler-Style Lyrical Composition

1. Open with a rising fourth, then fifth
2. Start on a maj7 chord, melody in 6ths and 9ths
3. Long phrase over suspended harmony
4. Wide leap up, stepwise descent
5. Sixth-ninth arc in mid register
6. Wistful minor-major blend
7. Floating octave leap, then lyrical fill
8. Sustained note, then lyrical phrase
9. Asymmetric 7-bar phrase, then 9-bar
10. Bridge section with registral lift
11. Return with inverted contour
12. Chamber ballad: 9+7+9 bars
13. Open fifths in bass, melody above
14. Soft axis: C–D–F centers
15. Elongation of opening motif
16. Interval softening: wide → narrow
17. Rhythmic spread: sustained over bar
18. Echo fragment of first phrase
19. Return variation with +5 registral shift
20. Lyrical afterglow: last phrase fades
