# Big Band Architecture Generator

Electron desktop app for generating big band arrangement structures with Ellington orchestration integration.

## Features

- **Preset Template** — ii-V-I, jazz blues, rhythm changes, Beatrice, Orbit
- **Arrangement Style** — Standard Swing, Ellington Style, Ballad Form
- **Generate Architecture** — Creates section layout and calls Ellington engine per section
- **Open Latest Output** — Opens the most recent run folder

## Outputs

Each run creates a timestamped folder under `outputs/architecture/`:

- `architecture.json` — Full architecture data
- `architecture.md` — Section layout table
- `arrangement_plan.md` — Section parameters and merged orchestration by bar
- `run_summary.md` — Run metadata

## Run

```bash
npm start
```

## Build

```bash
npm run build
```
