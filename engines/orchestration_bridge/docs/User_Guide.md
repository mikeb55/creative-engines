# Orchestration Bridge — User Guide

## Quick Start

Map a compiled composition to an ensemble arrangement:

```python
from orchestration_bridge import orchestrate_composition

arrangement = orchestrate_composition(compiled, "string_quartet", seed=0)
xml = arrangement["musicxml"]
```

## Ensembles

- **string_quartet** — Violin I/II, Viola, Cello
- **chamber_jazz_quintet** — Trumpet, Alto Sax, Piano, Bass, Drums
- **chamber_jazz_sextet** — Adds Tenor Sax
- **big_band_basic** — Lead trumpet, section brass/woodwinds, rhythm
- **guitar_trio** — Lead, Rhythm, Bass
- **guitar_string_quartet** — Four guitars

## Workflow

1. Compose (engine or hybrid)
2. Call `orchestrate_composition(compiled, ensemble_type)`
3. Export MusicXML from `arrangement["musicxml"]`

## Appendix: 20 Useful Workflows

1. Frisell → guitar_string_quartet
2. Wheeler → chamber_jazz_sextet
3. Shorter + Harris hybrid → string_quartet
4. Bartok → chamber_jazz_quintet
5. Monk → big_band_basic
6. Hill → string_quartet
7. Wheeler + Frisell hybrid → guitar_trio
8. Shorter → chamber_jazz_quintet
9. Harris → string_quartet
10. Frisell → chamber_jazz_sextet
11. Bartok + Wheeler hybrid → guitar_string_quartet
12. Monk + Harris → big_band_basic
13. Hill + Shorter → chamber_jazz_quintet
14. Wheeler → guitar_trio
15. Frisell → string_quartet
16. Shorter → guitar_string_quartet
17. Harris → chamber_jazz_sextet
18. Bartok → string_quartet
19. Monk → guitar_trio
20. Hill → chamber_jazz_quintet
