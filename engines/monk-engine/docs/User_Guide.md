# Monk Engine — User Guide

## What the Engine Does

The Monk engine generates composition plans with Monk-like rhythmic and motivic logic: angular melodic shapes, rhythmic displacement, off-beat accents, blues-inflected harmony, and unexpected pauses. It preserves awkward charm and avoids smooth scalar lines.

## Musical Grammar Used

- **Angular melodic shapes** — Leaps, not scalar runs
- **Rhythmic displacement** — Off-beat accents, displaced phrasing
- **Motivic repetition** — Repeated pitch cells
- **Minor seconds and tritones** — Characteristic interval language
- **Blues-inflected harmony** — 7ths, altered dominants
- **Unexpected pauses** — Silence punctuation

## How Compositions Are Generated

1. **Title or premise** → hashed to select profiles
2. **Interval language** → angular, repeated_cell, leap_m2
3. **Harmonic field** → blues_shadowed, altered_dominant, chromatic_shift, stride_shadow
4. **Form** → compact_16, quirky_17, blues_12, odd_15
5. **Section compiler** → rhythm-driven melody, harmony supports motif, abrupt stops allowed

## How to Run Examples

```python
from example_compositions import all_examples, compile_all_examples

irs = all_examples()
comps = compile_all_examples()
```

## MusicXML Export

```python
from generator import generate_composer_ir_from_title
from section_compiler import compile_composition_from_ir
from musicxml_exporter import export_composition_to_musicxml

ir = generate_composer_ir_from_title("Your Title", seed=0)
comp = compile_composition_from_ir(ir)
xml = export_composition_to_musicxml(comp)
with open("output.xml", "w", encoding="utf-8") as f:
    f.write(xml)
```

## Appendix: 20 Ways to Start a Monk-Style Composition

1. Title first — "Blues-Inflected Head", "Quirky 16-Bar Tune"
2. Premise first — "Angular motif piece with rhythmic displacement"
3. Angular profile — tritone, m2, 4th
4. Repeated cell — repeat, tritone, repeat
5. Leap m2 — 5th, m2, 4th
6. Blues-shadowed harmony — C, Eb, F, G
7. Altered dominant — 7alt, 7b9
8. Chromatic shift — C, Db, D, Eb
9. Stride shadow — 6, 7, m7
10. Compact 16-bar form — 4+4+4+4
11. Quirky 17-bar — 4+5+4+4
12. Blues 12-bar — 4+4+4
13. Odd 15-bar — 4+5+6
14. Repetition development — repeat motif
15. Displacement development — shift register
16. Rhythmic stab — shorten to 2 notes
17. Silence punctuation — allow rests
18. Avoid smooth scalar lines — use leaps
19. Avoid predictable bebop flow — displacement
20. Multiple candidates — generate_composer_ir_candidates
