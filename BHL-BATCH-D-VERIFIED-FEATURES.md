# BHL Batch D — verified features

Foundation inventory only. Not the Quick Start and not the Scenarios Handbook.

Every generated score is marked **CANDIDATE FOR AUDITION — NOT MUSICALLY APPROVED**. Nothing in this list was heard, played, or musically approved.

Examples live in `~/Downloads/BHL-Composer/Batch-D-Complete/`. The page is `#/bhl`.

## Riff pitch

- **Does:** Takes the interval contour from the existing riff generator (`generateRiffCoreMotif`) and uses it as the guitar cell.
- **Control:** `Riff pitch` → `Riff contour` (`#bhl-pitch-source`). Seed is the page seed.
- **Input:** A locked Wrong Turning span. Default audition span is bars 33–40.
- **Result:** Guitar pitches follow that contour. The generator’s internal `Cmaj7` is not written as a chord symbol.
- **Example:** `01-riff-pitch-original-rhythm.musicxml` and `01-riff-pitch-bhl-rhythm.musicxml` share the contour and differ in later attacks.
- **Limit:** The contour is one cell. `Original` states it once. Later bars stay silent unless `Continue` is chosen.
- **Handoff:** Direct into BHL. The Riff Engine does not import BHL MusicXML.

## Riff rhythm

- **Does:** Places real onsets, durations, and rests. Core cells come from `rhythmPattern`. The other-riff cell comes from `buildMultiBarRhythm` (sixteenth grid, medium, 4 bars, neutral). Syncopation uses `hasSyncopation`. Groups are contiguous notes. Phrase end is the varied last bar of a multi-bar cell.
- **Control:** `Riff rhythm` (`#bhl-rhythm-source`): `BHL rhythm`, `Same riff's rhythm`, `Another riff's rhythm`. `Rhythm seed` (`#bhl-rhythm-seed`) feeds the other-riff cell.
- **Input:** Locked span, metre taken from the bass bars, score divisions taken from the lock (Wrong Turning guitar divisions are 4).
- **Result:** When the source is a riff, those attacks replace the BHL rhythm menu. `01-riff-pitch-bhl-rhythm.musicxml` keeps playing after bar 33. `01-riff-pitch-original-rhythm.musicxml` does not.
- **Example:** `03-riff-a-pitch-engine-rhythm-seed-29.musicxml` — pitch seed 17. The rhythm is not a second corpus riff. `other-riff` calls `buildMultiBarRhythm` with engine seed 29. There is no riff id. Bar 33 durations are 8, 6, 2 divisions, which is not the core eighth cell. The earlier filename `03-riff-a-pitch-riff-b-rhythm` was renamed because “Riff B” named a corpus riff that does not exist.
- **Limit:** Accents and articulations are absent from the riff data and are not invented. A note finer than the division grid, or one that cannot cross the bar whole, is named and left out. It is not quantised. Leave-space, handoff, silence windows, and protected guitar bars beat the imported grid. Protected bass is never rewritten.
- **Handoff:** Direct.

## Rhythmic transformation

- **Control:** `Rhythmic transformation` (`#bhl-riff-transform`).
- **Original:** State the cell once.
- **Continue:** Repeat the cell. Onset plans are marked ostinato so a repeated grid is allowed.
- **Displace:** Shift by `Displacement in quarter-lengths` (`#bhl-displacement`, shown only for Displace). The cell grows. It is not cut to the bar. Example `07-cross-engine-handoff.musicxml` shifts 0.5 and moves the overflowing attack whole into bar 34.
- **Augment:** Double durations. The cell spills.
- **Diminish:** Halve durations. Values finer than the score divisions are withheld.
- **Fragment:** Keep the opening half and name the unused tail.
- **Insert a rest:** Split the last note of at least half a quarter into note plus rest. If no such note exists, the transform is reported unavailable.
- **Example:** `02-same-rhythm-world-A.musicxml` and `02-same-rhythm-world-E.musicxml` use Continue. Attacks differ from Original. Pitches differ between World A and World E (bar 34).
- **Handoff:** Direct.

## Guitar and bass dialogue

- **Does:** Counter-motion writes a second guitar voice. Leave-space keeps the last beat empty. Handoff shortens before the next bass attack. A protected guitar bar stays the source.
- **Control:** Existing region dialogue menu (`answer after bass`, `counter-motion`, `handoff before bass`, `leave space`) plus protected bars on the lock.
- **Example:** `04-riff-rhythm-dialogue.musicxml`. Bar 33 of guitar voice 1 is note-identical to the album, and those voice-1 note elements are byte-identical. Twenty-one notes sit in guitar voice 2, bars 34–40. The album has no voice 2 there. Voice 2 does not change the protected bar 33 pitches, durations, or onsets. `04-riff-rhythm-dialogue.pdf` and `.mscz` were written. PNG pages 1–6 were written in this closure. MuseScore exit for that PNG job was 0.
- **Limit:** Dialogue does not override a protected bar or a silence window.
- **Handoff:** Direct inside BHL.

