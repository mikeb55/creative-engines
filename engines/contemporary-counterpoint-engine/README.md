# Contemporary Counterpoint Engine

Generates modern contrapuntal textures where harmony emerges from interacting lines rather than block chords.

## Purpose

- 2–4 voices
- Voice independence, rhythmic independence, register interlock, phrase overlap
- Guitar, chamber, horn-section use cases
- Modern jazz / contemporary classical leaning

## Current Maturity

Scaffold. Minimal runtime that accepts harmonic input, generates lines, applies primitives, outputs structured line arrays. Not musically mature.

## Current Limitations

- Dissonance control is basic
- Intervallic cell logic is placeholder
- No MusicXML export in engine (desktop app may add)
- No guitar playability constraints

## Likely Next Musical Uses

- Guitar duos and trios
- Chamber writing
- Big-band inner voices (feeds Ellington stack)

## Run

```bash
npm test          # Auto-test (≥60 examples)
npm run generate  # Desktop generate (from app)
```
