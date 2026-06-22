# Composer OS — Band Mode Guide

Plain guide for using **Band mode** on the **Generate** screen. No developer jargon.

---

## 1. Mental model

Band mode starts from the usual **Guitar / Bass duo** and adds **drums** without rewriting your guitar and bass parts.

When **Band mode (G/B + drum guide)** is on, a successful generate gives you:

1. **MusicXML with three parts** — Guitar, Bass, and a scored **Drums** staff (kick, snare, hi-hat in a standard rock feel).
2. **Drum guide MIDI** — a separate `_drum_guide.mid` file for listening in a DAW or Superior Drummer 3.
3. **Drum guide JSON sidecar** — `_drum_guide.json` with bar meters and kick/snare tick positions.

Guitar and bass stay the same as a normal duo generate. Drums are added on top.

With a **mosaic section plan** (for example **Television Field Suite**), drum density follows section labels on a fixed **4/4 Art Rock grid** — not copied blindly from guitar/bass attack times. Without a mosaic plan you still get scored drums and a guide, but density stays at a steady medium pattern.

Band mode works best on a long mosaic tune (40-bar **Television Field Suite** is the reference). Short duo runs work too — you get less section drama.

---

## 2. The menu, in plain English

This list follows the **Generate** tab top to bottom when you pick **Texture & Arrangement** → **Duo** (the guitar/bass path where **Band mode** appears). One sentence per control.

**Top navigation**

- **Composers** — Browse writers and jump to Generate with one pre-selected.
- **Generate** — The compose screen this guide describes.

**Header**

- **Generate** (page title) — You are on the main compose view.
- **Library folder:** — Shows where files save; helper text says outputs go under preset folders (e.g. Guitar-Bass Duos) below this path.
- **Output name (optional)** — Web app only: custom filename stem before the seed (desktop skips this row).

**Producer lanes (pick your path)**

- **Song & Chart** — Lane title; purpose line: *Harmonic truth, form, lead sheet*.
- **Song Mode**, **iReal**, **Vault**, **Comping** — Tiles in Song & Chart (not the Band mode path).
- **Study & Pattern** — Lane title; purpose line: *Learning, pattern, etude*.
- **Wyble**, **Martino**, **Slonimsky**, **Standalone etude**, **Wyble etude preset** — Study tiles (not the Band mode path).
- **Texture & Arrangement** — Lane title; purpose line: *Ensemble colour, groove, arrangement*. **Pick this lane for Band mode.**
- **Duo** — Tile you want: tagline *Guitar · bass*; selects the guitar/bass duo preset.
- **ECM chamber**, **Big Band**, **New Orleans / funk**, **Riff**, **Tritonic**, **Wayne Shorter**, **Monk**, **String Quartet**, **SQ → BB** — Other Texture & Arrangement tiles (Band mode toggle does not appear on these).

**Shared context strip**

- **Harmony** — Short readout of the chord source in play (pasted line, built-in cycle, etc.).
- **Time** — Tempo and meter summary for this run.
- **Seed** — Random id for repeatability; **Reroll** picks a new one (hidden on desktop).
- **Export integrity** — Passed / Failed / Awaiting run after your last generate.

**Mosaic sections** (panel heading)

- **Section plan preset** — Dropdown; shipped option: **Television Field Suite (40 bars)** plus **— choose preset —**.
- **Load preset** — Applies the chosen preset after a confirm dialog.
- **Suggest sections from import** — Builds rows from an imported chart timeline (when import data exists).
- **Label**, **Start**, **End**, **Composer**, **Meter**, **Preset** — Column headers for each section row.
- **Inherit** (under Meter) — Uses project default meter (usually 4/4) for that section.
- **Add section** — Adds another mosaic slice (needs at least two sections before Generate sends a plan).
- **Remove** — Deletes one section row.
- **Output format** — **None**, **Melody + bass + chords**, or **Lead sheet** (lead sheet disabled when mixed Big Band / String Quartet sections are in the plan).

**Composer** options per mosaic row (when Preset = Duo): **Default (primary songwriter)**, **Fripp**, **Jack White**, **Wayne Shorter**, **ECM Chamber**, **Sonic Youth**, **Verlaine**, **Marr**, **Bartok (SQ VRB)**.

