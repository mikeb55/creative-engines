# Creative Engines ? Composer OS

**Composer OS** is a generative composition system that produces **MusicXML** (and sometimes planning **JSON**) for jazz and contemporary ensemble layouts. This repository contains the **Composer OS V2 engine** (`engines/composer-os-v2/`), a **web app** (`apps/composer-os-app/`), and optional **desktop** packaging (`apps/composer-os-desktop/`).

If you are new here, start with **[docs/USER_GUIDE.md](docs/USER_GUIDE.md)** ? it explains what the app does **today**, how to run it, and how exports work in plain language.

---

## What Composer OS is

Composer OS turns your settings ? **mode** (preset), tempo, harmony, form, and other options ? into **score files on disk**. The usual output is **MusicXML**, which opens in **MuseScore**, **Dorico**, **Sibelius**, and other notation tools. You do not need to understand the engine architecture to use the Generate screen.

---

## Current capabilities (high level)

- **Eight Generate modes:** Guitar?Bass Duo, Duo (Single-Line), Wyble Etude, ECM Chamber, Song Mode, Big Band, String Quartet, Riff Generator.
- **Songwriter styles include Pat Metheny** for Song Mode (ECM-era open voicings, Lydian/add9 colors, lyrical phrase bias).
- **ECM Chamber is stable and reliable** after the non-advancing bass-loop and bar-routing fixes; GCE benchmark **7.8/10** (weakest pillar: Arrangement & Orchestration). **Symbolic texture check (developers):** from repo root or `engines/composer-os-v2`, run **`npm run eval:ecm-texture`** — prints **per-run JSON** (density, register gap, phrase-edge thinning/silence, **`ecmTextureScore`**) plus a **short mean summary** for fixed seeds/bar counts (no audio).
- **Big Band** now includes a deterministic **8-bar sax soli window (bars 17–24)** with alto and tenor leading, **brass tacet** in that window, **cadence brass punches** elsewhere, and a **shout fragment** near the end (`npm run test:big-band-arranging`).
- **Extended form lengths:** 48 and 64 bars are available in Song Mode and Guitar-Bass Duo paths.
- **All 7 era options now alter harmonic vocabulary** (swing, bebop, cool_jazz, hard_bop, post_bop, fusion, contemporary) via profile bias **and** post-generation **chord-symbol normalization** on the Song Mode hook path (`npm run verify:eras`).
- **Receipt shows GCE quality score** per generation, and the quality gate runs an automatic candidate retry loop.
- **Motif Development Phase 1** (experimental, bounded): pilot-only motif authority/inspectability for Song Mode pilot writers, the Shorter+Barry hybrid lane, and ECM Chamber (see section below).
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

## Lead-sheet MusicXML Import (Phase 1)

- **What ships now:** a bounded `score-partwise` MusicXML importer into a shared `LeadSheet` model (`engines/composer-os-v2/core/lead-sheet/leadSheetTypes.ts`, `leadSheetMusicXmlImport.ts`), plus **MuseScore compressed `.mxl`** intake (`musicXmlScoreInput.ts` — ZIP + `META-INF/container.xml`).
- **Stage 1 harmony timeline (storage-only):** MusicXML `<harmony>` is now also parsed into a typed `ImportedHarmonyTimeline` for future import harmony modes (`lock_harmony` / `blend_harmony`). This timeline is **not used by generation yet**.
- **Supported now:** basic metadata (title/composer/tempo), first time/key signature, harmony tags as chord events, first-part single-line melody (voice 1), rehearsal labels, simple repeat/ending markers, and **lightweight expression capture** (dynamics / `<velocity>` / common articulations) that feeds **post-import performance shaping** (`leadSheetPerformanceRendering.ts`).
- **Safety posture:** deterministic parse output and explicit warnings when unsupported complexity is present (extra parts/staves, multiple voices, lyrics, stacked note chords); `.mxl` / XML intake surfaces **clear validation errors** for wrong roots, corrupt archives, or missing embedded scores.
- **Intentionally deferred:** full score import, orchestral/staff expansion logic, automatic String Quartet/Big Band realization from imported lead sheets, and **score-native tempo maps / rubato** (no ritard, accel, fermata, or swing reconstruction yet).

---

## LeadSheet -> Song Mode (Donald Fagen + Barry Harris) experimental Phase 1

- **Supported now:** two bounded Phase 1 Song Mode writer paths: `song_mode` with primary songwriter `donald_fagen` or `barry_harris`, using request field `songModeLeadSheetMusicXml`.
- **Behavior now:** the imported LeadSheet drives deterministic locked harmony bars for this route, a bounded melody-start anchor guidance pass is applied, and **imported dynamics/articulation hints** can influence melody shaping and (lightly) guitar velocity contour. Optional **`leadSheetPerformanceBlend`** (0–1; default ~0.55) controls how strongly imported expression is honoured.
- **User workflow now (UI Phase 1):** in **Generate -> Song Mode**, use **LeadSheet MusicXML input (Phase 1)** to paste **uncompressed MusicXML text**, or load a local `.musicxml`, `.xml`, or **`.mxl`** file (compressed files are unpacked in the browser before generate). This UI control is active only when Songwriter is **Donald Fagen** or **Barry Harris**.
- **Safety posture:** if LeadSheet input is missing or not parseable, Song Mode behavior remains baseline; this slice fails safely instead of broad fallback rewrites.
- **Inspectability:** run manifests include `songModeLeadSheetInputApplied`, `songModeLeadSheetAnchorStartApplied`, and (when applicable) `songModeLeadSheetPerformanceBlend` for this bounded path.
- **Explicitly deferred:** Big Band, ECM, other Song Mode writers, and universal LeadSheet rollout.

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

