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

## Next Planned Stage

- Form variability
- Additional presets
- Deeper motif development

## Anti-Drift Rules

- No second pipeline
- Style modules modify context only
- All output through score model
- Validation before export