**Preset** per mosaic row: **Duo**, **Big Band**, **String Quartet**.

**Guitar–Bass Duo — Slonimsky presets** (panel)

- **Writer** — Slonimsky writer for outside-note flavour (Nile Rodgers, Eddie Van Halen, Larry Carlton, David Gilmour, Jimi Hendrix, Robert Fripp, Wes Montgomery, Joe Pass, Allan Holdsworth, Scott Henderson).
- **Outside level** — **Off**, **Subtle**, or **Prominent** chromatic outside notes.

**Core song settings**

- **Tonal centre / key** — Short key label only (e.g. `C`); not where the full chord chart goes.
- **Chord progression (optional)** — Your harmony line; length should match **Number of bars** (8–64 on duo).
- **Tempo (BPM)** — Beats per minute for export.
- **Number of bars** — Length dropdown: **8 bars**, **16 bars**, **24 bars**, **32 bars**, **48 bars**, **64 bars** (duo path).
- **Song Form** — Form picker; default row **System default**; list entries like *AABA — 32 bars (AABA)* (exact names vary by form catalogue).
- **Variation** — Current variation id with **New Variation** (fresh id + new seed) and **Next Variation** (steps the id).

**Feel and colour (duo / Song Mode family)**

- **Hook Rhythm Strength** — **Light**, **Medium**, or **Strong** hook rhythm push.
- **Blend Strength** — **Light**, **Medium**, or **Strong** blend between rhythm layers.
- **Funk Groove** — Checkbox **Enable James Brown funk overlay**.
- **Feel** — How much the engine nudges the variation: **Stable**, **Balanced**, or **Surprise** (radio buttons).
- **Variation** (under Feel) — Dropdown **Off** or **On** for variation engine.
- **Title (optional)** — Custom score title on export.

**Export options (scroll here for Band mode)**

- **Generate drum guide (SD3)** — Exports kick/snare MIDI guide + JSON sidecar; **disabled while Band mode is on** (Band mode always includes the guide).
- **Band mode (G/B + drum guide)** — Keeps guitar/bass unchanged; adds labeled drum-guide bundle and scored Drums part; mosaic plans use the Art Rock grid.

**Action buttons**

- **Generate** — Runs the engine with current settings.
- **Try Another** — New variation id + seed, then generates.
- **Demo (fixed variation)** — Fixed demo seed for a repeatable sample.
- **Open library folder** — Opens your library path in the file manager.

After generate, the results area shows receipt lines (filepath, export integrity, **Primary songwriter**, etc.) and download actions — labels vary by platform.

---

## 3. 60-second recipe

1. Open the app → tab **Generate**.
2. Under **Texture & Arrangement**, click **Duo**.
3. In **Mosaic sections**, choose **Section plan preset** → **Television Field Suite (40 bars)** → **Load preset** (optional but gives the full drum arc).
4. Set **Number of bars** to **40 bars** if the preset did not already set it.
5. Scroll down → tick **Band mode (G/B + drum guide)**.
6. Click **Generate**.
7. Click **Open library folder** → open the **Guitar-Bass Duos** subfolder → `.musicxml` (3 parts) + `_drum_guide.mid` + `_drum_guide.json`.

---

## 4. What the drums do on a mosaic tune

On **Television Field Suite**, drum **density follows the section arc**:

| Section | Bars (TV Suite) | Drum feel |
|---------|-------------------|-----------|
| **Intro** | 1–8 | Sparse — light kick, minimal hat, snare on beat 3 |
| **Build** | 9–20 | Medium — standard backbeat + eighth-note hats |
| **Peak** | 21–28 | Busy — fuller kick pattern, heavier feel |
| **Tail** | 29–40 | Thin — pulls back for an unresolved landing |

**Section changes** at bars **9**, **21**, and **29** get **fills** on the bar before (bars 8, 20, 28) — a short snare roll into the next section.

The scored Drums staff in MusicXML and the `_drum_guide.mid` use the same tier logic when a mosaic plan is present.

---

## 5. Where your files land

After a successful generate, look in your **Guitar-Bass Duos** folder under the path shown at **Library folder:**.

**Default path (Windows):**

