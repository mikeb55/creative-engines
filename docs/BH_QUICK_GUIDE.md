# Barry Harris Chord-Melody & Arranger — Quick User Guide

For jazz guitarists new to Composer OS.

---

## What is Barry Harris chord-melody?

Barry Harris taught harmony as a **scale of chords**: every **6th chord** (C6, Am6, ...) pairs with a **diminished 7th** a half-step below (Bdim7 for C6). You voice-lead through these pairs under a **melody on top**. Composer OS automates that ladder for an imported tune or typed chord chart, then exports **MusicXML** you can open in **MuseScore**, **Sibelius**, or similar.

---

## Two ways in: Generate tab or Arranger tab

### Generate tab (classic path)

1. Open **Composer OS** and the **Generate** tab.
2. Expand **Import (MIDI / MusicXML)**.
3. **Drop or browse** a .mid / .musicxml / .mxl file (melody + chords), **or** type chord symbols in the **Paste Chord Progression** field.
4. After import, click **Style-Transfer**.
5. Set **Target composer** to **Barry Harris**. You should see **Barry Harris Chord-Melody**.
6. Set **Strength** to **1.0** for full BH harmony (try **0.5** to blend with your original changes).
7. Leave **Preserve melody** on.
8. Click **Generate**.
9. Download **MusicXML** from the result panel and open it in your notation app.

### Arranger tab (wizard path)

1. Open the **Arranger** tab in the nav bar.
2. **Upload** your MIDI or MusicXML (melody + chord symbols).
3. Choose **Barry Harris** (or another style-transfer composer).
4. In **Settings**, pick a **Preset** from the dropdown (see **Scenario 11** below).
5. Set **Strength** to **1.0**, keep **Preserve melody** on, optionally name the output.
6. Click **Run**.
7. Use **Open MusicXML** (desktop) or download; **Reveal in folder** shows the library path.

**Tip:** Jazz standards with **chromatic** melody lines (approach tones, enclosures) give richer dim7 and borrowed chords. Simple diatonic lines still work but stay mostly on 6th voicings.

---

## What the output looks like

- **Lead sheet:** melody + BH harmony symbols on a guitar-friendly staff (Song Mode preset).
- **Block voicings:** 3–4 notes under the melody (close position or drop-2 where feasible).
- **String Quartet / Big Band:** same BH harmony engine, parts written to ensemble staves (see Scenario 11).
- **Export:** shareable MusicXML when the green export-integrity receipt passes.

---

## Understanding the scale of chords

Example in **C major**:

C6 ↔ Bdim7 | F6 ↔ Edim7 | Am6 ↔ G#dim7 | Em6 ↔ D#dim7

- **C6** = C E G A (often spelled C6 or Cmaj6 on charts).
- **Bdim7** = B D F Ab — partner chord in the same Barry Harris family.
- Melody notes on chord tones get a **6th** stack; chromatic **passing** tones can pull from the **partner dim7**.

The results panel shows your section ladder after generate.

---

## What the numbers mean

| Readout | Meaning |
|--------|---------|
| **Rung breakdown** | How many melody events got **6th**, **dim7**, or **borrowed** partner voicings (with %). |
| **Avg voice-leading step** | Average semitone motion of inner voices — lower is smoother (often 2–3 on jazz lines). |
| **Guitar feasibility** | % of stacks that fit a **4-fret span** on guitar; **max span** is the widest voicing used. |
| **Eval score** | Internal quality score for the style-transfer pass (higher is better). |

---

## Scenario 11 — String Quartet and Big Band presets (Arranger tab)

The **Arranger** tab **Preset** dropdown lists three named options. Pick the one that matches how you want the chart scored — you do **not** need to stay on Song Mode only.

| Preset (dropdown label) | What you get |
|-------------------------|--------------|
| **Song Mode** | Guitar–bass duo style-transfer — BH chord-melody under your melody on a lead-sheet-friendly staff. Default; same engine path as Generate mosaic import. |
| **String Quartet** | **Violin I**, **Violin II**, **Viola**, **Cello** — BH voicing distributed across four parts; passing diminished on inner voices where appropriate. |
| **Big Band** | **Alto Sax 1 & 2**, **Tenor Sax 1 & 2**, **Bari Sax** — five-voice sax soli with BH voicing and bari root doubling on thick stacks. |

**Suggested workflow:**

1. Upload once; run with **Song Mode** + **Barry Harris** to confirm melody lock and harmony.
2. Re-run with **String Quartet** or **Big Band** selected in the **Preset** dropdown — same file, same composer, new scoring.
3. Compare MusicXML in your notation app; check part names match the table above.

**Note:** Ensemble presets use the same imported harmony and BH chord-melody pipeline; only the **orchestration target** changes.

---

## If something sounds too plain

- Use a chart with more **altered** and **chromatic** melody motion.
- Set **Strength** to **1.0**.
- Check harmony import confidence (green bars = locked chart harmony BH can reinterpret).

---

## More detail

See **Composer Handbook — Barry Harris Chord-Melody** and **Arranger tab** sections in **`docs/COMPOSER_HANDBOOK.md`**. Ship notes: **`docs/CHANGELOG.md`** sections **2.10.2a** (presets) and **2.8.0** (chord-melody engine).
