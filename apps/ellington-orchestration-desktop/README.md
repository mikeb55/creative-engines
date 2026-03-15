# Ellington Orchestration Generator — Desktop App

Windows desktop launcher for the Ellington orchestration engine. Generates sectional orchestration plans from chord progressions.

## What it generates

Orchestration **plans**, not full note-level scores. For each bar: lead section, support section, density level, brass/reed contrast, call/response, background usage, tutti placements.

## Usage

1. **Launch:** Run `npm start` or double-click the desktop shortcut (after `npm run shortcut`).
2. **Generate:** Select a preset progression or import MusicXML, then click "Generate Orchestration".
3. **Output:** Click "Open Latest Output Folder" to view exported plans.

## Output

Files are saved to `apps/ellington-orchestration-desktop/outputs/ellington/` in timestamped run folders (e.g. `2026-03-16_1200_run01/`):

- ellington_plan_01.md / .json
- ellington_plan_02.md / .json
- ellington_plan_03.md / .json
- run_summary.md

## Desktop shortcut

```bash
npm run shortcut
```

Creates "Ellington Orchestration Generator" on the Windows desktop. Uses a Node launcher for robust path handling with spaces.

## Requirements

- Node.js
- Electron (installed via `npm install`)