- **Era** (style pairing dropdown) **now affects duo realisation**, not only receipts: **post_bop** ? stronger syncopation bias and harmony density bias; **fusion** ? moderate syncopation emphasis; **contemporary** ? neutral baseline (bias values at or near zero).
- **Style Engine profile ? Groove / Soul** (`STYLE_GROOVE_SOUL`): the engine **adds** to `songwriterSyncopationBias` and `songwriterDensityBias` (after any primary-songwriter resolution), which feeds Song Mode rhythm overlay selection and related intent. The **Style Engine** pass also applies profile-specific **velocities** (see engine code ? not artist mimicry).
- **Primary songwriter ? Donald Fagen** (keys such as `donald_fagen`, `fagen`, or `songwriter_donald_fagen`): **Default primary songwriter** for Song Mode generations unless you choose another writer. Harmony **chord pools** use an authentic **Steely Dan** palette ? **maj7#11**, **7#9** / **b13**, **13sus4**, **m11**, **6/9**, **slash chords** (e.g. **A/C#**, **Fmaj7/A**), **mu-major / add9** colour. **Root motion** favours **chromatic step chains**, **thirds**, and **decorated II-V-I** ? **not** the non-functional floating vocabulary used for Wayne Shorter. Pools are **4 verse rows x 8 chords** and **4 chorus rows x 8 chords**; each row includes typed **metadata tags** (**tension**, **motion**, **cadential**, **pedal**) as scaffolding for future contextual selection (row choice today remains seed-based modulo). Flavour references (honest wording): **Peg**, **Aja**, **Deacon Blues**, **Pretzel Logic**. **`applyDonaldFagenSongwriterSurface`** still nudges phrase regularity, rhythm biases, and harmonic weights on **`generationMetadata`**, with receipt **`songModeStyleSurfaceNotes`** (honest rules, not mimicry).

**Primary songwriter ? Wayne Shorter** (`wayne_shorter`) is available in Song Mode. Harmony **chord pools** use a Shorter-flavoured palette ? **maj7#11**, **7alt**, **m9** / **m11**, **mmaj7**, **13sus**, and **non-functional root motion** (avoiding tidy functional cadences). Each pool row carries **typed metadata tags** (**tension**, **motion**, **cadential**, **pedal**) as scaffolding for **future contextual chord selection** (selection today remains seed-based modulo). In **`songwriterRuleRegistry`**, **17** Wayne Shorter rules cover harmony, melody, rhythm, and form ? they **inform planning metadata** today; wiring rules to **context-aware** row choice is the next milestone.

**Song Mode songwriter options** (additional primaries):

- **bacharach:** chromatic mediants, secondary dominants, stepwise bass lines, 9th/13th chord dressing
- **barry_harris:** sixth diminished vocabulary, bebop scale harmony, C6/Ddim7 alternation, minor six tonic
- **ecm_chamber:** modal drift, wide open voicings, sparse rhythm, maj7#11 and add9 colors, slow root movement
- **pat_metheny:** open voicings and pedal colours, Lydian maj7#11, folk-jazz add9/sus; stepwise lyrical melody bias — ECM-influenced but warmer and more tonal than **`ecm_chamber`** alone

The **receipt** and the **`_meta` JSON manifest** next to the MusicXML may list **`songModeStyleSurfaceNotes`** (lines stack when both apply).

**Developers — full Fagen / Song Mode / eval context:** [docs/FAGEN_SONG_MODE_DEVELOPMENT_BRIEF.md](docs/FAGEN_SONG_MODE_DEVELOPMENT_BRIEF.md) (engine hooks, diagnostics, `npm run eval:fagen`, baseline modes). Jest `tests/songModeGrooveSoulSurface.test.ts`, `tests/songModeDonaldFagenSurface.test.ts`; must-stay-green scripts unchanged. See also [docs/CHANGELOG.md](docs/CHANGELOG.md) and [docs/COMPOSER_OS_ROADMAP.md](docs/COMPOSER_OS_ROADMAP.md).

**Bacharach (CLI):** `npm run workflow:bacharach -- --count 5 --seed-start 97000 --out output/bacharach-workflow` (A/B vs neutral, receipts, eval, optional rebuild); `npm run eval:bacharach -- --count 5 --seed-start 97000 --out output/bacharach-eval` (eval-only batch); `npm run mine:bacharach` (local MXL/MusicXML corpus stats). **`eval:bacharach`** scoring is **diagnostic only**. Defaults and notes: [docs/USER_GUIDE.md](docs/USER_GUIDE.md) (developers subsection).

---

## Motif Development Phase 1 (bounded pilot)

- **Scope:** Song Mode pilot writers (`wayne_shorter`, `barry_harris`, `donald_fagen`, `bacharach`), hybrid (`wayne_shorter` melody identity + `barry_harris` harmony stack), and `ecm_chamber`.
- **Control:** `motifAuthorityLevel = off | soft | strong` (legacy `motifAuthorityV1: true` maps to `soft` only when the run is in the pilot scope).
- **Behaviour:** `off` = no motif-development guarantee and minimal motif summary; `soft`/`strong` = progressively stronger recurrence/transform evidence on pilot paths only.
- **Inspectability:** motif fields (`motifAuthorityLevel`, `motifDevelopmentSummary`) appear on receipts / `_meta` / run manifest for supported pilot runs.

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
