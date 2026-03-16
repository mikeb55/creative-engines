# Composer DAW — User Guide

## Overview

Composer DAW is a project-based generative composition system. It extends Composer Studio with project management, sessions, and organized exports. A future Windows desktop UI will control this backend.

## Project System

A project contains:

- **idea** — Theme or premise text
- **presets** — Engine configuration (e.g. wheeler_lyric, chamber_jazz)
- **generation settings** — Seed, population size
- **compositions** — Generated candidates
- **orchestration outputs** — Ensemble MusicXML
- **lead sheets** — Vocal melody + chord symbols
- **metadata** — Timestamps, export history

## Project Structure

```
projects/composer_daw/<project_name>/
  project.json      — Project metadata
  sessions/         — Session data
  exports/          — MusicXML exports
```

## Sessions

A session represents one creative generation cycle:

1. **Create session** — idea, preset, seed
2. **Run generation** — Composer Studio generates candidates
3. **Rank candidates** — Scoring and ranking
4. **Select winner** — Choose composition to export

## Generation Workflow

```
idea
  ↓
preset
  ↓
engine generation (Composer Studio)
  ↓
candidate population
  ↓
ranking
  ↓
compiled composition
```

Composer DAW calls Composer Studio as a subsystem. No changes to Composer Studio are required.

## Exports

Export a selected composition as:

- **composition** — Single-part MusicXML
- **ensemble** — Multi-part MusicXML (via Orchestration Bridge)
- **lead_sheet** — Vocal melody + chords (via Songwriting Bridge)

Exports are saved to `projects/composer_daw/<project>/exports/`.

## Integration with Composer Studio

Composer DAW uses:

- **Composer Studio** — Generation, presets, batch runner
- **Orchestration Bridge** — Ensemble arrangement
- **Songwriting Bridge** — Lead sheet creation

All three are called as subsystems. Composer Studio, Orchestration Bridge, and Songwriting Bridge are not modified.

## Quick Start

```python
from composer_daw import run_composer_daw

result = run_composer_daw(
    "MyProject",
    idea="Floating chamber theme",
    preset_name="wheeler_lyric",
    seed=0,
    export_mode="all",
)
print(result["status"])
```

## Launcher

Double-click `launchers/composer_daw_launcher.bat` to run with default settings (Untitled_Project).
