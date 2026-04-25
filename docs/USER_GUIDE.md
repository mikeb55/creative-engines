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
| Big Band | Full ensemble score **when** realisation and export succeed; otherwise **planning JSON**. See **Big Band preset** below for the V1.5 arranging window (soli, brass tacet, punches, shout). |
| String Quartet | Quartet + piano harmony staff **when** export succeeds; otherwise **planning JSON**. |
| Riff Generator | Short (1–4 bar) riffs — MusicXML to the **Riffs** library subfolder. |

Honest capability strings also ship in `engines/composer-os-v2/app-api/releaseMetadata.ts` and in **Diagnostics**.

### Big Band preset (arranging V1.5)

- **Dedicated 8-bar sax soli** in **bars 17–24** (charts with **at least 24 bars**): alto and tenor carry the soli line every bar in that window.
- **Brass rests** during the soli window (trumpet and trombone tacet there).
- **Brass punches** on cadence-style bars outside that window.
- **Shout chorus fragment** in the **late form** (near the end on typical 32-bar charts).
- **Best at 32 bars** so the full soli window and tail layout match engine defaults.

### ECM Chamber preset (ensemble mode)

- **Stable and reliable** at up to **32 bars** after bass-loop and bar-routing fixes.
- **GCE evaluation:** **7.8/10** overall in the definitive 12-preset benchmark; **weakest category:** Arrangement & Orchestration (deeper arrangement work is planned on the roadmap).

### Era dropdown (Song Mode style pairing)

All **7** era values produce genuinely different **harmonic vocabulary** via profile biasing plus **chord-symbol normalization** on export:

- **swing:** 6, 6/9, 7b9 — simpler, traditional colours
- **bebop:** 7b9, 7#9, dim7 — denser chromatic dominants
- **cool_jazz:** maj7, add9 — lighter, spacious
- **hard_bop:** bluesy dominant language
- **post_bop:** maj7#11, 7alt, quartal modern colours
- **fusion:** modal, sus colours
- **contemporary:** most permissive palette

### Indie Art Pop alternate guitar tuning (Song Mode, optional)

- Available in Song Mode when you choose **Indie Art Pop** style.
- Three modes: **Standard tuning**, **One tuning for both guitars**, and **Separate tunings for Guitar 1 and Guitar 2**.
- Shared/separate paths include curated tuning presets plus a custom 6-string entry option.
- In the **Separate tunings** path, Composer OS now keeps both guitar tunings through generation/export and presents that route as **two electric guitars** (not piano/upright-bass labels).
- This is a bounded v1 surface: it adds light tuning-driven character (drone/register/split-role feel) without changing default behavior when unused.

### Indie Art Pop with Alternate Tunings
To generate two electric guitars with alternate tunings:
1. Select **Song Mode**
2. Choose **Indie Art Pop** style
3. In tuning options, select **"separate tunings"**
4. Generated output will contain two electric guitars with chordal voicings

The system will automatically apply altered tunings to both guitars and generate simultaneous chord tones instead of traditional guitar/bass counterpoint.

### Indie Art Pop listening pass (Song Mode)

- Applies automatically when you choose the **Indie Art Pop** style in Song Mode (no extra controls).
- You should hear **clearer melody vs inner-guitar roles**, a touch more **section-to-section loud/soft contrast**, and a bit more **air at phrase ends** (including a small lift before the return). Optional **alternate tunings** steer that further: shared presets lean **sustain / open color** or **cluster punch** depending on the preset, and **separate tunings** strengthen the **bed vs riff** split.
- **Other Song Mode styles are unchanged.**

### Motif Development (Phase 1)

- **Supported paths only:** Song Mode pilot writers (`wayne_shorter`, `barry_harris`, `donald_fagen`, `bacharach`), hybrid (Wayne melody identity + Barry harmony stack), and `ecm_chamber`.
- **How to control it:** pass `motifAuthorityLevel` as `off`, `soft`, or `strong` on supported routes. Legacy `motifAuthorityV1: true` maps to `soft` only when the run is in this pilot scope.
- **Practical meaning:** `off` = no motif-development guarantee and minimal motif summary; `soft`/`strong` = increasing recurrence/transform evidence for pilot runs.
- **Inspectability fields:** receipts / `_meta` / run manifest may include `motifAuthorityLevel` and `motifDevelopmentSummary` on supported pilot runs.

