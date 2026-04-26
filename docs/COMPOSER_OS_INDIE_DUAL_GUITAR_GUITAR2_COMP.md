# Indie Art Pop + separate tunings — Electric Guitar 2 (chordal comp) part spec

This note describes how **Electric Guitar 2** (`guitar_2` in the score model) is intended to behave in the **Indie Art Pop** style with **separate** alternate tunings (dual clean electrics, no upright bass in that product path).

## Role

- **Chordal comp only** — it is not a second lead line; it does **not** double the main melody pitch in the comp stacks.
- **Readability** comes from **where** it attacks (mostly strong beats and structural pick-ups to a new harmony), not from shrinking every chord to a minimal two-note shell.

## Rhythm / density

- **Attacks** are mostly on **downbeats and structural anchors** (e.g. whole beats in 4/4, and the first note after a **new chord** at a barline when the line needs a push).
- **“Key upbeats”** (e.g. the “and” of 2) can appear when the form or phrase pattern calls for them; the main lever for “less busy” is **fewer strums per bar**, not only the note-count of each voicing.

## Voicing (2–4 notes per strum)

- Each comp hit is a **real guitar chord** in range: **2–4** chord tones, up to a hard cap of **4** simultaneous pitches per `ChordEvent`.
- **Lighter** bars / anchors tend toward **2–3** notes; **section starts**, first bar, or **large** harmonic moves (e.g. a big root jump vs. the previous bar) can use **3–4** notes.
- Priority is **guide-tone / shell first** (3rd, 7th, 5th, root as available in register), then **color** (9th, 13th) when a fourth note is needed — still **no** lead doubling.

## Interaction with the balanced voice-role pass

When a measure already has a **voice-2 `ChordEvent`** from this comp pass, the engine **does not** add the extra **single-note** fill that `applyVoiceRole` would place on unoccupied weak beats. That **does not** delete or shorten the comp chord; it only suppresses a **second layer** of one-off harmony notes on top of the strum.

## See also

- In-code documentation on `forceChordalElectricGuitar2VoicingsForIndieRoute` in `engines/composer-os-v2/core/goldenPath/generateGoldenPathDuoScore.ts`
- General harmony / lead-sheet context: [COMPOSER_OS_USER_GUIDE_MUSICXML_AND_HARMONY.md](COMPOSER_OS_USER_GUIDE_MUSICXML_AND_HARMONY.md)
