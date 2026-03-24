# Composer OS Desktop

Windows desktop app identity: **Composer OS Desktop** (`appId` `com.mikeb55.composeros.desktop`, portable `Composer-OS-Desktop-*-portable.exe`). The renderer loads from **packaged files** (`loadFile` on `resources/ui/index.html`) — **no localhost / no browser URL** in packaged mode. Composer OS engine calls run through **preload `invokeApi` → IPC** (`resources/desktop-ipc.bundle.cjs`), not HTTP. The legacy `resources/api.bundle.js` remains for the **web** dev server (`npm run dev` + API) only.

Before loading the UI, main reads `resources/ui/composer-os-ui-stamp.json` and **refuses to start** if the bundle is wrong or lists forbidden tabs. Stale UI trees are fully replaced on each `build:ui`. One window; no separate backend window.

## Run (Dev)

```bash
cd apps/composer-os-desktop
npm install
npm run desktop:dev
```

Builds API bundle, UI, and Electron main; launches the desktop app.

Do **not** run `electron .` alone — run the full `desktop:dev` pipeline so UI, IPC bundle, and Electron main are built. Packaged mode uses **IPC + file UI**, not the HTTP API bundle inside Electron.

**Port conflicts:** The app prefers port 3001. If it is busy, it checks whether Composer OS is already running (`GET /health`) and reuses it; otherwise it picks the next free port (3002, 3003, …). No manual restart or killing processes.

**Web dev (`npm run dev` in composer-os-app):** If the API runs on a non-default port, set `PORT` or `VITE_API_PORT` when starting Vite so the proxy matches.

## Package (Windows)

```bash
cd apps/composer-os-desktop
npm run desktop:package
```

Produces:
- `release/Composer-OS-Desktop-1.0.0-portable.exe` — portable
- `release/Composer OS Desktop Setup 1.0.0.exe` — NSIS installer

## Deploy shortcut (Windows, developer machine)

After packaging, run **one** of:

```bash
npm run desktop:clean-install
# aliases: desktop:deploy, desktop:install
```

This runs `desktop:package`, verifies UI stamp, then `install/installComposerOsDesktop.ts`: quarantines legacy Studio / stale shortcuts and creates **Composer OS Desktop.lnk** → current `Composer-OS-Desktop-*-portable.exe`. Use only that shortcut.

## End User Flow

1. Double-click **Composer OS Desktop** on the desktop (after `desktop:clean-install`), or the packaged portable exe directly.
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
