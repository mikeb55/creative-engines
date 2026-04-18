# Creative Engines ? Composer OS

**Composer OS** is a generative composition system that produces **MusicXML** (and sometimes planning **JSON**) for jazz and contemporary ensemble layouts. This repository contains the **Composer OS V2 engine** (`engines/composer-os-v2/`), a **web app** (`apps/composer-os-app/`), and optional **desktop** packaging (`apps/composer-os-desktop/`).

If you are new here, start with **[docs/USER_GUIDE.md](docs/USER_GUIDE.md)** ? it explains what the app does **today**, how to run it, and how exports work in plain language.

---

## What Composer OS is

Composer OS turns your settings ? **mode** (preset), tempo, harmony, form, and other options ? into **score files on disk**. The usual output is **MusicXML**, which opens in **MuseScore**, **Dorico**, **Sibelius**, and other notation tools. You do not need to understand the engine architecture to use the Generate screen.

---

## Current capabilities (high level)

- **Eight Generate modes:** Guitar?Bass Duo, Duo (Single-Line), Wyble Etude, ECM Chamber, Song Mode, Big Band, String Quartet, Riff Generator.
- **Library output:** By default, files go under **Documents ? Mike Composer Files** (override with `COMPOSER_OS_OUTPUT_DIR` if needed).
- **Outputs browser** and **Diagnostics** in the app; optional **Composer Engines** (Wayne Shorter, Monk, Charlie Parker) on a separate tab.
- **Big Band / String Quartet:** Full **MusicXML** when realisation and export succeed; otherwise **planning JSON** (see on-screen receipt).

Details and honest wording per mode: `engines/composer-os-v2/app-api/releaseMetadata.ts` and [docs/USER_GUIDE.md](docs/USER_GUIDE.md).

---

## Install and run locally

```bash
cd apps/composer-os-app
npm install
npm run dev
```

- **UI:** http://localhost:5173  
- **API:** http://localhost:3001 (proxied from Vite; wait a second if you see brief proxy errors on first load)

**Production build (from repo root):**

```bash
npm run build --prefix apps/composer-os-app
```

**Desktop app:** see [apps/composer-os-desktop/README.md](apps/composer-os-desktop/README.md).

### Windows: desktop shortcut (local dev, no typing)

Double-click **`Composer OS Dev Launcher`** on your Desktop after creating the shortcut once:

