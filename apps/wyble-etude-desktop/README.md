# Jimmy Wyble Etude Generator — Desktop App

Windows desktop launcher for the Wyble two-line guitar etude generator. Double-click to run; no manual Node or Python required.

## Usage

1. **Launch:** Run `npm start` or double-click the desktop shortcut (after running `npm run shortcut`).
2. **Generate Etudes:** Click "Generate Etudes" to create 10 studies (GCE ≥ 9).
3. **Open Output:** Click "Open Output Folder" to view exported MusicXML files.

## Output

Files are saved to `outputs/wyble/desktop/`:
- wyble_etude_01.musicxml
- wyble_etude_02.musicxml
- ...

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
