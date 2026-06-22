# Band Mode — User Guide

Plain guide for using Band mode in Composer OS. No developer jargon.

---

## What Band mode does

Band mode takes the usual **Guitar / Bass duo** and adds **drums** — without rewriting your guitar and bass parts.

When you turn it on you get:

1. **MusicXML score with three parts** — Guitar, Bass, and a scored **Drums** staff (kick, snare, hi-hat in standard rock feel).
2. **Drum guide MIDI** — a separate `_drum_guide.mid` file for listening in a DAW or SD3-style workflow.
3. **Drum guide JSON sidecar** — `_drum_guide.json` with tick-level kick/snare data per bar.

Guitar and bass stay the same as the normal duo generate. Drums are added on top.

---

## How to turn it on

1. Open **Generate** in the Composer OS app (web or desktop).
2. Choose a **Guitar/Bass duo** preset — e.g. **Guitar/Bass Duo** (not Big Band, not String Quartet).
3. Scroll to the export options near **Generate**.
4. Tick **Band mode (G/B + drum guide)**.

**What the toggle does:**

- Always includes the drum guide (the separate **Generate drum guide (SD3)** checkbox is disabled while Band mode is on).
- With a **mosaic section plan** (e.g. Television Field Suite), drums use a fixed **4/4 Art Rock grid** tied to section labels — not just copied from guitar/bass attack times.
- Without a mosaic plan, you still get scored drums and a guide, but density stays at a steady medium pattern.

Band mode works best with a long-form mosaic tune (40-bar Television Field Suite is the reference case). Short duo runs work too — you just get less section drama.

---

## What you get out — files and where they land

After a successful generate, look in your **Guitar-Bass Duos** folder:

**Default path (Windows):**

```
C:\Users\<you>\Documents\Mike Composer Files\Guitar-Bass Duos\
```

**Override:** set environment variable `COMPOSER_OS_OUTPUT_DIR` to change the root; preset subfolders still apply.

**Files written (same folder):**

| File | What it is |
|------|------------|
| `composer_os_guitar_bass_duo_<timestamp>_<seed>.musicxml` | Full score — Guitar, Bass, **Drums** (3 parts when Band mode is on) |
| `composer_os_guitar_bass_duo_<timestamp>_<seed>.mid` | Optional full-score MIDI if MIDI export is enabled |
| `composer_os_guitar_bass_duo_<timestamp>_<seed>_drum_guide.mid` | Kick/snare drum guide MIDI |
| `composer_os_guitar_bass_duo_<timestamp>_<seed>_drum_guide.json` | Sidecar — bar list, meters, kick/snare tick positions |

**Manifest** (generation receipt, including `bandMode: true`):

```
...\Guitar-Bass Duos\_meta\composer_os_guitar_bass_duo_<timestamp>_<seed>.manifest.json
```

In the app, use **Outputs** or **Open output folder** to jump to this directory without hunting in Explorer.

**Band mode off:** same folder, but MusicXML has **two parts only** (Guitar + Bass) and no `_drum_guide` files unless you tick **Generate drum guide (SD3)** separately.

---

## What the drums do on a mosaic tune

On a mosaic plan (Television Field Suite is the shipped example), drum **density follows the section arc**:

| Section | Bars (TV Suite) | Drum feel |
|---------|-------------------|-----------|
| **Intro** | 1–8 | Sparse — light kick, minimal hat, snare on beat 3 |
| **Build** | 9–20 | Medium — standard backbeat + eighth-note hats |
| **Peak** | 21–28 | Busy — fuller kick pattern, heavier feel |
| **Tail** | 29–40 | Thin — pulls back for an unresolved landing |

**Section changes** at bars **9**, **21**, and **29** get **fills** on the bar before (bars 8, 20, 28) — a short snare roll into the next section.

The scored Drums staff in MusicXML and the `_drum_guide.mid` use the same tier logic when a mosaic plan is present.

---

## Current limits

- **4/4 only** — Band mode drums assume common time. Odd meters (`7/8`, changing time signatures, etc.) are **not supported yet**.
- **Guitar/Bass duo presets only** — the toggle appears only on the duo family, not on Big Band or String Quartet.
- **Art Rock grid needs mosaic** — full intro → build → peak → tail arc requires a mosaic section plan with at least two sections. Plain 16-bar duo runs get a steady medium drum pattern instead.
- **Drums are functional, not bespoke** — section-aware rock pattern, not per-composer kit colours or full fill library at every boundary.

---

## Quick checklist

1. Preset: **Guitar/Bass Duo**
2. Optional: load **Television Field Suite** (or another mosaic plan) for the full arc
3. Tick **Band mode (G/B + drum guide)**
4. **Generate**
5. Open `Documents\Mike Composer Files\Guitar-Bass Duos\` — `.musicxml` (3 parts) + `_drum_guide.mid` + `_drum_guide.json`