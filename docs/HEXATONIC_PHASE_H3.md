# Hexatonic Phase H3 — Phrase generation and MusicXML

**Version:** `hexatonic-phrase-h3.0`  
**Date:** 2026-10-15  
**Registry:** `hexatonic-registry-h2.0` in `engines/composer-os-v2/core/hexatonic/`  
**Definition:** `docs/HEXATONIC_PHASE_H1.md`

H3 writes guitar and upright-bass phrases from the H2 catalogue. It does not add a second composition application, a GUI, a project file, or a desktop channel. The 20-colour pentatonic registry is unchanged. `mapMotifPitches` still reads that registry unless the caller passes `orderedPitchClasses`.

## Generation

`generateHexatonicPhrase` covers the 11 adopted scalar collections and the 16 WPS resolution/tension pairs, at centres 0–11. A phrase is six 4/4 bars: inside, inside, outside, outside, return, return. The cell is two to four notes. Later bars fragment it, shift it by an eighth, restate it, and change register. Rests are written. Guitar simultaneities are dyads or triads inside a four-fret span. Six-note chords are refused.

Scalar outside targets:

| Home | Outside |
| --- | --- |
| `hex_western_claim_not_ritsu` | `hex_major_omit_seventh` |
| `hex_major_omit_seventh` | `hex_western_claim_not_ritsu` |
| `hex_major_omit_fourth` | `hex_western_claim_not_ritsu` |
| `hex_lydian_triad_pair` | `hex_whole_tone_even` |
| `hex_minor_primary` | `hex_western_claim_not_ritsu` |
| `hex_whole_tone_even` | `hex_whole_tone_odd` |
| `hex_whole_tone_odd` | `hex_whole_tone_even` |
| `hex_augmented_t0` … `t2` | the next augmented id |
| `hex_augmented_t3` | `hex_augmented_t0` |

WPS inside is the resolution triad. WPS outside is the tension triad. The parent symbol stays the stored C-root symbol. Bass holds that parent root, or a shell tone that sits outside the union on volumes 2, 3, 9, and 14. The tension triad is not a new key.

`M-DEG` and `M-NEAR` are the existing motif maps. A six-note or three-note row is passed as `orderedPitchClasses`. Five-note callers omit that field. Return uses `M-DEG` when the two collections share pitch classes, and `M-NEAR` when they do not. The last return note moves by an octave inside the guitar range.

## MusicXML

`hexatonicPhraseToMusicXml` writes standard notation through `exportScoreModelToMusicXml`. No TAB. No chord symbols. Bars 1, 3, and 5 carry the words INSIDE, OUTSIDE, and RETURN. Bar 6 carries the collection ids, centre, and source line.

Representative files:

- `engines/composer-os-v2/core/hexatonic/examples/h3-scalar-major-omit-seventh.musicxml`
- `engines/composer-os-v2/core/hexatonic/examples/h3-wps-maj9.musicxml`

## Diagnostics

`phrase.bmef` records motif recurrence, density, length, register, membership, displacement, return evidence, and guitar constraints. `artisticApproval` is false. `humanPlayability` is `NOT VERIFIED`. There is no Black Aura BMEF score.

## Tests

`engines/composer-os-v2/tests/hexatonicH3.test.ts`

H2, H1, pentatonic Dev 5B.1, and WPS V1.1–V1.5 checks stay in their own files.

## Out of scope

GUI, desktop IPC, hexatonic project persistence, packaging, Windows, WWH score edits, and Phase H4.
