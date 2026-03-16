# Songwriting Bridge — User Guide

## Quick Start

Build a lead sheet from a composition:

```python
from songwriting_bridge import build_lead_sheet_from_composition, export_lead_sheet_to_musicxml

lead_sheet = build_lead_sheet_from_composition(compiled, voice_type="male_tenor")
xml = export_lead_sheet_to_musicxml(lead_sheet)
```

## Voice Types

- **male_tenor** (default)
- **male_baritone**
- **male_bass**
- **female_lead**
- **female_alto**

## Lead Sheet Contents

- Vocal melody (adapted to range)
- Chord symbols
- Lyric placeholders (phrase-based)
- Form summary (verse/chorus/bridge)

## Workflow

1. Compose (engine or hybrid)
2. Call `build_lead_sheet_from_composition(compiled, voice_type)`
3. Export MusicXML or summary

## Appendix: 20 Useful Workflows

1. Wheeler lyric → male_tenor lead sheet
2. Frisell → female_lead
3. Shorter → male_baritone
4. Harris bebop → male_tenor
5. Bartok → female_alto
6. Monk → male_tenor
7. Hill → male_baritone
8. Wheeler + lyric placeholders
9. Frisell spacious → female_lead
10. Shorter modal → male_tenor
11. Harris → female_lead
12. Bartok dark → male_bass
13. Monk rhythmic → male_tenor
14. Hill chromatic → male_baritone
15. Wheeler ballad → female_alto
16. Frisell ambient → male_tenor
17. Shorter free → female_lead
18. Harris swing → male_tenor
19. Bartok folk → female_lead
20. Monk sparse → male_baritone
