# Composer OS Developer Notes

## Architecture Layers

- **Conductor**: Pipeline coordinator
- **Rhythm Engine**: Feel, syncopation, subdivision
- **Section Roles**: Statement, development, contrast, return
- **Register Map**: Per-section pitch zones
- **Density**: Sparse / medium / dense
- **Motif**: Generator, tracker, validation
- **Style Modules**: Barry Harris, Metheny, Triad Pairs
- **Instrument Behaviours**: Guitar, bass planners
- **Score Integrity**: Bar math, register, chords, rehearsal
- **Behaviour Gates**: Rhythm, texture, motif, style conformance
- **Export**: MusicXML only

## Implemented Stages

1. Foundation
2. Golden Path
3. Musical Core (section roles, density, register, behaviours)
4. First Intelligence (motif tracker, Barry Harris)
5. Style System (Metheny, Triad Pairs, style stack)
6. Interaction Layer (guitar-bass coupling, register separation, interaction modes)
7. Output & Control (export hardening, lock system, performance pass)

## Next Planned Stage

- Form variability
- Additional presets
- Deeper motif development

## Retro Self-Test Suite

A retro self-test suite protects all implemented stages (Foundation → Style System). Run with `npm run test:retro` or as part of `npm run test`.

**Rule:** No future Composer OS stage is complete unless:
1. New subsystem tests are added
2. Retro self-tests still pass
3. Stage exit gate tests still pass
4. Commit/push only happens after passing tests

## Anti-Drift Rules

- No second pipeline
- Style modules modify context only
- All output through score model
- Validation before export
