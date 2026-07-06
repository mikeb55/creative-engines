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
- **Slonimsky Etudes** — Open the **Slonimsky Etudes** tab for a standalone pattern etude study tool (separate from Generate). See **What’s New — May 2026** at the end of this guide.
- **Composer Engines** — Use three standalone engines (Wayne Shorter, Thelonious Monk, Charlie Parker). **Opening the output folder from the browser** may not work; the **desktop app** is better for “reveal in folder” behaviour.
- **Composers tab — AuditionDock (Listen)** — Pick a composer, press **Listen**, hear a **short generated demo** (seeded **32-bar Song Mode** run). Does **not** play your pasted chart or imported lead sheet — that is a later phase.
- **Diagnostics** — Check that the backend is reachable, see where files are written, and optionally run a **system check** (full checkout + `npm` required).

**Modes available in the Generate dropdown**

| Mode | What you get (typical) |
|------|-------------------------|
| Guitar–Bass Duo | Full duo MusicXML (golden path). |
| Guitar–Bass Duo (Single-Line) | Same harmony path as standard duo, **phrase-first** single-note guitar and bass — MusicXML. Inner-line (Wyble-style) behaviour uses **`isGuitarBassDuoFamily`** (standard duo, **`song_mode`**, **`song_mode_*`**, single-line duo) wherever the engine intends shared guitar+bass golden-path rules — **not** only the literal `guitar_bass_duo` id; Song Mode / long-form **opt-ins** may still differ where roadmap marks standard-duo-only slices. |
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

### Songwriter & Arranger dropdowns (Song Mode)

- **Songwriter** uses three groups: **Shipped (full slice)** (writers with full golden-path slice plumbing in the engine), **Ready to build** (strong Song Mode behaviour; not yet packaged like the newest slice template), and **In library** (catalogue ids for rules, pairing, and planning).
- **Arranger** uses two groups: **Big band core (research-backed)** (Ellington, Basie, Thad Jones, Schneider — engine-aligned ids first) and **Charts & studio voices** (remaining arrangers, sorted by name).
- **Arranger + Era:** A short caption under those fields explains that they **nudge style pairing** and era-aware harmony colour in **compiled song planning** — soft hints only; they do **not** retarget Big Band or String Quartet ensemble engines by themselves.

### Alternate guitar tuning (Song Mode)

**Style profiles that accept alternate tuning**  
Request metadata, register nudges, and the dual-guitar / Phase A paths apply only when the Song Mode **Style Engine profile** is one of: **`STYLE_INDIE_ART_POP`**, **`STYLE_SONIC_YOUTH`**, **`STYLE_JONI_MITCHELL`**, **`STYLE_PAT_METHENY`**, **`STYLE_ECM_CHAMBER`** (the engine’s `STYLE_PROFILES_WITH_ALTERNATE_GUITAR_TUNING` set). Other style profiles are unchanged for this workstream.

**Preset palette (24 + “other”)**  
The engine defines **24** roadmap zone tunings, organised into **four** internal zones: **jazz sophisticated**, **Sonic Youth / experimental noise**, **Joni Mitchell / open-folk colour**, and **hybrid harmonic** (see `ALTERNATE_GUITAR_TUNING_PRESETS` and `ROADMAP_ZONE_TUNING_PRESET_IDS`). The in-app labels for those groupings may differ; the source of truth is the engine tables.

**Outside the 24-count roadmap list**  
**`standard`**, **`drop_d`**, and **`custom`** are always available in the palette. They are **not** part of the **24**-id roadmap set. **`custom`** is a user-defined six-string entry and does not carry a fixed zone label in metadata.

**Tuning request modes**  
- **Standard** — no alternate tuning.  
- **Shared** — one tuning for the guitar; the usual presentation is **guitar + upright bass** for the default duo.  
- **Separate** — independent tunings for the two guitar parts; export keeps both specs and uses the **two electric guitars** / **`guitar_2`** comp route (not guitar + upright labels on the second staff).