### Developer checks (engine)

- **Era vocabulary:** from repo root, `cd engines/composer-os-v2` then **`npm run verify:eras`** — asserts era-normalized chord output on the fixed `song_mode_shorter` fixture.
- **Big Band arranging:** **`npm run test:big-band-arranging`** — five seeds, deterministic **8-bar** sax soli in **17–24**, brass tacet there, end-window brass activity sanity.
- **ECM Chamber texture (symbolic, no audio):** **`npm run eval:ecm-texture`** (repo root or `engines/composer-os-v2`) — golden-path **ECM Chamber** runs on fixed seeds; each line is JSON with **how busy bass vs guitar are per bar**, **bass vs treble register separation**, **phrase-end** comp thinning/silence hints, and a single **`ecmTextureScore`** (0–10). Use after ECM arrangement/orchestration edits instead of ad-hoc listening alone. **`npm run test:ecm`** stays the fast stability bar for ECM.

### Lead-sheet MusicXML (melody + chords from your chart)

**Plain-language guide:** **[COMPOSER_OS_USER_GUIDE_MUSICXML_AND_HARMONY.md](COMPOSER_OS_USER_GUIDE_MUSICXML_AND_HARMONY.md)** — importing files, split parts (melody on part 1, chords elsewhere), raw vs optional enriched harmony, and compare mode.

**What you should know in one breath**

- **Melody and song length** come from the **first part** of the score.
- **Chord symbols** can be on part 1 **or merged in from other parts** (matched by bar), which helps typical exports where the tune and the comping chords are split.
- **Your written chords stay in charge** for the real harmony. An optional extra layer can add interpretation when your setup supports it; otherwise everything falls back safely to what you wrote.
- **Paste vs file:** paste **uncompressed** MusicXML text, or use the file picker for `.musicxml`, `.xml`, or **`.mxl`** (the app unpacks `.mxl` for you).
- **Expression:** imported dynamics and common articulations can gently shape note length and velocity before Song Mode uses the chart. Optional blend control: **`leadSheetPerformanceBlend`** (0–1) on the technical request when you need it.
- **Honest limits:** very dense scores may still produce **warnings**; some markings (for example detailed tempo maps) are only approximated today.

### LeadSheet -> Song Mode (Donald Fagen + Barry Harris) experimental Phase 1

- **Supported now:** two bounded routes only:
  - `presetId = song_mode`
  - `primarySongwriterStyle = donald_fagen` or `barry_harris`
  - optional request field `songModeLeadSheetMusicXml`
- **Generate UI workflow (Phase 1):**
  1. Go to **Generate** and choose **Song Mode**.
  2. Set **Songwriter** to **Donald Fagen** or **Barry Harris**.
  3. In **LeadSheet MusicXML input (Phase 1)**, either paste **uncompressed** MusicXML text or load a local `.musicxml`, `.xml`, or **`.mxl`** file.
  4. Click **Generate**. Leave the field empty to run normal Song Mode behavior.
- **What it does now:** imported harmony from your chart (including chords from other parts when present) is converted to **locked Song Mode chord bars** for this route; a bounded melody-start anchor guide is applied deterministically; imported dynamics/articulation flavour can influence note shaping and gentle guitar velocity contour (`leadSheetPerformanceBlend`).
- **If omitted:** Song Mode runs as before with baseline behavior.
- **If invalid:** the UI shows an honest LeadSheet/MusicXML import failure message (unpack/validation mirrors the engine rules).
- **Inspectability fields:** run manifests for this route can include `songModeLeadSheetInputApplied`, `songModeLeadSheetAnchorStartApplied`, and `songModeLeadSheetPerformanceBlend` when applicable.
- **Harmony display (Raw / Enriched / Compare):** available on the **technical generate request** for integrations and advanced flows; the main Generate screen may not expose every option yet. See the plain guide linked above.
- **Explicitly deferred:** Big Band, ECM, other Song Mode writers, and universal LeadSheet rollout.

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

