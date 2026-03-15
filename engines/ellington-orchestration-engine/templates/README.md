# Ellington Template Library

Real-music chord progression templates for the Ellington Orchestration Generator.

## Templates

| ID | Name | Description |
|----|------|-------------|
| `ii_V_I_major` | ii-V-I Major | Classic jazz cadence |
| `jazz_blues` | Jazz Blues | F blues |
| `rhythm_changes_A` | Rhythm Changes A | I-VI-ii-V in Bb |
| `beatrice_A` | Beatrice A | Sam Rivers standard |
| `orbit_A` | Orbit A | Wayne Shorter |

## Usage

```ts
import { getTemplate, listTemplateIds } from './templateLibrary';

const template = getTemplate('ii_V_I_major');
// template.segments: [{ chord: 'Dm7', bars: 2 }, ...]
```
