# Messiaen Colour Engine — User Guide

## Quick Start

```python
from shared_composer.engine_registry import get_engine

eng = get_engine("messiaen_colour")
ir = eng.generate_ir("Mode-2 Colour Panel", mode="title", seed=0)
compiled = eng.compile_from_ir(ir)
xml = eng.export_musicxml(compiled)
```

## Colour-Based Composition Workflow

1. Choose input (title or premise)
2. Engine selects profile: birdsong_fragment, luminous_fourths, mode_coloured_seconds, ecstatic_leaps, chromatic_colour_cluster
3. Harmony: mode_2_field, mode_3_field, colour_chord_field, radiant_axis, suspended_ecstatic, static_luminous_center
4. Form: colour_panels, ecstatic_arc, asymmetrical_radiance, birdsong_interruption_form, static_center_transformed_return
5. Compile → Export MusicXML

## Modes of Limited Transposition in This Engine

- **Mode 2:** Octatonic-derived centres (C, Eb, F#)
- **Mode 3:** 9-note-derived centres (C, Eb, G)
- **Colour chord field:** Tritone-related centres
- **Radiant axis:** Major-third related centres
- **Static luminous centre:** Pedal with colour variation

## Birdsong Fragment Logic

- Primary intervals: bright seconds (1, 2), fourths (5, 7), tritones (6), wide leaps (12)
- Short gesture cells derived from interval language
- Colour repetition, echo transposition, non-retrogradable reflection

## Export MusicXML

- Title, part-list, measures, notes, rests
- Time signature 4/4, tempo hint 66–86
- Valid, compact output

## Appendix: 20 Ways to Start a Messiaen-Style Colour Composition

1. Mode-2 colour panel in C
2. Birdsong fragment miniature
3. Ecstatic asymmetrical arc
4. Static centre with transformed return
5. Luminous fourths interval language
6. Mode-coloured seconds
7. Ecstatic leaps
8. Chromatic colour cluster
9. Colour chord field harmony
10. Radiant axis centres
11. Suspended ecstatic harmony
12. Static luminous centre
13. Birdsong interruption form
14. Registral illumination motif
15. Non-retrogradable reflection
16. Colour repetition development
17. Echo transposition
18. Rhythmic addition
19. Mode shift contrast
20. Birdsong fragmentation