**Separate path / `guitar_2` comp**  
In typical MusicXML today, comp harmony on **`guitar_2`** is **dyadic** (two tones per anchor in many bars). Richer same-beat stacks are planned.

**Song Mode Phase A (sectional velocity / texture)**  
When **hook-first identity** is on and the run uses the **guitar–bass duo** realisation, a **Phase A** pass (sectional contrast, tuning-texture bias, phrase-edge velocity) runs for **every** style profile in the five-id list above — it is **not** limited to **Indie Art Pop**. You may hear **clearer melody vs inner-guitar roles**, a little more **section-to-section** contrast, and more **air at phrase ends**; **optional tunings** still steer **sustain / open / cluster** character, and **separate** tunings strengthen the **bed vs riff** split. Default behaviour is unchanged when alternate tuning is not used.

**Per-tuning voicing maps**  
**Preset-specific voicing maps** are **not** implemented for the full palette. The engine has **end-to-end plumbing** for a **pilot** map on the **`new_standard`** (Fripp New Standard) tuning id only. Broader **Tonality Vault**–style voicing coverage for the remaining tunings is a **follow-up** workstream; until then, other tunings use the baseline chord-tone register behaviour (string labels and harmony rows are not a full per-preset voicing map).

**Workflow: two electric guitars (separate path)**  
1. Select **Song Mode**.  
2. Set **Style Engine profile** to one of the five ids in the first bullet.  
3. In alternate tuning options, choose **separate** tunings for **Guitar 1** and **Guitar 2** as needed.  
4. Generated output includes two electric guitar parts; **`guitar_2`** carries the dyadic comp role (not the traditional guitar + upright counterpoint of the default duo without this route).

### Motif Development (Phase 1)

- **Supported paths only:** Song Mode pilot writers (`wayne_shorter`, `barry_harris`, `donald_fagen`, `bacharach`), hybrid (Wayne melody identity + Barry harmony stack), and `ecm_chamber`.
- **How to control it:** pass `motifAuthorityLevel` as `off`, `soft`, or `strong` on supported routes. Legacy `motifAuthorityV1: true` maps to `soft` only when the run is in this pilot scope.
- **Practical meaning:** `off` = no motif-development guarantee and minimal motif summary; `soft`/`strong` = increasing recurrence/transform evidence for pilot runs.
- **Inspectability fields:** receipts / `_meta` / run manifest may include `motifAuthorityLevel` and `motifDevelopmentSummary` on supported pilot runs.

### Guitar–Bass Duo golden path — phrase shaping (Song Mode uses same duo realisation)

On **standard duo** and **Song Mode** runs that resolve to the **golden-path guitar+bass** stack:

- **Phrase Engine Stage 2:** 4-bar **phrase sequencing types** repeat with **inter-phrase contrast** (successive phrases avoid cloning the same sequencing pattern; phrase intent is shared between **guitar** and **bass** so lines align).
- **Phrase Engine Stage 3:** **Controlled anticipation** — at most **one** lead-guitar onset per bar may arrive **one eighth-note early**; **cadence bars** (every **fourth** bar in the phrase window) skip anticipation so phrase endings stay clear. The **separate-tuning dual-electric** route (alt-tuning–eligible style profile + `alternateGuitarTuning.mode === 'separate'`) skips Stage 3 so **guitar_2** chord-density checks stay stable.
- **Bar-4 cadence:** On **every** 4-bar boundary, the engine **lengthens** the phrase-ending lead note toward the bar end and **snaps** it to a **chord tone** so phrase closures read in the score.

Details: **`docs/CHANGELOG.md`** → **[2026-04-28]**.

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

### Leadsheet-input engine (quintet + melody hand-off — Phases 1–7)

Separate from the Song Mode **LeadSheet MusicXML input** panel above. Parallel import path: MusicXML file → composer-specific harmony → **guitar + string quartet** (five parts, no bass) → melody hand-off → string realization → exported MusicXML. **Not** a polished general-purpose product.

#### Leadsheet engine (current limits)

