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
| Guitar–Bass Duo (Single-Line) | Same harmony path as standard duo, **phrase-first** single-note guitar and bass — MusicXML. Inner-line (Wyble-style) behaviour is gated with the same **duo-family** preset id checks as standard duo where the engine intends shared rules; Song Mode / long-form **opt-ins** may still be **standard duo only** (see roadmap). |
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

- **Web UI:** Vite prints a **`Local:`** URL in the terminal (usually **`http://localhost:`** plus a port). If that port is busy, Vite picks another — use the URL Vite prints.
- **API:** http://localhost:3001 — the UI calls `/api` via the Vite proxy. If the first page load shows short proxy errors, wait a moment for the API process to finish starting.

**Build static UI only (from repo root):**

```bash
npm run build --prefix apps/composer-os-app
```

Output: `apps/composer-os-app/dist/`. The API script `scripts/startComposerOsAppApi.ts` can serve this folder when built.

### Windows: double-click shortcut (local dev)

To avoid typing commands every time, create a **Desktop** shortcut once (from repo root in PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\create-composer-os-desktop-shortcut.ps1
```

That creates **`Composer OS Dev Launcher.lnk`** on your Desktop (label **Composer OS Dev Launcher**). Then:

1. **Double-click** **Composer OS Dev Launcher** (or run **`scripts\launch-composer-os.bat`** from the repo).
2. Wait until the log shows Vite’s **`Local:`** line and the framed **OPEN THIS IN YOUR BROWSER:** block (with your **http://localhost:…** URL).
3. Follow the **Next steps** in that box: **(1)** copy the URL, **(2)** paste it into your browser, **(3)** leave the black window open while you work; press **Ctrl+C** there when you want to stop the dev servers.

The launcher **does not open the browser** for you. A **terminal window stays open** while the dev servers run (normal for local dev).

**Packaged release:** A shortcut to **`Composer-OS.exe`** in `composer-os-desktop\release\` is the **built app**, not this launcher. Rename that shortcut to **`Composer OS Release`** if you use both, so it is not confused with **Composer OS Dev Launcher**.

**Windows desktop app:** See `apps/composer-os-desktop/README.md` for the packaged Electron app — optional; **Composer OS Dev Launcher** is for **local development** only.

---

## 4) How to generate music (UI walkthrough)

1. Open **Generate**.
2. Choose a **mode** from the dropdown.
3. Set **BPM**, **bars**, **tonal centre / key** where shown, and **chords** when required (Wyble Etude **must** have chords).
4. Click **Generate**.
5. Read the **receipt** — it shows success or errors, output type (MusicXML vs JSON), and paths.
6. Click **Open library folder** or use the **Outputs** tab to locate files. There is no in-app “download” — files are written straight to your **Composer OS library** on disk.

**After generation:** Open the `.musicxml` file in your notation program (File → Open). If you received **planning JSON** (Big Band / String Quartet fallback), that file is for inspection or tooling — not a full printed score.

### Song Mode — Groove / Soul (first real “style surface” slice)

As of **2026-04-17**, choosing **Style Engine profile → Groove / Soul** in Song Mode does more than a label:

- The engine **increases** internal **syncopation** and **density** biases used by the Song Mode rhythm path (additive, clamped). You may hear busier or more off-beat leaning lines versus the default profile, depending on seed and harmony.
- A short explanation may appear on the **receipt** and in the **`_meta`** sidecar manifest as **`songModeStyleSurfaceNotes`** (honest wording — not “sounds like” any artist).

Other songwriter / era / lyric-author / arranger fields still behave mostly as compile rules, pairing metadata, and receipts; **Groove / Soul** and **Donald Fagen** (below) also have small golden-path metadata nudges.

### Song Mode — Donald Fagen primary songwriter (first real primary-songwriter slice)

Choosing **primary songwriter → Donald Fagen** (or the API key **`songwriter_donald_fagen`**) applies **small additive** tweaks on top of the usual songwriter profile resolution: phrase-length regularity, moderate syncopation / medium-density steering, and harmonic-colour weights surfaced on **`generationMetadata`**, with short lines under **`songModeStyleSurfaceNotes`** on the receipt / **`_meta`** manifest — honest musical wording, not a mimicry claim.

**Slice v2 (2026-04):** Song planning may draw from **extra generic jazz-pop verse rows** (ii–V–I colour + borrowed maj7 colours). Phase **C1** rhythm overlay uses a **slightly higher syncopation bias** for **early phrases (bars 1–12)** only when primary is **Donald Fagen**; **`songModeDonaldFagenC1Receipt`** is set after C1 runs. Still **not** an authenticity claim.

**Listening recipe:** Same **seed**, **BPM**, **chords**, and **Style Engine profile**, then A/B **primary songwriter Donald Fagen** vs **another primary** (e.g. **Bacharach** or **Beatles**) and compare rhythm density and harmonic colour in the duo export.

### Song Mode — Wayne Shorter primary songwriter

Choose **Wayne Shorter** as the **primary songwriter** when you want a **post-bop** harmonic feel: **non-resolving** harmony, **chromatic root motion**, and **open endings** rather than textbook pop cadences.

**How to use it:** Set **Songwriter** to **Wayne Shorter**, **Style profile** to **`STYLE_SHORTER_POST_BOP`**, and keep **BPM** roughly **60–90** for the intended pacing (adjust to taste).

**What it generates:** By default you get **32 bars** of Shorter-flavoured harmony from extended pools (no padded repeat of a single short progression). The engine aims for **variety across the form** and avoids obvious **II–V–I chains** in the scaffold (honest wording ? not an authenticity guarantee).

**Known limitation:** Rules in **`songwriterRuleRegistry`** and per-row **metadata tags** (**tension**, **motion**, **cadential**, **pedal**) **inform planning metadata** today. **Rule-to-chord wiring** is **metadata only** in the picker **until contextual selection** is implemented.

### Developers — Bacharach Song Mode (CLI, not the Generate UI)

Batch **same-seed** Bacharach vs neutral (**default neutral songwriter `carole_king`**), optional receipt/`_meta` checks, **GCE-style** CSV + Markdown (scores are **diagnostic only** — not a runtime lock). Outputs include **MusicXML**, **`_meta`** manifests, and eval artifacts under **`--out`**.

From **repository root**:

```bash
npm run workflow:bacharach -- --count 5 --seed-start 97000 --out output/bacharach-workflow
npm run eval:bacharach -- --count 5 --seed-start 97000 --out output/bacharach-eval
npm run mine:bacharach -- --dir reference/bacharach
```

Use **`--skip-build`** and **`--skip-launch`** on **`workflow:bacharach`** if you only want generations + eval. See **`reference/bacharach/README.md`** for pointing **`mine:bacharach`** at a local Bacharach score folder.

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

## Composer OS v2 engine tests (developers)

**As of 2026-04-17**, engine test status is **partially baselined** — not all tests pass yet.

**Step-by-step — quick regression bar (must stay green):**

When changing **Guitar–Bass Duo**, **Duo (Single-Line)**, **Wyble Voice 2**, or **bass phrase** logic, run the same five commands — they cover duo sweeps (including Wyble traces), bass phrase, vocal bridge, counterpoint, and ensemble regression.

**Wyble “realized” Voice 2 (engine):** After inner-line inject, the engine may run a **realized-score** normalization pass on written Voice 2 (breathing and density limits so diagnostics match the score). Standard duo skips that pass; non-standard duo-family presets are the target when that pass is wired. After edits to Wyble normalization, run the five commands above.

1. Open a terminal and go to **`engines/composer-os-v2`** (under this repo).
2. Run each command; each should complete with **exit code 0**:
   - `npm run test:jest:counterpoint`
   - `npm run test:duo`
   - `npm run test:bass`
   - `npm run test:vocal`
   - `npm run test:composer-os-regression`
3. **Or** from the **repository root**:  
   `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-baseline-composer-os-v2.ps1`  
   (add `-IncludeRunAll` only if you intentionally want the long full `npm test`.)

**Expected red (test debt):** `npm test` runs the large **`runAllTests.ts`** harness and may exit **non-zero** with many **`FAIL:`** lines until debt is cleared. That is **not** the same as the five commands above. **New** failures outside the [baseline doc](TEST_DEBT_COMPOSER_OS_V2.md) should be treated as **regressions**.

Details: **[TEST_DEBT_COMPOSER_OS_V2.md](TEST_DEBT_COMPOSER_OS_V2.md)**.

---

## Related docs

- [README.md](../README.md) — project overview and quick start.
- [CHANGELOG.md](CHANGELOG.md) — what changed and when.
- [COMPOSER_OS_ROADMAP.md](COMPOSER_OS_ROADMAP.md) — past / current / future (clearly separated).
- [TEST_DEBT_COMPOSER_OS_V2.md](TEST_DEBT_COMPOSER_OS_V2.md) — engine test baseline vs `npm test` debt.
- [apps/composer-os-app/README.md](../apps/composer-os-app/README.md) — app-specific run and build notes.
