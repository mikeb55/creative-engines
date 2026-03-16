# Conductor Engine

Coordinates existing engines (Wyble, Ellington, Big Band Architecture, Contemporary Counterpoint) into a single generative composition pipeline.

## Pipeline

```
form → harmony → counterpoint → orchestration → export
```

1. **Form Engine** — AABA, Blues, Rhythm Changes, Through-composed, Custom
2. **Harmony Layer** — Generate or load from templates (ii-V-I, jazz blues, Beatrice, Orbit)
3. **Counterpoint Layer** — Wyble (guitar) or Contemporary Counterpoint (quartet)
4. **Orchestration Layer** — Ellington or Chamber mode
5. **Architecture** — Big Band Architecture Engine (intro, shout, solos, etc.)
6. **Export** — composition_plan.md, composition_architecture.json, composition_score.musicxml

## Usage

```typescript
import { generateComposition } from './conductorGenerator';

const result = generateComposition({
  style: 'chamber_jazz',
  form: 'AABA',
  progressionTemplate: 'ii_V_I_major',
  counterpointMode: 'contemporary',
  orchestrationMode: 'chamber',
}, '/path/to/output');
```

## Validation

```bash
npm test
```

Runs 50 compositions, scores each, target average ≥ 9.0.

## Supported Contexts

- Guitar duo (Wyble)
- Chamber jazz (Contemporary Counterpoint + Chamber orchestration)
- Big band (Ellington + Big Band Architecture)
