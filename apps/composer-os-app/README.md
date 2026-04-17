# Composer OS App

Local web UI for Composer OS. It talks to the shared **app API** (`engines/composer-os-v2/app-api/composerOsApiCore.ts`) over HTTP (`/api/...`) or, in the desktop shell, IPC.

**First-time user?** Read **[docs/USER_GUIDE.md](../../docs/USER_GUIDE.md)** — run commands, generation steps, export folders, and limitations. Use the in-app **Help** tab for a shorter version.

---

## Run (recommended)

```bash
# From repo root
cd apps/composer-os-app
npm install
npm run dev
```

- **Web UI:** http://localhost:5173  
- **API:** http://localhost:3001 — started by the same script (`scripts/startComposerOsAppApi.ts` from the repo root via `npm run dev:api`)

**Alternative — API only:** from repo root, `node scripts/startComposerOsAppApi.js` loads the API and can serve `dist/` if built.

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
