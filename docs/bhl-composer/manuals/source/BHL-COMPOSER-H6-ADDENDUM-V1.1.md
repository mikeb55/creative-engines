# BHL Composer — Hexatonic addendum

**Draft V1.1 · 16 October 2026**

This file is an editable draft. It does not replace the published V1.0 Quick Start or the V1.0 Creative Scenarios Handbook. Those PDF and Word files stay as published. Do not rebuild them until a publication run is authorised.

The pictures in V1.0 do not show the Hexatonic Laboratory, the hexatonic colour menu, Dialogue / Liquid / Sparse, or the Evaluation Dashboard. New screenshots are still required before a published V1.1.

## What changed after V1.0

V1.0 says you choose one of six harmonic worlds and, when you want it, a pentatonic colour. That is still true. H6 adds an optional hexatonic colour on the same BHL page. Worlds A–F are the same list.

A hexatonic colour is not an artistic approval. The page keeps these labels:

- Provisional Core pairs: `PROVISIONAL — NOT MUSICALLY APPROVED`
- Advanced colours: `ADVANCED — NOT MUSICALLY APPROVED`
- Explorer entries: `EXPLORER — NOT MUSICALLY APPROVED`

## Where to start

1. Open the web application.
2. Click **Hexatonic**.
3. In **Core triad-pair laboratory**, choose one of the twelve provisional pairs.
4. Read **Neighbours**. P, L, and R are the consonant neo-Riemannian moves. H, N, and S are named consonant moves. Diminished and augmented triads are not given those names.
5. Press **Play** to audition the excerpt. Press **Stop** to halt it. The notation preview is on the same page.
6. Press **Compose with this pair**. The application opens **BHL** and keeps the pair, including the reference note.

You can also choose a scalar collection, a WPS pair, or an advanced colour and use **Compose with this colour**. Explorer entries stay in the laboratory filter. They are not the default BHL menu.

## On the BHL page

**Hexatonic colour** can be None, a scalar collection, a WPS pair, a provisional candidate, or an advanced colour. None leaves the world pitches as they are.

The shape controls sit under that menu:

| Control | Choices |
| --- | --- |
| Tension | Home, Near, Outside, Return |
| Space | Played, Rests, Empty bars |
| Density | Sparse, Fuller |
| Texture | Melody, Dyads, Triads, Melody with an inner voice |
| Motif | Statement, Transformation |
| Guitar and bass | Dialogue with the bass, Independent line |

Lock the bass before generating. For a new piece, use **New composition**, create the guitar and bass score, then **Import and lock**. That writes a new scratch file. It does not rewrite an imported source.

**Generate three candidates** with a hexatonic colour stores Dialogue, Liquid, and Sparse. The same seed repeats. Liquid writes with the shared triad-pair realisation. It does not call the older liquid-harmony planner. A note is a common tone only when both triads contain it.

**Generate** by itself remaps pitches into the colour. It does not run Dialogue, Liquid, or Sparse. The MusicXML comment records `strategy` as null for that path. The candidate buttons are the named strategies.

Compare the stored candidates. Refine makes a copy and leaves the original in the list. Export writes a new MusicXML file. The locked source stays where it is.

## Blind audition

On the Hexatonic page, **Blind audition** hides the pair name while you listen. A review can stay `UNDECIDED`, or move to YES / NO and KEEP / REFINE / REJECT. Saving a review does not admit the pair.

## Evaluation Dashboard

**Send to Evaluation Dashboard** opens **Evaluation** with the selected candidate. The banner stays provisional when the colour is provisional. Load the score to see technical findings. The dashboard does not write the source file and does not give an artistic score. Human review starts empty.

## Audio

Play and Replay start the shared playback engine. A running play button is not the same as someone hearing the sound. Say so when a person has not listened.

## What V1.0 still gets right

- Six harmonic worlds.
- Bass lock.
- Pentatonic colour, including all twenty collections on the Pentatonic page.
- Three candidates when no hexatonic colour is set, still labelled Candidate 1–3.
- Save and reopen.
- MuseScore 4 for opening the exported MusicXML.
- No candidate is artistically approved.