```
C:\Users\<you>\Documents\Mike Composer Files\Guitar-Bass Duos\
```

**Override:** set environment variable `COMPOSER_OS_OUTPUT_DIR` to change the root; preset subfolders still apply.

**Files written (same folder):**

| File | What it is |
|------|------------|
| `composer_os_guitar_bass_duo_<timestamp>_<seed>.musicxml` | Full score — Guitar, Bass, **Drums** (3 parts when **Band mode (G/B + drum guide)** is on) |
| `composer_os_guitar_bass_duo_<timestamp>_<seed>.mid` | Optional full-score MIDI if MIDI export is enabled |
| `composer_os_guitar_bass_duo_<timestamp>_<seed>_drum_guide.mid` | Kick/snare drum guide MIDI |
| `composer_os_guitar_bass_duo_<timestamp>_<seed>_drum_guide.json` | Sidecar — bar list, meters, kick/snare tick positions |

**Manifest** (generation receipt, including `bandMode: true`):

```
...\Guitar-Bass Duos\_meta\composer_os_guitar_bass_duo_<timestamp>_<seed>.manifest.json
```

In the app, use the results panel or **Open library folder** to jump to this directory.

**Band mode off:** same folder, but MusicXML has **two parts only** (Guitar + Bass) and no `_drum_guide` files unless you tick **Generate drum guide (SD3)** separately.

---

## 6. Feel knobs

These controls shape groove and variation on the duo path. They do **not** replace mosaic section drama — use **Mosaic sections** + **Television Field Suite** for intro/build/peak/tail drums.

| Control | What it does |
|---------|----------------|
| **Hook Rhythm Strength** | How strongly hook rhythm cells anchor the chart (**Light** / **Medium** / **Strong**). |
| **Blend Strength** | How much rhythm layers blend together (**Light** / **Medium** / **Strong**). |
| **Enable James Brown funk overlay** | Adds a funk groove overlay when checked. |
| **Feel → Stable / Balanced / Surprise** | How adventurous each generate is — not the same as section drum tiers. |
| **Feel → Variation Off / On** | Turns the variation engine on or off. |
| **New Variation** / **Next Variation** | Changes the variation id (and **New Variation** also rerolls seed). |

**Outside level** under **Guitar–Bass Duo — Slonimsky presets** adds chromatic outside notes (**Off** / **Subtle** / **Prominent**) — guitar colour only, not drum kit choice.

---

## 7. Mosaic section plan presets

| Preset name in UI | Bars | Sections | Use with Band mode |
|-------------------|------|----------|-------------------|
| **Television Field Suite (40 bars)** | 40 | intro (Verlaine) · build (Marr) · peak (Fripp) · tail (Verlaine) | **Recommended** — full Art Rock drum arc |

To load: **Section plan preset** → pick the name → **Load preset** (or choose from the dropdown, which applies on selection). Confirm replace if you already had rows.

You can also hand-build rows with **Add section** — need **at least two sections** before Generate sends `mosaicSectionPlan`.

---

## 8. Twenty scenarios

Each scenario assumes tab **Generate**, lane **Texture & Arrangement**, tile **Duo**, unless noted.

