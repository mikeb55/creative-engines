# Big Band Architecture Generator

Electron desktop app for generating big band arrangement structures with Ellington orchestration integration, MusicXML score skeletons, and arranger-assist suggestions.

## Features

- **Preset Template** — ii-V-I, jazz blues, rhythm changes, Beatrice, Orbit
- **Arrangement Style** — Standard Swing, Ellington Style, Ballad Form
- **Generate Architecture** — Creates section layout and calls Ellington engine per section
- **Generate Score Skeleton** — Architecture + Ellington + MusicXML export (staves, rehearsal marks, chord symbols, cues)
- **Generate Arranger Assist** — Architecture + Ellington + arranging suggestions (backgrounds, punctuation, soli, shout ramps)
- **Generate Background Figures** / **Brass Punctuation** / **Sax Soli Texture** / **Shout Ramp Material** — Selective note-level generation (one layer at a time)
- **Open Latest Output** — Opens the most recent run folder

## Outputs

**Architecture** (`outputs/architecture/`): architecture.json, architecture.md, arrangement_plan.md, run_summary.md

**Score Skeleton** (`outputs/score/`): score_skeleton.musicxml, score_structure.md, score_structure.json, run_summary.md

**Arranger-Assist** (`outputs/arranger-assist/`): arranger_assist_plan.md, arranger_assist_plan.json, run_summary.md

## Score Skeleton Export

Creates a structural score (17 staves, measures, rehearsal marks, section labels, chord symbols, cue annotations) for Sibelius. Whole rests only — no dense notation. Cues guide arranging (e.g. "Saxes lead", "Brass punctuation", "Tutti hit").

**Open in Sibelius:** File → Open → select `score_skeleton.musicxml`. The score loads with all staves, rehearsal marks, and chord symbols. Use cues to guide your arrangement.

## Arranger-Assist Layer

Generates practical arranging suggestions (background figures, punctuation hits, soli textures, shout-chorus ramps, section swaps). Differs from score skeleton: no MusicXML — outputs markdown and JSON with bar ranges, descriptions, rhythm hints, and voicing hints. Use in Sibelius: open `arranger_assist_plan.md` alongside your score and apply suggestions section by section.

## Selective Note-Level Generation

Generates actual note-level material only for specific tasks (background figures, brass punctuation, sax soli texture, shout ramp material). Not a full automatic arrangement — intended to speed up arranging in Sibelius. Each action runs architecture + Ellington + arranger-assist, then generates the selected layer and exports MusicXML. Open `selective_material.musicxml` in Sibelius to refine.

## Run

```bash
npm start
```
