# Andrew Hill Engine — User Guide

## What the Engine Does

The Andrew Hill engine generates angular modern jazz composition plans with intervallic logic, cluster harmonies, and irregular phrase structures. Melody is built from interval cells; harmony is loosely supportive; rhythm displacement is allowed.

## Musical Grammar Used

- **Intervallic cells** — Wide intervals, minor seconds, tritones, major sevenths
- **Angular melodic motion** — Leaps, not scalar runs
- **Rhythmic displacement** — Off-beat accents, displaced phrasing
- **Cluster harmonies** — Dense chord voicings
- **Nonfunctional harmonic motion** — Avoids ii–V–I
- **Irregular phrase structures** — 5, 7, 9-bar phrases

## How Compositions Are Generated

1. **Title or premise** → hashed to select profiles
2. **Interval language** → angular, wide_angular, cluster_adjacent
3. **Harmonic field** → cluster_based, ambiguous_modal, nonfunctional_cycle, pedal_center
4. **Form** → irregular_5_7_5, asymmetrical_7_9, sectional_contrast, floating_odd
5. **Section compiler** → melody from interval cells, rhythm displacement, harmony loosely supportive

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

## Appendix: 20 Ways to Start a Hill-Style Composition

1. Title first — "Angular Modern Head", "Cluster Harmony"
2. Premise first — "Cluster harmony piece with intervallic cells"
3. Angular profile — tritone, M7, m2
4. Wide angular — M7, tritone, m9
5. Cluster adjacent — m2, M2, chromatic
6. Cluster-based harmony — dense voicings
7. Ambiguous modal — shifting centers
8. Nonfunctional cycle — no resolution
9. Pedal center — sustained bass
10. Irregular 5+7+5 form — asymmetrical
11. Asymmetrical 7+9 — two sections
12. Sectional contrast — 4+6+5+7
13. Floating odd — 5+7+6+5
14. Fragmentation development — shorten cells
15. Registral displacement — octave shift
16. Irregular transformation — inversion
17. Avoid tonal clichés — no ii–V
18. Avoid symmetrical phrases — odd lengths
19. Avoid predictable cadence — open endings
20. Multiple candidates — generate_composer_ir_candidates
