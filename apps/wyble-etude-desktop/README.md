# Jimmy Wyble Etude Generator — Desktop App

Windows desktop launcher for the Wyble two-line guitar etude generator. Double-click to run; no manual Node or Python required.

## Usage

1. **Launch:** Run `npm start` or double-click the desktop shortcut (after running `npm run shortcut`).
2. **Generate Etudes:** Click "Generate Etudes" — one click generates 40 candidates internally, scores them, and exports the top 3.
3. **Open Output:** Click "Open Latest Output Folder" to open the run folder containing the exported etudes.

## Output

Each run creates a timestamped folder under `apps/wyble-etude-desktop/outputs/wyble/` (e.g. `2026-03-15_1930_run01/`):

- `wyble_etude_GCE9.21_rank01.musicxml` — filenames include GCE score and rank
- `wyble_etude_GCE9.18_rank02.musicxml`
- `wyble_etude_GCE9.14_rank03.musicxml`
- `run_summary.md` — generation settings, candidate scores, exported files

The root `apps/wyble-etude-desktop/outputs/wyble/` contains only run folders (no flat dump of many files).

## Requirements

- Node.js (for development)
- Electron (installed via `npm install`)

## Create Desktop Shortcut

```bash
npm run shortcut
```

Creates "Wyble Etude Generator" on the Windows desktop.

### Launcher and Path Handling

The shortcut uses a Node-based launcher (`launchWybleDesktop.js`) to avoid Windows path-with-spaces issues:

- **Target:** `node.exe`
- **Arguments:** Quoted path to `launchWybleDesktop.js` (e.g. `"C:\...\launchWybleDesktop.js"`)
- **Working directory:** App directory

The launcher resolves the absolute app path and starts Electron with the correct working directory. Paths containing spaces (e.g. "Cursor AI Projects") are handled correctly. The shortcut is recreated by `npm run shortcut`; replace any stale shortcut by running it again.