In Song Mode, the **Style** dropdown now separates profiles into **Advanced styles (deeper behavior)** and **Light touch styles (contour/velocity)** so the UI matches current implementation depth.

For **ECM** in Song Mode, the style now emphasizes more open space, modal color, and softer dominant motion so the result feels less cadential and more airy.

Song Mode now also includes **optional diversity presets** that prefill curated songwriter blends for quicker A/B contrast. If you do nothing, defaults stay the same; manual songwriter/arranger controls still work as before.

### Song Mode — Era setting

All 7 Era dropdown values now produce genuinely different harmonic vocabulary and phrasing bias:

- **swing:** simpler extensions and cleaner dominant treatment (6, 6/9, 7, 7b9)
- **bebop:** denser chromatic dominant colors (7b9, 7#9, altered movement)
- **cool_jazz:** lighter, spacious colors (maj7, add9, softer tension profile)
- **hard_bop:** blues-leaning dominant language with stronger drive
- **post_bop:** modern colors retained (maj7#11, 7alt, suspended ambiguity)
- **fusion:** modal/sus colors with modern voicing retention
- **contemporary:** most permissive vocabulary, minimal simplification

The era pipeline includes profile biasing plus chord-symbol normalization so the output vocabulary is audibly distinct per era.

### Song Mode — Donald Fagen primary songwriter (default)

**Donald Fagen** is the **default primary songwriter** for Song Mode unless you pick someone else (or the API key **`songwriter_donald_fagen`**).

**What it sounds like:** **Jazz-pop** harmony with a **functional** backbone ? **chromatic dominant chains**, **slash-chord** bass motion, **Lydian #11** colour, and a **blues/pop skeleton** ? not abstract post-bop drift.

**How it differs from Wayne Shorter:** Fagen-style pools stay **more tonal** ? clearer **key centre**, **decorated II–V-I** and **functional** moves. **Wayne Shorter** leans **non-functional**, **non-resolving** harmony and **open endings** (see the Wayne Shorter subsection below).

**Chord types you will see:** **maj7#11**, **7#9**, **13sus4**, **6/9**, **slash chords**, **m11**, altered dominants, **add9 / mu-major** colour ? the engine pools spell the full vocabulary.

**Pools (deepened):** **4 verse rows x 8 chords** and **4 chorus rows x 8 chords** with **metadata tags** (**tension**, **motion**, **cadential**, **pedal**) for future contextual selection (today row choice is still seed-based).

**Best settings:** **BPM** roughly **90-120** matches typical Song Mode defaults; **bar length** is up to your form ? **32** bars is the common full scaffold.

**Behaviour:** **`applyDonaldFagenSongwriterSurface`** applies phrase regularity, syncopation/density steering, and **`songModeStyleSurfaceNotes`** on the receipt / **`_meta`** manifest ? honest wording, not mimicry. **Slice v2 / C1:** slightly **higher syncopation bias** for **early phrases** when primary is Donald Fagen; **`songModeDonaldFagenC1Receipt`** ? still **not** an authenticity claim.

**Listening recipe:** Same **seed**, **BPM**, **chords**, and **Style Engine profile**, then A/B **primary songwriter Donald Fagen** vs **another primary** (e.g. **Bacharach** or **Beatles**) and compare rhythm density and harmonic colour in the duo export.

### Song Mode — Wayne Shorter primary songwriter

Choose **Wayne Shorter** as the **primary songwriter** when you want a **post-bop** harmonic feel: **non-resolving** harmony, **chromatic root motion**, and **open endings** rather than textbook pop cadences.

**How to use it:** Set **Songwriter** to **Wayne Shorter**, **Style profile** to **`STYLE_SHORTER_POST_BOP`**, and keep **BPM** roughly **60–90** for the intended pacing (adjust to taste).

**What it generates:** By default you get **32 bars** of Shorter-flavoured harmony from extended pools (no padded repeat of a single short progression). The engine aims for **variety across the form** and avoids obvious **II–V–I chains** in the scaffold (honest wording ? not an authenticity guarantee).

**Known limitation:** Rules in **`songwriterRuleRegistry`** and per-row **metadata tags** (**tension**, **motion**, **cadential**, **pedal**) **inform planning metadata** today. **Rule-to-chord wiring** is **metadata only** in the picker **until contextual selection** is implemented.

### Song Mode — Bacharach primary songwriter

- **Sounds like:** *Walk On By*, *Alfie*, *Close to You*
- **Harmony:** chromatic mediants, secondary dominants, Bm7b5 pivot chords, stepwise root motion
- **Best BPM:** 60–90, ballad to mid-tempo

### Song Mode — Barry Harris primary songwriter

- **Sounds like:** bebop, Monk, Bird-era jazz
- **Harmony:** C6/Ddim7 alternation, G7b9 dominants, sixth diminished chains, minor six tonic
- **Best BPM:** 120–200, uptempo bebop

### Song Mode — ECM Chamber primary songwriter (`ecm_chamber`)

This is the **Song Mode primary songwriter** id **`ecm_chamber`** — not the same dropdown row as **Generate → ECM Chamber** (ensemble mode).

- **Sounds like:** Keith Jarrett, Jan Garbarek, Tord Gustavsen
- **Harmony:** Cmaj7#11, Gmaj9(no3), modal drift, sparse slow-moving roots, wide open voicings
- **Best BPM:** 50–80, slow and spacious

### Song Mode — Pat Metheny primary songwriter (`pat_metheny`)

Primary id **`pat_metheny`** — aliases **`metheny`**, **`pm`** also resolve to this profile.

- **Sound:** ECM-era Metheny Group feel, open voicings, Lydian **maj7#11**, and folk-jazz **add9** colors.
- **Harmony:** pedal colors and modal/sus language with warmer tonal center than `ecm_chamber`.
- **Melody:** lyrical, **stepwise**, singable phrase arcs.
- **Best BPM:** **70-100**, flowing mid-tempo.
- **Era pairing:** best with **post_bop** or **contemporary** in Song Mode style pairing.

### Bar count options (Song Mode + Guitar-Bass Duo)

- Song Mode and Guitar-Bass Duo now support extended form lengths including **48** and **64** bars in addition to standard shorter forms.
- Use longer forms for narrative arc or motif-development tests; 32 bars remains the common baseline for quick A/B checks.

### GCE Quality score on receipt

- Each generation receipt includes a GCE quality score line (for example, `8.3/10`).
- Current minimum passing threshold is **8.0**.
- The engine runs an automatic quality retry loop (up to 3 candidate attempts) and keeps the strongest result.

### ECM Chamber stability note

- ECM Chamber is now stable and generates reliably at up to **32 bars** in current production routing. See **ECM Chamber preset** above for benchmark and weakest-pillar note.

### Developers — Bacharach Song Mode (CLI, not the Generate UI)

Batch **same-seed** Bacharach vs neutral (**default neutral songwriter `carole_king`**), optional receipt/`_meta` checks, **GCE-style** CSV + Markdown (scores are **diagnostic only** — not a runtime lock). Outputs include **MusicXML**, **`_meta`** manifests, and eval artifacts under **`--out`**.

**Section-shaping diagnostics:** Song Mode writes a versioned aggregate **`songModeSectionShapingDiagnostics`** on each run manifest (density/colour B−A, opening vs return, return variation, contributing slices). The **Fagen**, **Bacharach**, and **Sophisticated Pop** eval scripts (`eval:fagen`, `eval:bacharach`, `eval:style-soph-pop`) read that field for batch A/B so metrics stay aligned with the engine’s own receipt line, without re-deriving the same numbers from chord-bar strings when the manifest already has them.

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
   - **ECM Chamber only:** `npm run test:ecm` (under `engines/composer-os-v2`) — bar count, repeat-run sanity, era smoke, non-ECM control, **texture-eval JSON shape** / score range.
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