1. **Quick backbeat sketch** — 16 bars, no mosaic, **Band mode** on → steady medium drums + guide files.
2. **TV Suite listening test** — Load **Television Field Suite (40 bars)**, **Band mode** on → sparse intro, busy peak, thin tail.
3. **Drums without Band mode** — Untick **Band mode**, tick **Generate drum guide (SD3)** only → 2-part XML + guide MIDI/JSON.
4. **Band mode forces guide** — **Band mode** on → **Generate drum guide (SD3)** greyed out; guide always included.
5. **Try another groove** — After generate, **Try Another** → new seed, same mosaic plan.
6. **Demo for a friend** — **Demo (fixed variation)** → repeatable output for A/B in Sibelius.
7. **Custom title** — Fill **Title (optional)** before **Generate** → title appears in XML metadata.
8. **Long duo, no mosaic** — **Number of bars** → **64 bars**, no section plan → medium drum pattern throughout.
9. **Hand-built two-section plan** — **Add section** twice, set **Label** / **Start** / **End** / **Composer** → partial arc (less than TV Suite).
10. **Output format lead sheet** — Mosaic all **Duo** rows, **Output format** → **Melody + bass + chords** → lead-sheet-oriented export with Band drums.
11. **Funk overlay + Band** — **Enable James Brown funk overlay** + **Band mode** → funk guitar colour with rock drum grid.
12. **Surprise feel** — **Feel** → **Surprise**, **Variation** → **On** → wilder guitar/bass; drums still follow mosaic or medium tier.
13. **Stable feel** — **Feel** → **Stable** → tighter, safer duo variation.
14. **Slonimsky Fripp peak** — Mosaic peak section **Composer** → **Fripp**, **Outside level** → **Prominent** → dense guitar with busy drum tier at peak bars.
15. **Open folder workflow** — **Generate** → **Open library folder** → drag `.musicxml` into Sibelius and `_drum_guide.mid` into SD3 Tap2Find.
16. **Chord progression locked** — Paste 40 chords in **Chord progression (optional)**, load TV Suite mosaic → harmony locked to your chart.
17. **8-bar fragment** — **Number of bars** → **8 bars** → Band works but little section drama (structurally short).
18. **Song Form + mosaic** — Pick a **Song Form** entry (e.g. 32-bar AABA) **and** mosaic — align bar counts manually so sections match total length.
19. **Web output name** — On web, set **Output name (optional)** → saved file uses your stem + seed.
20. **Band off compare** — Same settings, generate once with **Band mode** off then on → compare 2-part vs 3-part XML and guide files.

---

## 9. Troubleshooting

| Problem | What to check |
|---------|----------------|
| No **Band mode (G/B + drum guide)** checkbox | Preset must be duo family — pick **Texture & Arrangement** → **Duo**, not **Big Band** or **String Quartet**. |
| No `_drum_guide` files | **Band mode** off and **Generate drum guide (SD3)** unticked — enable one of them. |
| Flat drums on 16-bar run | No mosaic plan — expected steady medium tier; load **Television Field Suite** for arc. |
| Mosaic ignored | Fewer than two sections — add rows or **Load preset**. |
| **Generate drum guide (SD3)** greyed out | **Band mode** is on — guide is always included. |
| Wrong folder | Read **Library folder:** at top; files live under **Guitar-Bass Duos**. |
| Export integrity **Failed** | Fix harmony/bar issues shown in receipt; output may not be shareable. |

**Current limits**

- **4/4 drum grid** — Band mode drums assume common time on the Art Rock path. Odd per-section meters in mosaic rows are not fully supported on drums yet.
- **Duo presets only** — Toggle appears only on guitar/bass duo family.
- **Full arc needs mosaic** — intro/build/peak/tail drum drama needs a mosaic plan with at least two sections; plain short duos get steady medium drums.
- **Functional drums** — Section-aware rock pattern, not bespoke per-composer kits or fill library at every boundary.

---

## 10. Glossary

| Term | Plain meaning |
|------|----------------|
| **Band mode (G/B + drum guide)** | Checkbox that adds scored Drums + MIDI/JSON drum guide without changing guitar/bass parts. |
| **Generate drum guide (SD3)** | Separate checkbox for guide files only (2-part score); disabled when Band mode is on. |
| **Duo** | Texture & Arrangement tile for guitar/bass duo generate. |
| **Library folder:** | Readout of your Composer OS output root; use **Open library folder** to open it. |
| **Mosaic sections** | Panel to plan 2+ sections with per-section composer and bar ranges. |
| **Section plan preset** | Curated mosaic plans; shipped: **Television Field Suite (40 bars)**. |
| **Television Field Suite** | 40-bar Art Rock mosaic: Verlaine intro/tail, Marr build, Fripp peak. |
| **Drum guide** | `_drum_guide.mid` + `.json` — kick/snare map for DAW or Superior Drummer 3. |
| **Art Rock grid** | Fixed 4/4 kick/snare/hat pattern tiers tied to mosaic section labels. |
| **Export integrity** | Passed/Failed gate in the shared strip — shareable export quality. |
| **Number of bars** | Chart length control (duo: 8–64 in the dropdown). |
| **Texture & Arrangement** | Producer lane where **Duo** lives. |

---

*Composer OS · Band Mode Guide · June 2026*