| Limit | Status |
|--------|--------|
| **Bar cap** | Processes the **full leadsheet** up to **64 bars** (reads actual input bar count; **8-bar** inputs unchanged) |
| **Input** | **MusicXML** leadsheets (melody + chord symbols) or **MIDI** (`.mid`/`.midi`). **MIDI input v1 supports single-track melody MIDI** — one non-drum melody part only. **Multi-track exports** (Sibelius/DAW with separate lead, harmony, and drums) **will mislabel melody and harmony**. For multi-track scores, use **MusicXML** export; multi-track MIDI support is planned for **v2**. MIDI import **quantizes melody to eighth notes**; harmony is **inferred and advisory only** (never hard-locked). **`.mxl`** not yet supported |
| **Output** | **Guitar + String Quartet** (5 parts). **Viola is currently silent** (known orchestration bug) |
| **Composers** | **debussy**, **kenny_wheeler**, **bartok** proven on Orbit compare — profiles differ mainly in **harmonic language**; rhythmic/texture behaviour is largely shared |
| **GCE/LOCK** | Available via **CLI/test harness only** (`runLeadSheetOrbitGceLockProofCli.ts`, `leadSheetPhase7StringRealizationProof.test.ts`) — **not** in desktop Generate UI |
| **UI** | Lead Sheet Input panel remains behind **`COMPOSER_OS_FULL_UI=1`**; this eval checkpoint does **not** ungate it |

**Known issues:** silent viola · **rhythmAntiLoop** LOCK often fails on grid-perfect pad-like writing · composer profiles change harmony more than overall behaviour · **sparse-chord leadsheets** (e.g. ~10 chord symbols across 40 bars) may leave long unlabeled harmonic stretches — later bars may inherit/default rather than express dense harmonic change.

**Desktop GUI (Phase 6 — full Generate UI required):**

1. From **`apps/composer-os-desktop`**, launch with full UI (default window is the slim Musician shell):

   ```powershell
   $env:COMPOSER_OS_FULL_UI='1'; npm start
   ```

2. Open the **Generate** tab. Find **Lead Sheet Input (File→Open)** (above Mosaic import).

3. Choose **Composer:** **Debussy** or **Kenny Wheeler**.

4. Click **Open MusicXML or MIDI leadsheet…**, pick a local **`.musicxml`**, **`.xml`**, **`.mid`**, or **`.midi`** file. **MIDI v1:** use **single-track melody MIDI** only. Multi-track Sibelius/DAW exports (lead + harmony + drums) will mislabel melody and harmony — use **MusicXML** for those scores until **v2**. For MIDI, the panel shows **Harmony inferred (advisory)** with a per-bar confidence strip. **Click a bar** in that strip to override its chord symbol (**Save** / **Clear**); the pipeline re-runs with your overrides on those bars only (purple = user override). Canceling the dialog shows **No file selected.** — no output written.

5. On success, status shows file name, bar/part counts, and save path under your Composer OS output folder **`leadsheet-input/`** (e.g. `{filename}_{composerId}_quintet.musicxml`).

**CLI proof (still available from repo root):**

```bash
npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/runDebussyLeadSheetInputProofCli.ts
```

Outputs under **`engines/composer-os-v2/output/debussy-leadsheet-input-proof/`** (includes Phase 5 composer compare).

**GCE/LOCK Orbit proof (eval harness only — no UI):**

```bash
npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/runLeadSheetOrbitGceLockProofCli.ts
```

See [COMPOSER_HANDBOOK.md](COMPOSER_HANDBOOK.md) § Leadsheet-input engine.

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

### SD3 Drum Guide Export (companion MIDI + JSON)

Whenever Composer OS writes a **MusicXML** score to your library, it also drops two companion files next to it, using the same base filename:

