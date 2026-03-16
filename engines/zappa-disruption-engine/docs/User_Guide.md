# Zappa Disruption Engine — User Guide

## Quick Start

```python
from shared_composer.engine_registry import get_engine

eng = get_engine("zappa_disruption")
ir = eng.generate_ir("Interruption Collage", mode="title", seed=0)
compiled = eng.compile_from_ir(ir)
xml = eng.export_musicxml(compiled)
```

## What This Engine Does

- Abrupt formal cuts
- Interruption logic
- Genre-collision style block switching
- Jagged rhythmic disruption
- Asymmetrical cycle breaking
- Motif interruption and re-entry

## Interval Profiles

- jagged_cut, chromatic_burst, satirical_leap, disruption_cell, odd_repeat_break

## Harmonic Profiles

- collision_field, altered_shift, abrupt_modal_cut, chromatic_break, unstable_axis

## Motif Operations

- interruption, sudden_reentry, genre_cut, registral_snap, rhythmic_break, motif_collision

## Form Profiles

- interruption_form, cut_collage, false_return, asymmetrical_collision, abrupt_refrain_break

## Shared Rhythm/Disruption Layer

Uses `engines/shared_rhythm_disruption/` for interruption patterns, block contrast, asymmetrical cycles.

## Export MusicXML

- Title, part-list, measures, notes, rests
- Time signature 4/4, tempo hint 130–160
- Valid, compact output

## Appendix: 20 Ways to Start a Zappa-Style Disruption Composition

1. Interruption collage in C
2. False-return miniature
3. Asymmetrical disruption theme
4. Abrupt modal cut piece
5. Jagged cut motif
6. Chromatic burst interval language
7. Satirical leap
8. Collision field harmony
9. Cut collage form
10. False return structure
11. Registral snap contrast
12. Rhythmic break development
13. Unstable axis harmony
14. Chromatic break centers
15. Disruption cell motif
16. Motif collision return
17. Abrupt refrain break form
18. Altered shift harmony
19. Odd repeat break
20. Asymmetrical collision form
