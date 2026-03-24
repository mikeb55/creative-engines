# Composer OS User Guide

## What It Is

Composer OS is a unified generative composition system. It produces guitar-bass duo scores through a single pipeline: preset → feel → section roles → density → register → motif → style modules → score → integrity → export.

## Running the App (Web)

```bash
cd apps/composer-os-app
npm install
npm run dev
```

Opens UI at http://localhost:5173. Choose preset, style stack, seed; generate; view outputs and validation.

## Running the Desktop App (Windows)

```bash
cd apps/composer-os-desktop
npm install
npm run desktop:dev
```

Or double-click the packaged executable (`Composer-OS-*-portable.exe` or installed shortcut). No manual server start; no Python or .bat.
The desktop app resolves port 3001 automatically if it is busy (reuses Composer OS or switches to the next free port).

## Running the Demo (CLI)

```bash
npx ts-node --project tsconfig.json engines/composer-os-v2/scripts/runGoldenPathDemo.ts
```

Output: `outputs/composer-os-v2/golden_path_demo.musicxml`

## Current Capabilities

- 8-bar guitar-bass duo (Clean Electric Guitar + Acoustic Upright Bass)
- Motif-driven melody with recurrence across A/B
- Style stack: Barry Harris (primary), Metheny (secondary), Triad Pairs (colour)
- Chord symbols, rehearsal marks, MusicXML export
- All integrity and readiness gates

## Current Limitations

- 8 bars only; no variable form
- Single preset path (guitar-bass duo) supported in app
- Style modules modify context; no deep orchestration yet

## Where Outputs Go

- **Web / dev desktop:** `outputs/composer-os-v2/` (repo root)
- **Packaged desktop:** `%APPDATA%/composer-os-desktop/outputs/composer-os-v2/`
- Run manifest: `.manifest.json` alongside each `.musicxml`
