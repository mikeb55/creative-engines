# Composer OS — User Guide

This guide describes **what exists in the app today** (Composer OS V2+ web UI and shared API). It is written for someone opening the project for the first time. For developers, engine internals live under `engines/composer-os-v2/`; you do not need that detail to generate scores.

---

## 1) What Composer OS is

Composer OS is an application that **generates instrumental music** from your choices (mode, tempo, harmony, form, and other options) and saves results as files on your computer — most often **MusicXML** (`.musicxml`) that you can open in **MuseScore**, **Dorico**, **Sibelius**, or similar notation software. The main screen is **Generate**, where you pick a **mode** (preset), fill in the fields, and press **Generate**.

---

## 2) What you can do right now

- **Generate** — Run any of the eight modes listed below; read the on-screen “About this mode” card for each.
- **Presets** — See names and short descriptions for every mode (merged with live API data when available).
- **Outputs** — Browse recent outputs and open your library folder or a specific file’s folder.
- **Composer Engines** — Use three standalone engines (Wayne Shorter, Thelonious Monk, Charlie Parker). **Opening the output folder from the browser** may not work; the **desktop app** is better for “reveal in folder” behaviour.
- **Diagnostics** — Check that the backend is reachable, see where files are written, and optionally run a **system check** (full checkout + `npm` required).

**Modes available in the Generate dropdown**

| Mode | What you get (typical) |
|------|-------------------------|
| Guitar–Bass Duo | Full duo MusicXML (golden path). |
| Guitar–Bass Duo (Single-Line) | Same harmony path, single-note guitar and bass — MusicXML. |
| Wyble Etude | Two-voice guitar etude — **requires** a chord progression in the UI. |
| ECM Chamber | Chamber jazz — MusicXML (Metheny vs Schneider sub-mode in the UI). |
| Song Mode | Song planning then **duo realisation** — MusicXML (see receipt if something else is returned). |
| Big Band | Full ensemble score **when** realisation and export succeed; otherwise **planning JSON**. |
| String Quartet | Quartet + piano harmony staff **when** export succeeds; otherwise **planning JSON**. |
| Riff Generator | Short (1–4 bar) riffs — MusicXML to the **Riffs** library subfolder. |

Honest capability strings also ship in `engines/composer-os-v2/app-api/releaseMetadata.ts` and in **Diagnostics**.

---

## 3) How to run the app locally

**Prerequisites:** Node.js and npm.

From the **repository root**:

```bash
cd apps/composer-os-app
npm install
npm run dev
```

- **Web UI:** http://localhost:5173 (Vite dev server).
- **API:** http://localhost:3001 — the UI calls `/api` via the Vite proxy. If the first page load shows short proxy errors, wait a moment for the API process to finish starting.

**Build static UI only (from repo root):**

```bash
npm run build --prefix apps/composer-os-app
```

Output: `apps/composer-os-app/dist/`. The API script `scripts/startComposerOsAppApi.ts` can serve this folder when built.

**Windows desktop app:** See `apps/composer-os-desktop/README.md` for packaging — optional; local development uses `npm run dev` above.

---

## 4) How to generate music (UI walkthrough)

1. Open **Generate**.
2. Choose a **mode** from the dropdown.
3. Set **BPM**, **bars**, **tonal centre / key** where shown, and **chords** when required (Wyble Etude **must** have chords).
4. Click **Generate**.
5. Read the **receipt** — it shows success or errors, output type (MusicXML vs JSON), and paths.
6. Click **Open library folder** or use the **Outputs** tab to locate files. There is no in-app “download” — files are written straight to your **Composer OS library** on disk.

**After generation:** Open the `.musicxml` file in your notation program (File → Open). If you received **planning JSON** (Big Band / String Quartet fallback), that file is for inspection or tooling — not a full printed score.

---

## 5) How exports work

- **Default library root:** `Documents/Mike Composer Files` (Windows/macOS/Linux: under your user `Documents`), unless you set **`COMPOSER_OS_OUTPUT_DIR`** to override the entire root.
- **Subfolders by mode** include e.g. `Guitar-Bass Duos`, `ECM Chamber Compositions`, `Song Mode`, `Big-Band Compositions`, `String Quartet Compositions`, `Riffs`. Wyble Etude files are written under the same output pipeline as other presets (see your receipt path).
- **Sidecar metadata** may appear under an `_meta` folder next to MusicXML — usually you ignore these unless debugging.
- **Opening in notation software:** Use the same workflow as any MusicXML file — no special Composer OS plugin is required.

---

## 6) Wyble ON/OFF examples (developer script only)

This is **not** a toggle in the Generate UI. It is a **CLI script** for comparing **string quartet** and **big band** exports with Wyble voice layout **ON** vs **OFF** (A/B for inner-line voicing). It does **not** relate to the **Wyble Etude** preset in the app.

From **`engines/composer-os-v2`**:

```bash
npm run export:wyble-examples
```

Optional arguments: `--family quartet|bigband|all`, `--seed 12345`, `--out "C:\path\to\folder"`.

**Default output directory** if you omit `--out` (see `scripts/exportWybleOnOffExamples.ts`):  
`C:\Users\mike\Documents\Mike Composer Files\wyble-test` — on your machine, pass **`--out`** to write somewhere else.

**Output files** include pairs such as `quartet_wyble_ON_seed{N}.musicxml` / `quartet_wyble_OFF_seed{N}.musicxml` and `bigband_wyble_*`.

---

## 7) What is NOT in the UI yet (or limited)

- **Wyble ON/OFF export** — CLI only; no button in the app.
- **Composer Engines “Open in folder”** — relies on the desktop shell; may fail in a plain browser.
- **Big Band / String Quartet** — may return **planning JSON** instead of MusicXML when export fails; the receipt explains which.
- **Style Stack** legacy page (`StyleStack.tsx`) — **not linked** from the main navigation.
- **Roadmap / planned work** — see `docs/COMPOSER_OS_ROADMAP.md`; do not assume roadmap items are shipped until noted there as delivered.

---

## Related docs

- [README.md](../README.md) — project overview and quick start.
- [CHANGELOG.md](CHANGELOG.md) — what changed and when.
- [COMPOSER_OS_ROADMAP.md](COMPOSER_OS_ROADMAP.md) — past / current / future (clearly separated).
- [apps/composer-os-app/README.md](../apps/composer-os-app/README.md) — app-specific run and build notes.
