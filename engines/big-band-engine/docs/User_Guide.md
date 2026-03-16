# Big Band Engine — User Guide

## Modern Big Band Workflow

1. **Generate IR** — From title or premise; seed controls determinism.
2. **Validate** — IR validator checks required fields and form consistency.
3. **Compile** — Section compiler produces layered blueprint (lead, sax support, brass, rhythm plan).
4. **Export** — MusicXML exporter writes valid lead-part blueprint.

## Sectional Role Logic

- **Lead** — Primary melody (trumpet/alto)
- **Sax** — Counterline, support figures
- **Brass** — Punches, hits, sectional unisons
- **Rhythm** — Comp, sparse, shout styles with density hints

## Density Growth Logic

- `density_plan` maps section roles to 0–1 density
- Primary: moderate (0.5–0.6)
- Contrast: varied (0.4–0.7)
- Shout: high (0.9+)
- Return: moderate-high (0.6–0.8)

## How to Export MusicXML

```python
from engines.shared_composer.engine_registry import get_engine, ensure_engines_loaded

ensure_engines_loaded()
eng = get_engine("big_band")
ir = eng.generate_ir("My Chart", mode="title", seed=0)
compiled = eng.compile_from_ir(ir)
xml = eng.export_musicxml(compiled)
# xml is valid MusicXML string
```

## Appendix: 20 Ways to Start a Big Band Composition

1. Brass punch on beat 1
2. Sax unison line, 2-bar phrase
3. Rhythm section vamp, then brass entry
4. Shout chord, then melody
5. Layered ostinato, add melody
6. Call-and-response: brass / sax
7. Pedal point, sectional build
8. Modal vamp, trumpet lead
9. Chromatic bass line, sectional hits
10. Unison sax, then split
11. Brass fanfare, 5-bar
12. Sparse comp, isolated hits
13. Counterline first, melody second
14. Sectional wave: density up then down
15. Asymmetrical intro (7 bars)
16. Return with density growth
17. Shout chorus, 9-bar phrase
18. Episode–return chart arc
19. Modular block: primary–contrast–shout–return
20. Layered ensemble motion, evolving density
