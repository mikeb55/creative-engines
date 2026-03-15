# Contemporary Counterpoint Generator

Desktop app for the Contemporary Counterpoint Engine.

## Purpose

Generate modern contrapuntal textures (2–4 voices) from chord progressions. Outputs JSON plan, markdown summary, and MusicXML sketch.

## Current Maturity

Scaffold. Minimal UI: voice count, density, generate, open output folder.

## Output Root

`apps/contemporary-counterpoint-desktop/outputs/counterpoint/`

Each run creates a timestamped folder with:
- counterpoint_plan.json
- counterpoint_summary.md
- counterpoint_sketch.musicxml

## Run

```bash
npm install
npm start
```

## Windows Desktop Shortcut

```bash
node createShortcut.js
```

Creates "Contemporary Counterpoint Generator" on Desktop. Uses launcher to handle paths with spaces.