- **`<basename>_drum_guide.mid`** — a short **Type-1 MIDI** drum map with **kick** on **MIDI 36 (C1)** and **snare** on **MIDI 38 (D1)** (General MIDI drum channel **10**). The file uses **480 PPQ** (pulses per quarter), matching the engine’s MusicXML divisions grid.
- **`<basename>_drum_guide.json`** — a small **sidecar** (version **1**) listing **`ppq`**, **`bpm`**, **`totalBars`**, and a **`bars`** array. Each bar records the **meter**, **beat grouping**, and **`kickTicks` / `snareTicks`** arrays (absolute tick offsets from the start of that bar).

**Odd meters:** If your generation used a **`barMeterMap`** (Song Mode meter presets, Frank Zappa meter UI, Brubeck / Monk / Shorter tiles, etc.), the drum guide follows those bars — all **18** internal composer meter presets are reflected in grouping and tick placement.

**Superior Drummer 3:** Drag **`_drum_guide.mid`** into **Tap2Find** or onto the **Song Track** to align or sketch drums against the same rhythmic grid as the score.

There is **no separate toggle** in Generate: the drum guide is emitted **automatically** whenever a MusicXML export is produced.

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

**Chorus / bridge motif development (lead guitar):** On the duo golden path, after the lead guitar part is built, a **seed-deterministic** pass may apply **one** light transform per **chorus** or **bridge** section (not verse/intro): e.g. **onset +1 beat**, **rhythmic augment**, or a **small leap nudge** on a second note. **At most one** of these per section. Inspect **`motifDevelopmentSummary`** on the manifest / `_meta` when present.

**Known limitation:** Rules in **`songwriterRuleRegistry`** and per-row **metadata tags** (**tension**, **motion**, **cadential**, **pedal**) **inform planning metadata** today. **Rule-to-chord wiring** is **metadata only** in the picker **until contextual selection** is implemented.

### Song Mode — Odd-meter meter map (Dave Brubeck, Thelonious Monk, Wayne Shorter)

When **Songwriter** is **Dave Brubeck**, **Thelonious Monk**, or **Wayne Shorter**, Generate shows **“{Composer} — meter map”** with **All 4/4** plus named presets (for example **Take Five (5/4)**, **Blue Rondo (9/8)**, Monk **4/4 + 3/4**, Shorter **6/4** / **7/4**, etc.). Choosing a preset sends a tiled **`barMeterMap`** so MusicXML carries per-bar time signatures; **All 4/4** omits **`barMeterMap`** and keeps default **4/4** behaviour. **Frank Zappa** uses the separate, fuller meter-map UI (pattern / per-bar tabs).

### Song Mode — Dave Brubeck primary songwriter (`dave_brubeck`)

**Dave Brubeck** is **In library** — not **Shipped (full slice)**. There is no **`brubeckSlice.ts`**; the engine resolves **`dave_brubeck`** via **registry**, **style profile**, and pairing metadata. Song Mode still exposes Brubeck **odd-meter meter-map** presets (see **Odd-meter meter map** above).

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

### Song Mode — Tom Verlaine primary songwriter (`verlaine`)

**Tom Verlaine** appears under **Shipped (full slice)**. Primary id **`verlaine`** — aliases **`tom_verlaine`**, **`television`**, **`tv`** resolve to the same profile (no separate **`television`** composer id).

- **Sound:** suspended modal field, angular art-punk guitar language vs dense noise-rock.
- **Harmony:** static modal centres, bass displacement, progression avoidance (`tv:*` receipts).
- **Best BPM:** mid-tempo rock feel; pair with **post-punk** / **art-rock** arranger hints when experimenting.

### Guitar–Bass Duo — Tom Verlaine Slonimsky Voice (`verlaine`)

On preset **Guitar–Bass Duo**, open **Slonimsky presets** → **Voice** → **Tom Verlaine**. This sets **`harmonicVoice: verlaine`** on generate while the style stack primary stays **Barry Harris** (or your chosen stack). Harmony uses Verlaine suspended-field / slash voicings (`tv:*` / **`verlaine_suspended_field`** VRB), not the default Barry Harris duo32 loop. Shipped **2026-07-06** — see **`docs/VERLAINE_GBD.md`**.

