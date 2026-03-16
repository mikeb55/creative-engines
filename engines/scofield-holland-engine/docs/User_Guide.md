# Scofield Holland Engine — User Guide

## Quick Start

```python
from shared_composer.engine_registry import get_engine

eng = get_engine("scofield_holland")
ir = eng.generate_ir("Chromatic Groove Head", mode="title", seed=0)
compiled = eng.compile_from_ir(ir)
xml = eng.export_musicxml(compiled)
```

## Groove-First Workflow

1. Choose input (title or premise)
2. Engine selects profile: chromatic_riff, blues_modern, groove_cell, angular_funk, short_burst_repeat
3. Harmony: funk_blues_modern, chromatic_dominant, bass_axis_motion
4. Form: groove_head_form, riff_aaba, vamp_bridge_return
5. Compile → Export MusicXML

## Riff Generation Logic

- **Primary intervals:** semitones (1, -1), fourths (5, 6), repeated notes (0)
- **Riff cells:** derived from interval language; repeated with variation
- **Motif operations:** riff_repeat, chromatic_shift, rhythmic_displacement, blues_inflection, registral_punch

## Bass-Aware Harmony

- Chord centers support bass-axis motion
- Groove-supportive 7, m7, 7sus
- Section roles: primary, contrast, return with appropriate harmonic shift

## Export MusicXML

- Title, part-list, measures, notes, rests
- Time signature 4/4, tempo hint 90–120
- Valid, compact output

## Appendix: 20 Ways to Start a Scofield-Holland-Style Composition

1. Chromatic groove head in C
2. Blues-modern riff in F
3. Bass-aware asymmetrical theme
4. Vamp-bridge-return tune
5. Angular funk riff
6. Short burst repeat motif
7. Groove cell in G
8. Chromatic blues arc
9. Riff AABA form
10. Small-group interplay theme
11. Pocket-based 7-bar phrase
12. Quartal funk harmony
13. Minor blues shadow
14. Chromatic dominant vamp
15. Pedal groove field
16. Bass-axis motion head
17. Syncopated extension motif
18. Blues inflection riff
19. Registral punch return
20. Groove fragmentation contrast
