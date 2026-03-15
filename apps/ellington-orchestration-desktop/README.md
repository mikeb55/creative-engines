# Ellington Orchestration Generator — Desktop App

Windows desktop launcher for the Ellington orchestration engine. Generates sectional orchestration plans and voicings from chord progressions.

## Preset Templates

- **ii_V_I_major** — Classic jazz cadence
- **jazz_blues** — F blues
- **rhythm_changes_A** — I-VI-ii-V in Bb
- **beatrice_A** — Sam Rivers standard
- **orbit_A** — Wayne Shorter composition

## Arrangement Modes

- **Classic** — Saxes often lead, brass answers, moderate density
- **Ballad** — Reeds/pads favored, sparse brass, lower density
- **Shout** — Brass-forward, stronger tutti, higher density

## Usage

1. **Launch:** Run `npm start` or double-click the desktop shortcut (after `npm run shortcut`).
2. **Generate:** Select a preset template and arrangement mode, or import MusicXML, then click "Generate Orchestration".
3. **Output:** Click "Open Latest Output Folder" to view exported plans.

## Output Location

`apps/ellington-orchestration-desktop/outputs/ellington/`

Timestamped run folders (e.g. `2026-03-15_2010_run01/`):

- ellington_plan_GCE9.10_rank01.md
- ellington_plan_rank01.json
- ellington_plan_rank01.musicxml
- run_summary.md

## Ranked Exports

Top 3 plans per run, with GCE score in filename. run_summary.md lists scores and outputs.

## Requirements

- Node.js
- Electron (installed via `npm install`)
