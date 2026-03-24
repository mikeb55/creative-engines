# Composer OS Desktop

Windows desktop application for **Composer OS** only: Electron loads `resources/api.bundle.js` (Composer OS API) and `resources/ui` copied from `apps/composer-os-app/dist`. Before loading the UI, the main process reads `resources/ui/composer-os-ui-stamp.json` and **refuses to start** if the bundle is not stamped `composer-os` or lists forbidden legacy tabs (Hybrid / Projects / Score). Stale or wrong UI trees are fully replaced on each `build:ui` (no merge). One visible window; API runs in-process (no extra console window).

## Run (Dev)

```bash
cd apps/composer-os-desktop
npm install
npm run desktop:dev
```

Builds API bundle, UI, and Electron main; launches the desktop app.

Do **not** run `electron .` alone — the API must be built first (`npm run build:api` or `desktop:dev`). The app does not use `npx` or system Node; it loads `resources/api.bundle.js` inside Electron.

**Port conflicts:** The app prefers port 3001. If it is busy, it checks whether Composer OS is already running (`GET /health`) and reuses it; otherwise it picks the next free port (3002, 3003, …). No manual restart or killing processes.

**Web dev (`npm run dev` in composer-os-app):** If the API runs on a non-default port, set `PORT` or `VITE_API_PORT` when starting Vite so the proxy matches.

## Package (Windows)

```bash
cd apps/composer-os-desktop
npm run desktop:package
```

Produces:
- `release/Composer-OS-1.0.0-portable.exe` — portable
- `release/Composer OS Setup 1.0.0.exe` — NSIS installer with desktop shortcut

## Deploy shortcut (Windows, developer machine)

After packaging, run **one** of:

```bash
npm run desktop:deploy
# or
npm run desktop:install
```

This runs `desktop:package`, then `install/installComposerOsDesktop.ts`: it scans Desktop, Public Desktop, and Start Menu `.lnk` files, **quarantines** legacy Composer Studio / stale “Composer OS” shortcuts (moved under `%USERPROFILE%\ComposerOsDesktop\shortcut-quarantine\`), and creates a fresh desktop shortcut named **Composer OS** pointing at the **current** `release/Composer-OS-*-portable.exe`. Use that shortcut for day-to-day launches so old shortcuts cannot point at stale builds.

## End User Flow

1. Double-click **Composer OS** on the desktop (after deploy), or the packaged portable/installed executable directly.
2. API starts in-process (no extra cmd window, no Python).
3. **One** Electron window only — no separate browser, no Composer Studio / legacy launchers.
4. Second launch focuses the existing window (`requestSingleInstanceLock`).
5. **Startup:** Main process tracks explicit states (port resolution → API ready → UI load). On failure, the same window shows an error page (no raw crash UX when avoidable).
6. **UI:** **Diagnostics** (expandable) shows backend status, port, mode, output folder, version, registered **style modules** (Barry Harris, Metheny, Triad Pairs), and last generation. **Generation receipt** summarizes each run (paths, manifest, preset, applied style stack, readiness, pass/fail) with **Open output folder**.
7. Generate shows full file path and output folder; **Open output folder** uses Explorer without a visible shell window and validates the folder when possible.
8. Close window to exit.

No manual server start. No Python. No .bat files.

## Output Location

- **Dev:** `outputs/composer-os-v2/` (repo root)
- **Packaged:** `%APPDATA%/composer-os-desktop/outputs/composer-os-v2/`

## Icon

Placeholder: `resources/icon.png` (256×256). Replace with a production icon for release.
