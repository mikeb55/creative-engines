# Composer OS Desktop

Windows desktop app identity: **Composer OS Desktop** (`appId` `com.mikeb55.composeros.desktop`, packaged portable **`release/Composer-OS.exe`** — stable filename). The renderer loads from **packaged files** (`loadFile` on `resources/ui/index.html`) — **no localhost / no browser URL** in packaged mode. Composer OS engine calls run through **preload `invokeApi` → IPC** (`resources/desktop-ipc.bundle.cjs`), not HTTP. **Open library / file folder** uses a separate **`open-folder-helpers.cjs`** bundle (same path logic as the API) so the packaged exe does not depend on loose engine paths under `engines/`. The legacy `resources/api.bundle.js` remains for the **web** dev server (`npm run dev` + API) only.

Before loading the UI, main reads `resources/ui/composer-os-ui-stamp.json` and **refuses to start** if the bundle is wrong or lists forbidden tabs. Stale UI trees are fully replaced on each `build:ui`. One window; no separate backend window.

## Run (Dev)

```bash
cd apps/composer-os-desktop
npm install
npm run desktop:dev
```

**What this script does (in order):** `build:icon` → `build:api` → `build:desktop-ipc` → `build:stamp` → `build:open-folder-helpers` → `build:electron` (TypeScript `electron/` → `dist/`) → **`build:ui`** (Vite **production** build of `composer-os-app` copied to `resources/ui/`) → `verify:ui-resources` → **`electron .`**.

**Visible result:** one **Electron** window titled like **Composer OS** — **not** a browser tab, **not** http://localhost:5173. The shell loads **`resources/ui/index.html`** from disk (`loadFile`). The window is created with `show: false` until the UI is ready, then shown and focused; if you still miss it, use **Alt+Tab** or the taskbar.

**What “success” means in an IDE:** the first phase is a **batch build**; the script then **blocks** on `electron .` until you close the app. A green indicator that appears **without** a window usually means either (1) you ran a **different** script (for example `npm run build`, which exits without opening Electron), or (2) the Electron window is **behind** other windows or on another display.

**Cursor / VS Code:** **Tasks: Run Task** → **Composer OS: Desktop dev (Electron)** (`.vscode/tasks.json`).

Do **not** run `electron .` alone — run the full `desktop:dev` pipeline so UI, IPC bundle, and Electron main are built. Packaged mode uses **IPC + file UI**, not the HTTP API bundle inside Electron.

**Web UI hot reload (optional):** for browser-based dev with Vite + API, use **`apps/composer-os-app`** and `npm run dev` there (http://localhost:5173/) — that path is separate from `desktop:dev`.

**Port conflicts:** The app prefers port 3001. If it is busy, it checks whether Composer OS is already running (`GET /health`) and reuses it; otherwise it picks the next free port (3002, 3003, …). No manual restart or killing processes.

**Web dev (`npm run dev` in composer-os-app):** If the API runs on a non-default port, set `PORT` or `VITE_API_PORT` when starting Vite so the proxy matches.

## Package (Windows)

Real artifacts are produced by **electron-builder** (not the TypeScript `dist/` folder alone).

```bash
cd apps/composer-os-desktop
npm run desktop:package
```

`desktop:package` sets `CSC_IDENTITY_AUTO_DISCOVERY=false` so unsigned dev machines do not pull **winCodeSign** (can fail on symlink privileges). `build.win.signAndEditExecutable` is `false`.

## Packaging (safe rebuild) — Volume 7: verify the .exe, not the green line

- Prefer `npm run desktop:package-safe` over `npm run desktop:package` (or ad-hoc build commands) when you need proof a new `release/Composer-OS.exe` is really what you think.
- The script exits before building if `Composer-OS.exe` is already running (in-use = lock / no visible replace).
- It records the old `release/Composer-OS.exe` (size, last-write, file `FileVersion`) plus `package.json` `version`, runs `npm run desktop:package-no-bump`, then fails (exit 1) if the build “succeeded” but the .exe’s last-write time is unchanged.
- Exit 0 only when replacement is credible on disk (or first creation); prints SUCCESS / FAIL / WARN and deltas. No extra cleanup is required on failure.
- Still open the new exe and use Help (or About) in-app to confirm the version; disk fields alone are not the whole story.

**One-liner (from `apps/composer-os-desktop`):** `npm run desktop:package-safe`

**Canonical deploy artifact (used by clean install):**  
`release/Composer-OS.exe`

Also built: `release/win-unpacked/` (unpacked app), `release/Composer-OS-Setup.exe` (NSIS).

Each `npm run desktop:package` **overwrites** those filenames in place (no version in the `.exe` name). **Desktop shortcuts can stay pointed at** `…\composer-os-desktop\release\Composer-OS.exe` — relinking after every build is not required. In-app version comes from `package.json` / Electron only.

**Hard check after packaging:** `npm run verify:packaged-exe` — fails if no portable `.exe` in `release/`. **`desktop:package`** prints a **build output paths** banner (portable + installer + shortcut target) right after electron-builder.

## Rebuild + smoke (one command, Windows)

```bash
npm run desktop:rebuild-and-smoke
```

Closes matching **Composer-OS** / legacy portable processes if running, runs **`desktop:package`**, verifies **`release/Composer-OS.exe`**, validates **`resources/ui`** (`composer-os-ui-stamp.json`), launches that exe, checks the process stays alive briefly, and requires a **newer** UI `buildTimestamp` than the last successful run (see `.last-smoke-ui-timestamp.txt`). Final output is **PASS** or **FAIL** with paths and versions — not a cosmetic check.

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

## User documentation (MusicXML / harmony)

Plain-language help for lead-sheet import, chords on multiple parts, and harmony display modes: **[../../docs/COMPOSER_OS_USER_GUIDE_MUSICXML_AND_HARMONY.md](../../docs/COMPOSER_OS_USER_GUIDE_MUSICXML_AND_HARMONY.md)** · **Release notes:** **[../../docs/COMPOSER_OS_RELEASE_NOTES.md](../../docs/COMPOSER_OS_RELEASE_NOTES.md)**

## Icon

Placeholder: `resources/icon.png` (256×256). Replace with a production icon for release.
