# Composer OS User Guide

## What It Is

Composer OS is a unified generative composition system. It produces guitar-bass duo scores through a single pipeline: preset → feel → section roles → density → register → motif → style modules → score → integrity → export.

Use **Composer OS** (`apps/composer-os-app` + `engines/composer-os-v2` app API) for the supported workflow: Generate, Presets, Style Stack, Outputs. The Windows desktop build (`apps/composer-os-desktop`) ships that UI only — not other products in this repository.

## Running the App (Web)

```bash
cd apps/composer-os-app
npm install
npm run dev
```

Opens UI at http://localhost:5173. Choose preset, **style stack** modules, **Style Blend** (Strong/Medium/Light for the primary line; optional secondary and colour blends when those slots are filled — no raw numeric weights), optional **Try Another** before a run; generate; view outputs and validation. The **Style stack** tab mirrors the same ideas; if modules fail to load, you see an explicit message instead of empty dropdowns.

## Running the Desktop App (Windows)

```bash
cd apps/composer-os-desktop
npm install
npm run desktop:dev
```

Or double-click the packaged executable (`Composer-OS-*-portable.exe` or installed shortcut). No manual server start; no Python or .bat.
The desktop app resolves port 3001 automatically if it is busy (reuses Composer OS or switches to the next free port).

**Recommended on Windows:** From the repo, run `npm run desktop:self-test-install` (or `desktop:clean-install`) in `apps/composer-os-desktop` after `npm install`. That runs **electron-builder** to produce a real `release/Composer-OS-Desktop-*-portable.exe`, runs `verify:packaged-exe`, verifies the UI stamp, quarantines legacy **Composer Studio** / stale shortcuts, creates or refreshes **Composer OS Desktop.lnk** pointing at that exe, and **launches the packaged app once**. The packaged app uses **IPC** for presets, generation, outputs, and diagnostics—not a localhost browser session.

**Desktop behaviour:** Only one Composer OS window; the app does not open an external browser or legacy Composer Studio tools. After generation, the UI shows a **Generation receipt** (file name, full paths, manifest path when present, preset, style stack, validation gates including bar math and export round-trip, readiness scores, pass/fail). **Open library folder** and **Open this file’s folder** use the same library-root rules; failures show an in-app message. If startup fails, you see a clear error in the same window (no extra browser).

Use the **Diagnostics** section (expandable at the top) to confirm the backend, active port, dev vs packaged mode, output folder, app version, **desktop vs UI bundle identity** (product id, UI build time, resolved UI path on desktop), and last generation status. The desktop app verifies the UI bundle stamp at startup; if an old or wrong shell is in `resources/ui`, startup stops with a clear error instead of loading the wrong product.

## Running the Demo (CLI)

```bash
npx ts-node --project tsconfig.json engines/composer-os-v2/scripts/runGoldenPathDemo.ts
```

Output: `outputs/composer-os-v2/golden_path_demo.musicxml`

## Current Capabilities

- 8-bar guitar-bass duo (Clean Electric Guitar + **Double Bass** in MusicXML — GM acoustic bass, not a generic vocal “bass”)
- Motif-driven melody with recurrence across A/B
- Style stack: Barry Harris (primary), Metheny (secondary), Triad Pairs (colour)
- Chord symbols, rehearsal marks, MusicXML export
- All integrity and readiness gates

## Current Limitations

- 8 bars only; no variable form
- Single preset path (guitar-bass duo) supported in app
- Style modules modify context; no deep orchestration yet

## Where Outputs Go

Primary saves go under **Documents → Mike Composer Files** (resolved from your Windows user profile, not a hardcoded username), with one subfolder per preset:

- **Guitar-Bass Duos**
- **Big-Band Compositions**
- **ECM Chamber Compositions**

Each MusicXML file has a sibling `.manifest.json`. **Open output folder** opens the real library or preset folder in Explorer. **Diagnostics** (advanced) may still show a numeric seed; the main Generate screen does not expose raw seed values.

Override for tests or custom installs: set `COMPOSER_OS_OUTPUT_DIR` to replace the **Mike Composer Files** root (preset subfolders are still used under that root).
