# Selective Big-Band Generation Engine

Generates actual note-level material only for specific arrangement tasks. Not a full automatic arrangement engine — intended to speed up arranging in Sibelius by providing fragments to refine. Uses architecture + Ellington + arranger-assist outputs.

## Target Types

- **background_figures** — Short rhythmic support, saxes/bones, must not compete with lead
- **brass_punctuation** — Rhythmic hits, accents, trumpet/trombone combinations
- **sax_soli_texture** — Harmonized line fragments, simple soli blocks
- **shout_ramp_material** — Intensification figures, build-up patterns, arrival hits

## Output

`selective_material.musicxml`, `selective_material.md`, `run_summary.md` — written to `apps/big-band-architecture-desktop/outputs/selective-material/`

MusicXML includes notes only for targeted staves; other staves have rests. Sibelius-safe structure.

## Usage

```ts
import { generateSelectiveMaterial } from './selectiveGenerationGenerator';

const plan = generateSelectiveMaterial(architecture, ellingtonPlan, assistPlan, 'background_figures');
```