## Pentatonic colour

- **Does:** Lists the 20 collections that already exist in `colourRegistry.ts`. Pitch classes come from `fieldFromResource` after the HOME-family offset.
- **Control:** Turn on `Use a pentatonic collection on the development`. Then `Collection` (`#bhl-archetype`), `Reference`, `Relationship`, `Contrasting collection` (`#bhl-contrast`). Pitch classes show on `#bhl-colour-pcs`.
- **Collections:** Major Pentatonic, Minor Pentatonic, Suspended Pentatonic `[0,2,5,7,10]`, Open Pentatonic `[0,2,5,7,9]`, Minor Sixth Pentatonic, Mixolydian Pentatonic `[0,2,4,7,10]`, Dorian Pentatonic, Aeolian Pentatonic, Kumoi, Hirajoshi, In Sen, Iwato, Phrygian Pentatonic, Lydian Pentatonic, Whole-Tone Pentachord, Blue Pentatonic, Ambiguous Third, Leading-Tone Major, Leading-Tone Minor, Remote Altered.
- **Relationships:** HOME 0, MAJOR −3, 6/9 SUSPENDED +2, MAJOR 7 COLOUR +4, SUSPENDED +7. These shift a collection. They are not extra collections.
- **Result:** World E uses the collection as the pitch source. Worlds A–D and F keep their fields and say which pitches are shared and which are left out. An empty intersection does not snap to major or minor.
- **Example:** `05-contrasting-pentatonic.musicxml` — World E, D Suspended Pentatonic, contrast Hirajoshi. Constraint text names pitch classes C D E G A and common tones D E A. `06-common-tone-transfer.musicxml` — imported motif 60 64 67 69, major C against mixolydian, common tones kept.
- **Limit:** Only Major and Minor are path archetypes. The Pentatonic page search still accepts only those two. Other colours are not rewritten as major or minor, and the page will say they cannot be opened there. A contrast with no development or transformation region is reported and not applied.
- **Handoff:** Direct into BHL. Not a new path-search integration.

## Harmonic field

- **Does:** Each region’s harmonic-field menu is the existing Tonality Vault choice. World B remains liquid harmony (`planLiquidHarmony`).
- **Control:** Region field menu, and the world selector.
- **Result:** After Generate, `Cross-engine transfer` lists the vault choice as direct and liquid harmony as direct on World B.
- **Limit:** No new vault object is imported. The menu choice is the transfer.
- **Handoff:** Direct.

## Cross-engine transfer

- **Control:** `Cross-engine transfer` (`data-testid="bhl-handoff"`). Generate fills the transfer readout.
- **Riff → BHL:** Direct. Pitch, rhythm, or both, as set above.
- **Pentatonic → BHL:** Direct. Collection, relationship, contrast, and the named constraint.
- **Tonality Vault → BHL:** Direct through the region field menu.
- **BHL → Performance Composer:** MusicXML file only. BHL reimports the file with the existing `loadScore` and reports bar count. Open Performance Composer, use Respond, and choose that file. There is no BHL object handoff.
- **Example:** `07-cross-engine-handoff.musicxml`. Notes record reimport true. `08-saved-integrated-project.bhl.json` stores world E, suspended D, contrast remote altered, riff pitch, riff rhythm, transform continue.
- **Not wired:** Riff Engine import of BHL. Pentatonic path search for the other 18 colours. Artist profiles. A rebuilt desktop app. This batch did not repackage the desktop app, so a previously installed app will not show these controls until a later rebuild.

## Save and reopen

- **Control:** Existing BHL project save and open.
- **Result:** `musical.riff` and `pentatonic.contrastId` round-trip in format `bhl-project` version 1. Opening a project writes those values back onto the controls.
- **Example:** `08-saved-integrated-project.bhl.json` and `integrated-project.bhl.json`.
- **Limit:** The live `#/bhl` click-through was not run in a browser in this pass. The API save/open test did run.

## What was checked

- MusicXML note events for bars 33–40, including durations and voice 2.
- MuseScore 4 rendered PNG pages for examples 01, 03, 05, and 07. Page 2 contains rehearsal B. Guitar under B differs across those renders. Bass and the systems after the span match the source layout. A live MuseScore window was not left open.
- PDF and MSCZ for 01 (both rhythms), 03, 04, 05, and 07. Files start with `%PDF-1.4` or are MSCZ archives. MuseScore then exited 134 on shutdown. The files were already written.
- Album SHA-256 unchanged: `01383c35b0eddc74442ba056cec297e36c045e130f6990865732fcac3aafcb48`.
- PDF and MSCZ for examples 02 and 06 were written in this closure. Every PDF in the folder has 6 pages. Every MSCZ passes `unzip -t` and contains its `.mscx`. MuseScore exited 134 after those files were already written. That is a shutdown crash.

## Known gaps (not fixed)

- The live `#/bhl` click-through was not run.
- The desktop app was not rebuilt.
- The pentatonic path page still accepts major and minor only.
