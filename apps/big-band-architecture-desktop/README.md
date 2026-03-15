# Big Band Architecture Generator

Electron desktop app for generating big band arrangement structures with Ellington orchestration integration and MusicXML score skeletons.

## Features

- **Preset Template** — ii-V-I, jazz blues, rhythm changes, Beatrice, Orbit
- **Arrangement Style** — Standard Swing, Ellington Style, Ballad Form
- **Generate Architecture** — Creates section layout and calls Ellington engine per section
- **Generate Score Skeleton** — Architecture + Ellington + MusicXML export (staves, rehearsal marks, chord symbols, cues)
- **Open Latest Output** — Opens the most recent run folder (architecture or score)

## Outputs

**Architecture** (`outputs/architecture/`): architecture.json, architecture.md, arrangement_plan.md, run_summary.md

**Score Skeleton** (`outputs/score/`): score_skeleton.musicxml, score_structure.md, score_structure.json, run_summary.md

## Score Skeleton Export

Creates a structural score (17 staves, measures, rehearsal marks, section labels, chord symbols, cue annotations) for Sibelius. Whole rests only — no dense notation. Cues guide arranging (e.g. "Saxes lead", "Brass punctuation", "Tutti hit").

**Open in Sibelius:** File → Open → select `score_skeleton.musicxml`. The score loads with all staves, rehearsal marks, and chord symbols. Use cues to guide your arrangement.

## Run

```bash
npm start
```
