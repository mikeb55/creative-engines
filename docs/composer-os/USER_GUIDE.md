# Composer OS User Guide

## What It Is

Composer OS is a unified generative composition system. It produces guitar-bass duo scores through a single pipeline: preset → feel → section roles → density → register → motif → style modules → score → integrity → export.

## Running the Demo

```bash
npx ts-node --project tsconfig.json engines/composer-os-v2/scripts/runGoldenPathDemo.ts
```

Output: `outputs/composer-os-v2/golden_path_demo.musicxml`

## Current Capabilities

- 8-bar guitar-bass duo (Clean Electric Guitar + Acoustic Upright Bass)
- Motif-driven melody with recurrence across A/B
- Style stack: Barry Harris (primary), Metheny (secondary), Triad Pairs (colour)
- Chord symbols, rehearsal marks, MusicXML export
- All integrity and readiness gates

## Current Limitations

- 8 bars only; no variable form
- No UI; command-line demo only
- Single preset path (guitar-bass duo)
- Style modules modify context; no deep orchestration yet

## Where Outputs Go

- MusicXML: `outputs/composer-os-v2/golden_path_demo.musicxml`
- Run manifest: included in result object
