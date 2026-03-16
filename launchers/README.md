# Songwriting Engine Launcher

## What the Launcher Does

Double-click `songwriting_engine_launcher.bat` to run the Song IR engine with default settings. It will:

1. Generate song candidates from the default input ("River Road", title mode)
2. Archive them in the QD archive
3. Select finalists
4. Compile and export to MusicXML
5. Save outputs to `outputs/songwriting_engine/run_YYYYMMDD_HHMMSS/`

## What File It Calls

The launcher runs:

```
engines/songwriting_engine/runtime/launcher_entry.py
```

That script uses `launcher_config.py` for defaults and `songwriting_engine_runtime.run_songwriting_engine` for the main pipeline.

## Where Outputs Go

- **Base folder:** `outputs/songwriting_engine/`
- **Each run:** `run_YYYYMMDD_HHMMSS/` (e.g. `run_20250314_143022`)
- **Contents:**
  - `finalists_musicxml/` — MusicXML files for each finalist
  - `finalists_summary.json` — Metadata (titles, archive stats)
  - `run_summary.txt` — Human-readable run summary

## Creating a Desktop Shortcut

1. Right-click `songwriting_engine_launcher.bat`
2. Send to → Desktop (create shortcut)
3. Or: Create shortcut, set Target to the full path of the .bat file
4. Set "Start in" to the `creative-engines` repo root folder

## Requirements

- Python 3 installed (`py -3` or `python3` in PATH)
- Run from `creative-engines` repo root (the .bat changes to parent directory of `launchers/`)