### Song Mode — Debussy primary songwriter (`debussy`)

**Debussy** appears under **Shipped (full slice)**. Full impressionist slice via **`debussySlice.ts`** — parallel planing, whole-tone colour, pentatonic melody bias (`db:*` receipts).

- **Sound:** colour-first harmony, phrase rubato against pulse.
- **Harmony:** planing streams, modal colour shifts, sparse cadential softness.
- **Best BPM:** slow–moderate; pair with **classical** or **ECM Chamber** arranger hints for chamber colour.

### Song Mode — Olivier Messiaen primary songwriter (`messiaen`)

**Messiaen** appears under **Shipped (full slice)**. Limited-transposition modes, additive rhythm, birdsong motifs (`om:*` receipts).

- **Sound:** static colour fields, mode rotation, transcendence-tail cadences.
- **Harmony:** no bare **V→I** closures; spine holds **≥2** bars per chord.
- **Best BPM:** slow; optional **`messiaenPeriodMode`** on generate payload for period flavour.

### Song Mode — Kenny Wheeler primary songwriter (`kenny_wheeler`)

**Kenny Wheeler** appears under **Shipped (full slice)** (also listed under **ECM Chamber Jazz** production world). Slice via **`wheelerLyricSlice.ts`** — polyaxial lyrical ECM harmony (`kw:*` / device receipts).

- **Sound:** brittle intervallic melody, spacious ECM chamber bias.
- **Harmony:** upper-structure voicings, independent bass, soft cadential landing.
- **Best BPM:** 50–80; aliases **`wheeler`**, **`kw`**.

### Song Mode — Bob Brookmeyer primary songwriter (`bob_brookmeyer`)

**Bob Brookmeyer** appears under **Shipped (full slice)** (also listed under **ECM Chamber Jazz** production world). Line-first valve-trombone grammar via **`bobBrookmeyerSlice.ts`** (`brk:*` receipts).

- **Sound:** linear counterpoint, valve-trombone voicing bias, big-band lineage without shout-chorus default.
- **Harmony:** guide-tone linearity with Brookmeyer colour passes.
- **Best BPM:** medium swing; aliases **`brookmeyer`**, **`bob brookmeyer`**.

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

**Section-shaping diagnostics:** Song Mode writes a versioned aggregate **`songModeSectionShapingDiagnostics`** on each run manifest (density/colour B−A, opening vs return, return variation, contributing slices). The **Fagen**, **Bacharach**, and **Sophisticated Pop** eval scripts (`eval:fagen`, `eval:bacharach`, `eval:style-soph-pop`) read that field for batch A/B and append **wide per-seed tables** (including per-section **`phraseType`**, **`cadenceBar`**, **`anticipationCount`**, **`motifTransform`**) so A/B diffs stay aligned with the engine receipt, not re-derived from chord-bar strings alone.

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

**Full matrix:** `npm test` / root **`runAllTests`** loads the large harness as **sequential chunks** (separate Node processes with a raised heap limit) so the full suite is less likely to **OOM** one process; it may still exit **non-zero** with **`FAIL:`** lines where [test debt](TEST_DEBT_COMPOSER_OS_V2.md) is recorded. That is **not** the same as the five commands above. **New** failures outside the baseline doc should be treated as **regressions**.

Details: **[TEST_DEBT_COMPOSER_OS_V2.md](TEST_DEBT_COMPOSER_OS_V2.md)**.

---

## Related docs

- [README.md](../README.md) — project overview and quick start.
- [CHANGELOG.md](CHANGELOG.md) — what changed and when.
- [COMPOSER_OS_ROADMAP.md](COMPOSER_OS_ROADMAP.md) — past / current / future (clearly separated).
- [TEST_DEBT_COMPOSER_OS_V2.md](TEST_DEBT_COMPOSER_OS_V2.md) — engine test baseline vs `npm test` debt.
- [apps/composer-os-app/README.md](../apps/composer-os-app/README.md) — app-specific run and build notes.

---

## What's New — May 2026

