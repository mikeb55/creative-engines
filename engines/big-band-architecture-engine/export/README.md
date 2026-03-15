# Big Band Score Skeleton Export

Converts Big Band Architecture + Ellington orchestration into a MusicXML score framework for Sibelius.

## Output

- **score_skeleton.musicxml** — Full big band staves (17 parts), measures, rehearsal marks, section labels, chord symbols, whole rests
- **score_structure.md** — Human-readable section layout and cues
- **score_structure.json** — Machine-readable structure data

## Structure

- Staves: Alto 1–2, Tenor 1–2, Bari, Trumpets 1–4, Trombones 1–3, Bass Trombone, Piano, Guitar, Bass, Drums
- Rehearsal marks (A, B, C…) at section starts
- Section labels (Intro, Head A, Soli, Shout Chorus…)
- Cue annotations (Saxes lead, Brass punctuation, Tutti hit)
- Chord symbols via `<harmony>`
- Whole rests (no dense notation)

## Usage

```ts
import { exportScoreSkeleton } from './scoreSkeletonExporter';

exportScoreSkeleton(architecture, orchestrationPlan, outputPath);
```
