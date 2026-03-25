# Composer OS App

Local web UI for Composer OS — preset-first generation against the shared `app-api` layer (`composerOsApiCore.ts`). No direct imports of deep engine internals from the React app.

## Run (recommended)

```bash
# From repo root
cd apps/composer-os-app
npm install
npm run dev
```

This starts the Vite UI (default http://localhost:5173) and the Composer OS HTTP API (http://localhost:3001) via `ts-node` and `scripts/startComposerOsAppApi.ts`.

**Alternative — API only (plain Node):** from repo root, `node scripts/startComposerOsAppApi.js` registers `ts-node` and loads `composerOsApiCore.ts` (serves static UI from `apps/composer-os-app/dist` if built).

## Supported modes (V1)

| Mode | Output |
|------|--------|
| Guitar–Bass Duo | MusicXML |
| ECM Chamber | MusicXML (Metheny / Schneider sub-modes in UI) |
| Song Mode | Structural / lead-sheet contract JSON (no MusicXML export in this build) |
| Big Band | Planning JSON only (labelled in UI) |
| String Quartet | Planning JSON only (labelled in UI) |

Details and honest capability strings: `engines/composer-os-v2/app-api/releaseMetadata.ts`, `/api/diagnostics` (`supportedModes`).

## Workflow

1. Choose **mode** — each mode has a short **About this mode** card (what it does, best use, honest output type).
2. For duo / ECM: set style stack and optional locks; for ECM, pick Metheny vs Schneider where shown.
3. Set **variation**, tempo, bars, optional key, **creative level**, and (where shown) **style pairing** / **ensemble size**.
4. **Generate** — the receipt includes a **Result summary** (output type: planning vs lead-sheet-ready vs full MusicXML, variation, pairing, confidence / experimental badge when present, file path).
5. Open output folder or browse **Outputs**; planning and song runs list JSON artifacts as well as MusicXML where applicable.

**UX polish (V3):** User-facing copy lives in `src/utils/generateUiCopy.ts` (`MODE_UX`, `describeOutputKind`). Internal “seed” is not shown as the primary control — **variation** and **creative level** are.

## Build

```bash
npm run build
```

Static assets go to `dist/`. The API server can serve them when `COMPOSER_OS_STATIC_DIR` points at `dist` or the default path exists.

## Windows desktop

Packaged app: **`apps/composer-os-desktop`** — Electron + `electron-builder`, same API surface over IPC. See that folder’s README for `desktop:package` and install/shortcut flow. Normal use does not require Python or `.bat` launchers.

## Limitations

- Big Band and String Quartet do not produce full ensemble MusicXML in V1.
- Song Mode does not export a finished lead-sheet MusicXML file in this build; output is JSON + validation metadata suitable for structural review.
