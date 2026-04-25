# Composer OS App

Local web UI for Composer OS. It talks to the shared **app API** (`engines/composer-os-v2/app-api/composerOsApiCore.ts`) over HTTP (`/api/...`) or, in the desktop shell, IPC.

**First-time user?** Read **[docs/USER_GUIDE.md](../../docs/USER_GUIDE.md)** — run commands, generation steps, export folders, and limitations. Use the in-app **Help** tab for a shorter version.

**MusicXML lead sheets (melody + chords across parts, optional harmony views):** **[docs/COMPOSER_OS_USER_GUIDE_MUSICXML_AND_HARMONY.md](../../docs/COMPOSER_OS_USER_GUIDE_MUSICXML_AND_HARMONY.md)** · **User-facing release notes:** **[docs/COMPOSER_OS_RELEASE_NOTES.md](../../docs/COMPOSER_OS_RELEASE_NOTES.md)**

---

## Run (recommended)

```bash
# From repo root
cd apps/composer-os-app
npm install
npm run dev
```

- **Web UI:** http://localhost:5173/ — Vite dev server (`npm run dev:vite`). With the default Vite config, your **default browser should open automatically** once the server is listening. If it does not (or you disabled it with `VITE_OPEN_BROWSER=0`), paste that URL manually.
- **API:** http://localhost:3001/ — same command starts it (`npm run dev:api` → `scripts/startComposerOsAppApi.ts` from the repo root). Override with `PORT` / `VITE_API_PORT` (must match the Vite proxy in `vite.config.ts`).

**What “success” means here:** `npm run dev` runs **until you stop it** (two child processes: Vite + API). Your IDE may show a **green check** when the script **starts** or when the terminal session is created — that does **not** mean “a window opened”; it often only means the dev command was launched. The **visible** app is either the **browser tab** Vite opens or the page at **http://localhost:5173/**.

**Cursor / VS Code:** Command Palette → **Tasks: Run Task** → **Composer OS: Web dev (Vite + API)** (see repo `.vscode/tasks.json`).

**Alternative — API only:** from repo root, `node scripts/startComposerOsAppApi.js` loads the API and can serve `dist/` if built (then open `http://localhost:3001/` in a browser only if you rely on the API’s static `dist/` hosting — normal UI dev uses Vite on 5173).

---

## Supported modes (Generate dropdown)

Eight presets: Guitar–Bass Duo, Duo (Single-Line), Wyble Etude, ECM Chamber, Song Mode, Big Band, String Quartet, Riff Generator. Honest capability text: `engines/composer-os-v2/app-api/releaseMetadata.ts` and `/api/diagnostics`.

- **Big Band / String Quartet:** full **MusicXML** when realisation and export succeed; otherwise **planning JSON** (receipt shows which).
- **Wyble Etude:** requires **chords** in the UI (no silent fallback).

---

## Workflow

1. **Help** tab — quick user guide; **Generate** — pick mode, set fields, **Generate**.
2. **Presets** — names and descriptions.
3. **Outputs** — recent files; open library or a file’s folder.
4. **Composer Engines** — Wayne Shorter / Monk / Charlie Parker; “Open in folder” needs the desktop app in practice.
5. **Diagnostics** — system check (dev checkout + npm).

**Legacy Style Stack page** (`src/pages/StyleStack.tsx`) is not linked from the main nav.

---

## Build

```bash
npm run build
```

Static assets: `dist/`. From repo root: `npm run build --prefix apps/composer-os-app`.

---

## Windows desktop

**`apps/composer-os-desktop`** — Electron + `electron-builder`, same API over IPC. See that folder’s README.

---

## Wyble ON/OFF examples (CLI)

Not a UI feature. From `engines/composer-os-v2`: `npm run export:wyble-examples` — see [docs/USER_GUIDE.md](../../docs/USER_GUIDE.md) §6.
