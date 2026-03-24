# Composer OS Desktop

Windows desktop app identity: **Composer OS Desktop** (`appId` `com.mikeb55.composeros.desktop`, portable `Composer-OS-Desktop-*-portable.exe`). The renderer loads from **packaged files** (`loadFile` on `resources/ui/index.html`) — **no localhost / no browser URL** in packaged mode. Composer OS engine calls run through **preload `invokeApi` → IPC** (`resources/desktop-ipc.bundle.cjs`), not HTTP. **Open library / file folder** uses a separate **`open-folder-helpers.cjs`** bundle (same path logic as the API) so the packaged exe does not depend on loose engine paths under `engines/`. The legacy `resources/api.bundle.js` remains for the **web** dev server (`npm run dev` + API) only.

Before loading the UI, main reads `resources/ui/composer-os-ui-stamp.json` and **refuses to start** if the bundle is wrong or lists forbidden tabs. Stale UI trees are fully replaced on each `build:ui`. One window; no separate backend window.

## Run (Dev)

```bash
cd apps/composer-os-desktop
npm install
npm run desktop:dev
```

Builds API bundle, IPC bundle, **open-folder-helpers** bundle (`resources/open-folder-helpers.cjs`), UI, and Electron main; launches the desktop app.

Do **not** run `electron .` alone — run the full `desktop:dev` pipeline so UI, IPC bundle, and Electron main are built. Packaged mode uses **IPC + file UI**, not the HTTP API bundle inside Electron.

**Port conflicts:** The app prefers port 3001. If it is busy, it checks whether Composer OS is already running (`GET /health`) and reuses it; otherwise it picks the next free port (3002, 3003, …). No manual restart or killing processes.

**Web dev (`npm run dev` in composer-os-app):** If the API runs on a non-default port, set `PORT` or `VITE_API_PORT` when starting Vite so the proxy matches.

## Package (Windows)

Real artifacts are produced by **electron-builder** (not the TypeScript `dist/` folder alone).

```bash
cd apps/composer-os-desktop
npm run desktop:package
```

`desktop:package` sets `CSC_IDENTITY_AUTO_DISCOVERY=false` so unsigned dev machines do not pull **winCodeSign** (can fail on symlink privileges). `build.win.signAndEditExecutable` is `false`.

**Canonical deploy artifact (used by clean install):**  
`release/Composer-OS-Desktop-<version>-portable.exe`

Also built: `release/win-unpacked/Composer OS Desktop.exe` (unpacked), `release/Composer OS Desktop Setup <version>.exe` (NSIS).

**Hard check after packaging:** `npm run verify:packaged-exe` — fails if no portable `.exe` in `release/`.

## Rebuild + smoke (one command, Windows)

```bash
npm run desktop:rebuild-and-smoke
```

Closes matching **Composer-OS-Desktop-*-portable.exe** processes if running, runs **`desktop:package`**, resolves the newest portable exe, validates **`resources/ui`** (`composer-os-ui-stamp.json`), launches that exe, checks the process stays alive briefly, and requires a **newer** UI `buildTimestamp` than the last successful run (see `.last-smoke-ui-timestamp.txt`). Final output is **PASS** or **FAIL** with paths and versions — not a cosmetic check.

From the repo root: `npm run desktop:rebuild-and-smoke` (delegates to this package).

## Deploy shortcut (Windows, developer machine)

Run **once** from `apps/composer-os-desktop` (after `npm install`):

```bash
npm run desktop:self-test-install
```

Same end-to-end flow: `desktop:clean-install`, `desktop:deploy`, `desktop:install` (all call `desktop:self-test-install`). Steps: `desktop:package` → `verify:packaged-exe` (must find a real `.exe`) → `installComposerOsDesktop.ts` (UI stamp, legacy shortcut cleanup, **Composer OS Desktop** shortcut, launch, assert launch target matches portable exe). Final output: packaged exe path, shortcut path, `Launched: yes` / `no`.

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

- **Default (dev and packaged):** `Documents\\Mike Composer Files\\` with preset subfolders (**Guitar-Bass Duos**, **Big-Band Compositions**, **ECM Chamber Compositions**). MusicXML and `.manifest.json` files live together per preset.
- **Override:** `COMPOSER_OS_OUTPUT_DIR` replaces the **Mike Composer Files** root (preset subfolders still apply).

## Icon

Placeholder: `resources/icon.png` (256×256). Replace with a production icon for release.
