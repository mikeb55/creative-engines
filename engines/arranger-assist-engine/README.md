# Arranger-Assist Engine

Generates practical arranging suggestions for big band scores: backgrounds, punctuation, soli textures, shout-chorus ramps, and optional section swaps. Sits above the Big Band Score Skeleton Export — produces suggestion plans, not full note-level arrangements.

## Input Chain

Big Band Architecture Engine → Ellington Orchestration Engine → Arranger-Assist Layer

## Output

Suggestion plans (not full note-level arrangements). Each suggestion includes:
- section, barRange, role, density
- description, confidence
- optionalRhythmText, optionalVoicingHint

## Exports

`arranger_assist_plan.md`, `arranger_assist_plan.json`, `run_summary.md` — written to `apps/big-band-architecture-desktop/outputs/arranger-assist/`.

## Roles

- **Background figures** — sax pad, sax rhythmic, bone support, brass punctuation behind lead
- **Punctuation** — brass stabs, tutti hits, section answers
- **Soli textures** — sax soli, brass block answer, trombone pad support
- **Shout ramps** — setup, intensification, arrival, release
- **Section swaps** — reeds ↔ brass handoff, sparse ↔ dense alternatives

## Templates

- classic_swing_backgrounds
- ellington_punctuation
- sax_soli_basic
- brass_shout_ramp
- ballad_support_figures

## Usage

```ts
import { generateArrangerAssist } from './arrangerAssistGenerator';

const plan = generateArrangerAssist(architecture, ellingtonPlan, { arrangementMode: 'classic' });
```
