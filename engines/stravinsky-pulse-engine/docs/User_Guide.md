# Stravinsky Pulse Engine — User Guide

## Quick Start

```python
from shared_composer.engine_registry import get_engine

eng = get_engine("stravinsky_pulse")
ir = eng.generate_ir("Pulse Block Study", mode="title", seed=0)
compiled = eng.compile_from_ir(ir)
xml = eng.export_musicxml(compiled)
```

## What This Engine Does

- Pulse-cell construction
- Accent displacement
- Block-based form contrast
- Asymmetrical repetition
- Rhythmic architecture first, harmonic support secondary

## Interval Profiles

- pulse_fifth, sharp_second, block_fourth, dry_leap_cell, repeated_accent_pitch

## Harmonic Profiles

- block_modal, dry_axis, ostinato_center, stark_quartal, pulse_pedal

## Motif Operations

- pulse_repeat, accent_shift, block_cut, registral_jump, cycle_extension, rhythmic_rebarring

## Form Profiles

- block_contrast, asymmetrical_ostinato, pulse_arc, sectional_refrain, cut_return

## Shared Rhythm/Disruption Layer

The engine uses `engines/shared_rhythm_disruption/` for pulse cells, accent displacement, block contrast, and asymmetrical cycles.

## Export MusicXML

- Title, part-list, measures, notes, rests
- Time signature 4/4, tempo hint 110–140
- Valid, compact output

## Appendix: 20 Ways to Start a Stravinsky-Style Pulse Composition

1. Pulse block study in C
2. Accent displacement miniature
3. Asymmetrical ostinato piece
4. Stark sectional refrain
5. Dry leap cell motif
6. Block fourth interval language
7. Sharp second tension
8. Ostinato center harmony
9. Pulse arc form
10. Cut return structure
11. Registral jump contrast
12. Rhythmic rebarring development
13. Stark quartal harmony
14. Pulse pedal bass
15. Block modal centers
16. Cycle extension motif
17. Sectional refrain form
18. Dry axis harmony
19. Repeated accent pitch
20. Asymmetrical cycle 5+3