### Songwriter Style Profiles (Duo / Song Mode)

The Slonimsky chromatic layer now reads from the songwriter style profile map for all three pipelines (Duo, Big Band, String Quartet). Previously the Duo pipeline used a hardcoded list of four songwriters — it now responds correctly to all profiles including Donald Fagen, Kate Bush, Herbie Hancock, Radiohead, Jobim, Bacharach, Brian Wilson, and Dave Brubeck.

### Odd-meter Song Mode (May 2026)

**Dave Brubeck**, **Thelonious Monk**, and **Wayne Shorter** support optional **`barMeterMap`** meter presets in Song Mode (see **Song Mode — Odd-meter meter map** above). **`npm run test:composer-smoke`** aggregate tier is **122**/0 PASS rows (repo snapshot **2026-05-04**); sync **`docs/COMPOSER_OS_ROADMAP.md`** and **`CLAUDE.md`** when **`runSmokeTests.ts`** changes.

### MusicXML Lead-Sheet Import — Big Band and String Quartet

You can now supply a MusicXML lead sheet when generating Big Band or String Quartet arrangements. The app reads the chord symbols bar-by-bar from your file and uses them to drive the harmony of the generated arrangement.

Three harmony modes are available:

- **Free harmony** — ignores the imported chords; the engine generates its own harmony (default when no file is supplied).
- **Lock harmony** — the imported chords are used exactly, bar for bar.
- **Blend harmony** — imported chords and engine-generated chords are compared bar by bar; the imported chord wins on bars where it differs, weighted by the blend setting.

The run receipt shows what harmony mode was applied, how many bars were locked, and the policy version used.

The app also extracts behavioural hints from the imported file — density, register spread, and melodic contour — and attaches them to the run manifest as reference influence metadata. These are advisory only and do not override note generation.

### Composers tab — AuditionDock (in-app Listen)

**Where:** **Composers** tab (**`ComposerLauncher`**), dock at bottom of the composer browser.

**What it does:** Select a composer → **Listen** → app runs a **fresh generate** (balanced creative control, **32 bars**, **120 BPM**, key **C**) and plays the result through the shared Tone.js playback path (**`auditionFromGenerateResult`**). **Play** / **Pause** / **Stop** after a successful generate.

**Current limit (Phase 1):** Audition plays **composer-invented material from the demo seed**, not your lead-sheet chords, pasted progression, or MusicXML import. To hear **your** chart, use **Generate** (or **Arranger**) with your inputs and export to notation software.

**Arrangement honesty:** Most composers audition on the **Song Mode guitar–bass duo** path. **Debussy**, **Messiaen**, and **Steve Reich** also audition on **Song Mode duo** — they do **not** switch to String Quartet or other native ensemble presets in the dock (see **`composerCoverageManifest.json`** **`arrangementPath`** notes). Full ensemble arrangement coverage is **not** implied for every composer id in the browser.

**Empty output:** If generate succeeds but MusicXML has no playable notes, status shows **No playable notes** (empty-notes gate).

### Slonimsky Etudes (standalone tab)

A new **Slonimsky Etudes** tab is available in the desktop app. This is a standalone study tool — it is separate from the Generate tab and does not affect your main compositions.

How to use it:

1. Open the **Slonimsky Etudes** tab from the nav bar.
2. Choose a pattern family from the dropdown (13 families drawn from Slonimsky's *Thesaurus of Scales and Melodic Patterns*, 1947).
3. Choose a specific pattern within that family.
4. Enter a chord progression — for example one chord per bar separated by vertical bars (such as Cmaj7, Dm7, G7, Cmaj7 in order).
5. Select a root key (C through B).
6. Set BPM and Chromatic Strength (Off / Subtle / Prominent).
7. Optionally enable **Cycle through 12 keys** — this generates the etude transposed through all 12 keys in sequence.
8. Click **Generate**.

The output is a MusicXML file you can open in Sibelius, Dorico, MuseScore, or any MusicXML-compatible notation app. Use **Open in folder** to find the file.
