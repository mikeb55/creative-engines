# Barry Harris Engine — User Guide

## What the Engine Does

The Barry Harris engine generates instrumental composition plans using Barry Harris harmonic logic: the 6th diminished system, diminished passing chords, tonic/dominant conversion, minor conversion, bebop scale logic, and voice-leading-based harmony.

## Musical Grammar Used

- **6th diminished system** — Major and minor 6th chords with diminished passing chords
- **Diminished passing chords** — Connecting harmony with smooth voice-leading
- **Tonic/dominant conversion** — Harris-style chord conversion
- **Minor conversion** — Minor key harmonic treatment
- **Bebop scale logic** — Chromatic passing tones, chord-tone gravity
- **Voice-leading priority** — Melody derived from harmonic motion

## How Compositions Are Generated

1. **Title or premise** → hashed to select profiles
2. **Interval language** → step motion, enclosure (bebop_step, enclosure_heavy, scalar_embellish)
3. **Harmonic field** → major6_dim, minor6_dim, dominant_dim, minor_conversion
4. **Form** → compact_8, aaba_16, blues_12, rhythm_32
5. **Section compiler** → melody from harmonic motion, strong voice-leading

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

## Appendix: 20 Ways to Start a BH-Style Composition

1. Title first — "Bebop Head", "Minor Conversion"
2. Premise first — "Blues-derived head in F"
3. Bebop step profile — step motion, chord-tone gravity
4. Enclosure heavy — chromatic enclosure figures
5. Scalar embellish — scale with passing tones
6. Major 6th diminished — C6, Gdim7, F6
7. Minor 6th diminished — Am6, Dm6
8. Dominant diminished — 7th chords with dim passing
9. Minor conversion — Cm, Gm, Bb
10. Compact 8-bar form — A A
11. AABA 16-bar form — standard song form
12. Blues 12-bar — 4+4+4
13. Rhythm changes 32-bar — 8+8+8+8
14. Bebop cell development — add passing tone
15. Enclosure development — upper-neighbor, lower-neighbor
16. Scalar embellishment — scale runs with chromatic
17. Voice-leading focus — melody follows harmony
18. Chord-tone gravity — target chord tones
19. Avoid rigid ii–V — use 6th diminished instead
20. Multiple candidates — generate_composer_ir_candidates
