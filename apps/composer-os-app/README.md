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

1. Choose **mode** — each mode has an **About this mode** card (what it does, best use, honest output type).
2. Set **tonal centre**, **tempo**, **number of bars**, **variation** (New / Next), **creative control**, and optional **title**.
3. Use **mode-specific** controls (ECM Metheny vs Schneider; Song Mode: songwriter × arranger × era; Big Band: arranger, era, ensemble size; String Quartet: explanatory copy only).
4. **Generate** — duo/ECM MusicXML uses a **fixed internal style stack** (Barry Harris–led defaults) sent through the same API as before; there are no style module dropdowns on this screen.
5. The **Result summary** includes mode, output type, variation, key/tempo/bars, pairing when relevant, ensemble for big band, creative level, confidence, experimental badge, and output path.

**Legacy Style Stack page:** `src/pages/StyleStack.tsx` is not linked from the app nav; it remains for reference. The **Style Stack** tab was removed in favour of the mode-driven Generate flow.

**Diagnostics — system check:** Expand **Diagnostics** and use **Run system check** to run Composer OS engine tests, retro tests, and this app’s tests from the development repo (no terminal). Optional **Show technical details** expands npm output. Requires a full `creative-engines` checkout with `npm` available; packaged desktop without a repo shows a clear message.

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
