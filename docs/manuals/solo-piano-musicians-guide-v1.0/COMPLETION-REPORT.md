# Solo Piano Musician's Guide V1.0 — completion report

Status: technically verified draft. No commit. No push. No install. No engine, API, GUI or exporter change.

## Commit

`51e170692272643ecff7bcfb6ccd461767a2d731`

`HEAD` and `origin/main` matched. The Perplexity research, preserved in `research/`, inspected `824d99b2` and said General Piano was unavailable. That claim is outdated on this commit.

## Files created

Folder: `docs/manuals/solo-piano-musicians-guide-v1.0/`

- `COMPOSER-OS-SOLO-PIANO-MUSICIANS-GUIDE-V1.0.md` — editable source
- `Composer-OS-Solo-Piano-Musicians-Guide-V1.0.docx` — Word draft, 16 A4 pages
- `Composer-OS-Solo-Piano-Musicians-Guide-V1.0.pdf` — exported from that DOCX by Microsoft Word
- `examples/` — 18 MusicXML/MIDI pairs plus `evidence.json`
- `illustrations/` — three captures from the running Solo Piano page
- `CAPABILITY-AND-EVIDENCE-LEDGER.md`
- `MUSICAL-REVIEW-CHECKLIST.md`
- `research/Solo-Piano-Musicians-Guide-Research-and-Manual-Design-V1.0.md`
- `out/qa/page-01.png` through `page-16.png` — page inspection renders
- `build-examples.ts`, `build_docx.py`

## Features verified

Eight-bar study, Coffee Run — Variation, and General Piano Composition V1.

General Piano: 8, 16 and 24 bars; 4/4 only; integer tempo 48–120; C major or A minor; one accepted chord per bar; integer seed. Different seeds changed notes. A different progression changed pitches. Tempo 64 and 80 on the same miniature kept pitches and changed the grid from 90 seconds to 72. Right hand and left hand are separate voices. MusicXML and MIDI were written. Generate and Regenerate both send the current settings. Validation text and file paths appeared on the page.

Live Generate of General Piano, 8 bars, tempo 80, C major, seed 76018, opening chords `Cmaj7 Am7 Dm7 G7 Fmaj7 Em7 Cmaj7 Cmaj7` reported `ok · 8 bars · quarter = 80 · 24s · 50 sounding attacks · 0 pedal events` and **MusicXML oracle passed.** The written files matched the example pack by SHA-256.

The running window header still said `git 824d99b`. The controls and the file matched the newer source.

## Example settings

Study `76018` / `76019` / `76020`, inner on and `76018` inner off.

Coffee Run `76018` and `76019`, inner on, and `76018` inner off.

General Piano seeds `76018`, `76019`, `76020` at 8 bars, tempo 80, default C major boxes.

Same seed `76018` with `Fmaj7 G7 Em7 Am7 Dm7 G7 Cmaj7 Bbmaj7`.

A minor boxes `Am7 Dm7 E7 Am7 Fmaj7 Cmaj7 Am7 Am7`.

Length set `C Am F G` at 8, 16 and 24 bars, tempo 80.

Miniature `Am F Dm E7` × 6, 24 bars, tempo 64 and the same notes at tempo 80.

## Missing illustrations

Sibelius score plates: pending. Cubase piano roll: pending. No engraved grand staff was drawn. Pitch comparisons are lists taken from the MusicXML. The 90-second cue is a calculated table.

## Outstanding checks

Sibelius inspection, Cubase import, listening, and physical playing have not been done. The guide is not musically accepted.

**Open output folder** was visible and enabled after Generate. It was not clicked.

## Cross-module

No working automatic connection from Solo Piano to Song Mode, BHL Worlds A–F, Pentatonic, Hexatonic, Riff Generator, String Quartet, Big Band, ECM Chamber, composer profiles, Stage C or Stage D. Hexatonic, Riff Generator, ECM, profiles and Stage D blending are future only for a piano handoff. The others are partial or unverified. Sibelius and Cubase editing is manual work outside Composer OS.

## Side effect

The live API wrote, and Generate replaced, this existing output name:

`/Users/user/Documents/Mike Composer Files/Solo Piano/general-piano-v1-seed76018-8bars-80bpm.musicxml`

and the matching `.mid`. The bytes match the example pack.

## Git

HEAD unchanged. New files are untracked under `docs/manuals/solo-piano-musicians-guide-v1.0/`. Earlier unrelated untracked files were left in place. No commit. No push.

## PDF inspection

All 16 pages were rendered and read. Footer, tables and screenshots stay inside the page. Film-cue and troubleshooting cells wrap inside their borders. Screenshot crops are the captured windows, including a validation view that starts mid-panel. pypdf prints “wrong pointing object” warnings on the Word PDF; PDFKit still rendered all 16 pages.
