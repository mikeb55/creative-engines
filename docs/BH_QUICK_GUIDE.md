# Barry Harris Chord-Melody - Quick Guide

For jazz guitarists new to Composer OS.

---

## What is Barry Harris chord-melody?

Barry Harris taught harmony as a **scale of chords**: every **6th chord** (C6, Am6, ...) pairs with a **diminished 7th** a half-step below (Bdim7 for C6). You voice-lead through these pairs under a **melody on top**. Composer OS automates that ladder for an imported tune or typed chord chart, then exports **MusicXML** you can open in **MuseScore**, **Sibelius**, or similar.

---

## How to get started

1. Open **Composer OS** and the **Generate** tab.
2. Expand **Import (MIDI / MusicXML)**.
3. **Drop or browse** a .mid / .musicxml / .mxl file (melody + chords), **or** type chord symbols in the **Paste Chord Progression** field.
4. After import, click **Style-Transfer**.
5. Set **Target composer** to **Barry Harris**. You should see **Barry Harris Chord-Melody**.
6. Set **Strength** to **1.0** for full BH harmony (try **0.5** to blend with your original changes).
7. Leave **Preserve melody** on.
8. Click **Generate**.
9. Download **MusicXML** from the result panel and open it in your notation app.

**Tip:** Jazz standards with **chromatic** melody lines (approach tones, enclosures) give richer dim7 and borrowed chords. Simple diatonic lines still work but stay mostly on 6th voicings.

---

## What the output looks like

- **Lead sheet:** melody + BH harmony symbols on a guitar-friendly staff.
- **Block voicings:** 3-4 notes under the melody (close position or drop-2 where feasible).
- **Export:** shareable MusicXML when the green export-integrity receipt passes.

---

## Understanding the scale of chords

Example in **C major**:

C6 <-> Bdim7 | F6 <-> Edim7 | Am6 <-> G#dim7 | Em6 <-> D#dim7

- **C6** = C E G A (often spelled C6 or Cmaj6 on charts).
- **Bdim7** = B D F Ab - partner chord in the same Barry Harris family.
- Melody notes on chord tones get a **6th** stack; chromatic **passing** tones can pull from the **partner dim7**.

The results panel shows your section ladder after generate.

---

## What the numbers mean

| Readout | Meaning |
|--------|---------|
| **Rung breakdown** | How many melody events got **6th**, **dim7**, or **borrowed** partner voicings (with %). |
| **Avg voice-leading step** | Average semitone motion of inner voices - lower is smoother (often 2-3 on jazz lines). |
| **Guitar feasibility** | % of stacks that fit a **4-fret span** on guitar; **max span** is the widest voicing used. |
| **Eval score** | Internal quality score for the style-transfer pass (higher is better). |

---

## If something sounds too plain

- Use a chart with more **altered** and **chromatic** melody motion.
- Set **Strength** to **1.0**.
- Check harmony import confidence (green bars = locked chart harmony BH can reinterpret).

---

## More detail

See **Composer Handbook - Barry Harris Chord-Melody** and **docs/CHANGELOG.md** section **2.8.0**.