# Composer OS Changelog

## V2.0 Foundation

- Core architecture: conductor, rhythm engine, primitives, instrument profiles
- Score integrity gate, MusicXML export, readiness scoring, run ledger
- Presets: guitar-bass duo, ECM chamber, big band

## Golden Path

- First end-to-end generation: 8-bar guitar-bass duo
- Score model, chord symbols, rehearsal marks
- Full pipeline: preset → feel → harmony → integrity → export → manifest

## Stage 2 Musical Core

- Section roles (statement, development, contrast, return)
- Section-aware register maps and density curves
- Guitar/bass behaviour planners
- Rhythm engine deepening
- Behaviour gates: rhythm, texture, harmonic integrity, section contrast

## Stage 3 First Intelligence

- Motif tracker: generate, vary, place across A/B
- Barry Harris style module
- Motif-driven melody, bass motif echoes

## Stage 4 Style System

- Metheny style module
- Triad Pairs module
- Style stack: primary, secondary, colour
- Style blend and triad-pair validation gates

## Stage 6 Output & Control

- Export hardening: stricter MusicXML validation (divisions, structure, chord symbols)
- Lock system: melody, bass, harmony, rhythm, sections locks
- Performance pass: articulation (staccato/tenuto), no pitch changes
- Export Integrity, Lock Integrity, Performance Integrity gates

## Stage 5 Interaction Layer

- Interaction modes: support, call_response, overlap, independent
- Golden path default: A support, B light call_response
- Register separation: guitar floor 60, bass ceiling 52
- Behaviour coupling: bass simplifies, guitar reduces attack in call_response
- Interaction Integrity and Register Separation gates

## Retro Self-Test / Hardening Pass

- Retro test suite for Foundation, Golden Path, Musical Core, First Intelligence, Style System
- Regression fixtures (bar count, event counts, pitch ranges, style metadata)
- Stage exit gate tests per implemented stage
- Negative tests proving gates catch failures (rehearsal marks, chord symbols, register, motif, style stack)
- `npm run test:retro` to run retro suite only