1. Open **PowerShell** in the **repository root**.
2. Run:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\create-composer-os-desktop-shortcut.ps1
   ```
3. A shortcut **`Composer OS Dev Launcher.lnk`** appears on your Desktop (display name **Composer OS Dev Launcher**). Double-click it anytime.

**What it does:** runs `npm run dev --prefix apps/composer-os-app` (same as manual dev: Vite + API) via **`scripts\vite-dev-launcher.ps1`**. It does **not** open your browser. When Vite prints its **`Local:`** URL, the console prints an ASCII-framed block: **OPEN THIS IN YOUR BROWSER:** with the **http://localhost:?** line, then **Next steps:** (1) copy the URL, (2) paste it into your browser, (3) leave this window open and press **Ctrl+C** to stop the dev servers. A **console window stays open** while the servers run.

**vs. packaged release:** If you also have a shortcut to **`Composer-OS.exe`** (or similar) under `apps\composer-os-desktop\release\`, rename that shortcut to **`Composer OS Release`** so it is not confused with **Composer OS Dev Launcher** (this repo script is **dev only**).

**Requirements:** Node.js/npm on `PATH`, and run `npm install` inside `apps/composer-os-app` at least once after clone. The shortcut points at **`scripts\launch-composer-os.bat`** in this repo; if you move the folder, run the PowerShell script again to recreate the shortcut. If you still have an older **`Composer OS.lnk`** from a previous run, delete it or rerun the script and keep the new name only.

**Optional check:** `powershell -NoProfile -File .\scripts\test-vite-url-launcher-regex.ps1` ? verifies the URL-detection regex used by the dev launcher.

---

## How to use the app

1. Open **Generate**, pick a **mode**, fill in BPM / bars / chords as prompted.
2. Click **Generate** and read the **receipt** (paths, validation, MusicXML vs JSON).
3. Use **Open library folder** or **Outputs** to find files. Open `.musicxml` in your notation program.

In-app help: click **Help** in the app navigation (same content as the user guide, shortened).

---

## Exports and MusicXML

- Files are written to your **Composer OS library** folder (see [docs/USER_GUIDE.md](docs/USER_GUIDE.md) for subfolders).
- Open **`.musicxml`** in any compatible notation app (**File ? Open**).
- **`_meta`** subfolders may contain manifests ? normal users can ignore them.

---

## Wyble ON/OFF examples (CLI ? not a UI toggle)

Developer-only A/B export for **string quartet** and **big band** scores (Wyble layout ON vs OFF). **Not** the same as the **Wyble Etude** preset in the UI.

```bash
cd engines/composer-os-v2
npm run export:wyble-examples
```

Use `--out "C:\path\to\folder"` to choose the output directory. See [docs/USER_GUIDE.md](docs/USER_GUIDE.md) section 6.

---

## Song Mode ? style & songwriter behaviour (first slices, 2026-04-17)

Most Song Mode ?style? controls still route through compile-time rules, receipts, or light metadata. **Two** small golden-path mappings are testable today:

- **Style Engine profile ? Groove / Soul** (`STYLE_GROOVE_SOUL`): the engine **adds** to `songwriterSyncopationBias` and `songwriterDensityBias` (after any primary-songwriter resolution), which feeds Song Mode rhythm overlay selection and related intent. The **Style Engine** pass also applies profile-specific **velocities** (see engine code ? not artist mimicry).
- **Primary songwriter ? Donald Fagen** (keys such as `donald_fagen`, `fagen`, or `songwriter_donald_fagen`): **`applyDonaldFagenSongwriterSurface`** nudges phrase regularity, rhythm biases, and Fagen/Bacharach-tagged harmonic weights on `generationMetadata`, with **two** receipt bullets (honest rules, not mimicry).

The **receipt** and the **`_meta` JSON manifest** next to the MusicXML may list **`songModeStyleSurfaceNotes`** (lines stack when both apply).

**Developers — full Fagen / Song Mode / eval context:** [docs/FAGEN_SONG_MODE_DEVELOPMENT_BRIEF.md](docs/FAGEN_SONG_MODE_DEVELOPMENT_BRIEF.md) (engine hooks, diagnostics, `npm run eval:fagen`, baseline modes). Jest `tests/songModeGrooveSoulSurface.test.ts`, `tests/songModeDonaldFagenSurface.test.ts`; must-stay-green scripts unchanged. See also [docs/CHANGELOG.md](docs/CHANGELOG.md) and [docs/COMPOSER_OS_ROADMAP.md](docs/COMPOSER_OS_ROADMAP.md).

**Bacharach (CLI):** `npm run workflow:bacharach -- --count 5 --seed-start 97000 --out output/bacharach-workflow` (A/B vs neutral, receipts, eval, optional rebuild); `npm run eval:bacharach -- --count 5 --seed-start 97000 --out output/bacharach-eval` (eval-only batch); `npm run mine:bacharach` (local MXL/MusicXML corpus stats). **`eval:bacharach`** scoring is **diagnostic only**. Defaults and notes: [docs/USER_GUIDE.md](docs/USER_GUIDE.md) (developers subsection).

---

## What is not in the UI yet

- No in-app control for **Wyble ON/OFF** CLI exports.
- **Composer Engines** ?open in folder? works best in the **desktop** app, not always in a browser.
- **Style Stack** legacy UI exists in the repo but is **not** linked from the main app nav.
- **Planned** work is listed separately in [docs/COMPOSER_OS_ROADMAP.md](docs/COMPOSER_OS_ROADMAP.md) ? do not assume those items are shipped.

---

## Guitar?Bass Duo (Single-Line) and Wyble (short note)

**Guitar?Bass Duo (Single-Line)** shares the same harmony path as standard duo but builds a **phrase-first, single-note** guitar and bass line; Wyble **Voice 2** inner-line work still uses **`isGuitarBassDuoFamily`** gates in the engine. A **2026-04-17** small parity patch aligned the multi-seed golden-path **bar 6 vs bar 7** melodic-interval sweep with the rest of the duo family (see [docs/CHANGELOG.md](docs/CHANGELOG.md)). Deeper parity (e.g. unifying all ?realized? Voice-2 normalization paths) remains roadmap follow-up ? not done in that patch.

**Developers ? ?realized? Voice 2:** After inject + pitch stabilisers, Phase **18.2B.3** can run a **realized-score** pass (breathing, run/coverage caps, texture bookkeeping on **written** Voice 2) for **non-standard** duo-family presets only (**`shouldApplyRealizedVoice2Normalization`**). Standard **`guitar_bass_duo`** skips that pass by design. Touching `guitarVoice2WybleLayer.ts` or Phase A probe ? re-run the **must-stay-green** five commands in the section below.

---

## Composer OS v2 engine test baseline (developers)

**As of 2026-04-17**, this is **test-debt triage / baselining**, not a full green suite.

1. **Must stay green** (run before merging duo / bass / Wyble / song / ensemble?adjacent engine work): from `engines/composer-os-v2`, run:
   - `npm run test:jest:counterpoint`
   - `npm run test:duo`
   - `npm run test:bass`
   - `npm run test:vocal`
   - `npm run test:composer-os-regression`
2. **Known debt (expected failures until cleared):** `npm test` (`tests/runAllTests.ts`) still reports **`FAIL:`** lines in multiple suites ? **do not** assume exit code 0. If you see **new** failures outside the [documented baseline](docs/TEST_DEBT_COMPOSER_OS_V2.md), treat them as **regressions**.
3. **One-shot helper** (repo root):  
   `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-baseline-composer-os-v2.ps1`  
   Optional: `-IncludeRunAll` runs `npm test` (slow).

Full table and triage notes: **[docs/TEST_DEBT_COMPOSER_OS_V2.md](docs/TEST_DEBT_COMPOSER_OS_V2.md)**.

---

## Documentation index

| Doc | Purpose |
|-----|---------|
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | Practical guide for first-time users |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Release-style change notes |
| [docs/COMPOSER_OS_ROADMAP.md](docs/COMPOSER_OS_ROADMAP.md) | Past / current / future (Composer OS) |
| [docs/FAGEN_SONG_MODE_DEVELOPMENT_BRIEF.md](docs/FAGEN_SONG_MODE_DEVELOPMENT_BRIEF.md) | Song Mode Fagen engine, receipts, diagnostics, batch eval harness |
| [docs/TEST_DEBT_COMPOSER_OS_V2.md](docs/TEST_DEBT_COMPOSER_OS_V2.md) | Engine test baseline vs known `npm test` debt |
| [apps/composer-os-app/README.md](apps/composer-os-app/README.md) | App dev server and build |

---

## Other material in this repo

This monorepo may contain additional engines and scripts beyond the Composer OS app. For Composer OS specifically, rely on the docs above and `engines/composer-os-v2/app-api/`.
