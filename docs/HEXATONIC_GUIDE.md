# Hexatonic Engine — guide

**Release check:** Hexatonic H5A, 2026-10-15  
**Registry:** `hexatonic-registry-h2.0`  
**Phrases:** `hexatonic-phrase-h3.0`  
**Projects:** `hexatonic-project` version 1  
**Workspace:** `#/hexatonic`  
**Definition lock:** `docs/HEXATONIC_PHASE_H1.md`  
**Phases:** `docs/HEXATONIC_PHASE_H2.md`, `docs/HEXATONIC_PHASE_H3.md`, `docs/HEXATONIC_PHASE_H4.md`

H5A checks the H1–H4 engine. It does not add a new generator, a new collection, or a new project version. Passing tests and a MuseScore page are technical checks. They are not a hearing, a physical play-through, or an artistic approval. `artisticApproval` stays false. `humanPlayability` stays `NOT VERIFIED`. BMEF text on the page is a description of the phrase. It is not a Black Aura BMEF score and it is not a GCE score.

## Collection catalogue

Eleven adopted scalar collections. Pitch classes are the C-centre form. A centre from 0 to 11 transposes the interval row. The page label is the name shown in `#/hexatonic`.

| Id | Page label | C-centre spelling | Pitch classes |
| --- | --- | --- | --- |
| `hex_western_claim_not_ritsu` | Western six-note claim | C Db Eb F Ab Bb | `0 1 3 5 8 10` |
| `hex_major_omit_seventh` | Major, omit seventh | C D E F G A | `0 2 4 5 7 9` |
| `hex_major_omit_fourth` | Major, omit fourth | C D E G A B | `0 2 4 7 9 11` |
| `hex_lydian_triad_pair` | Lydian triad pair | C D E F# G A | `0 2 4 6 7 9` |
| `hex_minor_primary` | Minor primary | C D Eb F G Bb | `0 2 3 5 7 10` |
| `hex_whole_tone_even` | Whole tone, even | C D E F# G# Bb | `0 2 4 6 8 10` |
| `hex_whole_tone_odd` | Whole tone, odd | C# D# F G A B | `1 3 5 7 9 11` |
| `hex_augmented_t0` | Augmented t0 | C Eb E G Ab B | `0 3 4 7 8 11` |
| `hex_augmented_t1` | Augmented t1 | C Db E F G# A | `0 1 4 5 8 9` |
| `hex_augmented_t2` | Augmented t2 | C# D F F# A Bb | `1 2 5 6 9 10` |
| `hex_augmented_t3` | Augmented t3 | D Eb F# G Bb B | `2 3 6 7 10 11` |

Whole-tone ids repeat every 2 semitones. Augmented ids repeat every 4 semitones. A further transposition lands on one of the listed ids.

Sixteen WPS resolution/tension pairs stay a separate family, `wps-resolution-tension`. Each pair keeps the id already stored in `WPS_VAULT_TONALITIES`: `maj7-sharp5`, `sus-b9`, `minmaj13-sharp11`, `maj7-sharp11-sharp9`, `sus9`, `min9`, `maj7`, `dim7-b13`, `13-sharp11`, `maj7-sharp11`, `minmaj9`, `min7b5`, `7-sharp9-sharp5`, `13b9`, `min11`, `maj9`. The page shows volume, parent symbol, Harris label, resolution triad, and tension triad. The parent symbol stays the stored C-root symbol. Transposition moves the pitch classes. It does not invent a new parent name.

`hex_major_omit_fourth` and WPS `maj9` share one pitch-class set and remain two objects. `hex_minor_primary` and WPS `min11` do the same. The scalar id has no parent chord. The WPS id keeps the parent, the two triads, and the provenance `WPS_VAULT_TONALITIES:<id>`.

## Traditional five-note Ritsu

Traditional Ritsu is five notes, C D F G A, pitch classes `0 2 5 7 9`. That row is the existing pentatonic colour `open_pentatonic`. H1 records the relationship. It does not add a Ritsu id to the pentatonic registries or to the hexatonic registry.

The six-note set C Db Eb F Ab Bb is `hex_western_claim_not_ritsu`. The page calls it “Western six-note claim”. The name Ritsu is refused for that set. A second label, “Phrygian hexatonic”, is also withheld. H1 keeps the pitch-class set and withholds both display names.

## H1 naming restrictions

These six-note spellings were documented and not adopted: `hex_minor_omit_second`, `hex_minor_dorian_omit_second`, `hex_blues`. `HEXATONIC_REFUSED_IDS` keeps them out of the registry.

`whole_tone_pentachord` stays the five-note pentatonic row `0 2 4 6 8`. The hexatonic whole-tone collections do not lengthen it.

BHL World A stays world `A`. `hex_lydian_triad_pair` reads the same pitch classes. It does not rename the world.

BHL World C stays a four-note field. The four augmented hexatonic ids are a different object.

`TONALITY_VAULT_DATABASE` and `triad-pair-pendulum` stay as they are. Quadratonic grips stay four notes. The pentatonic colour registry stays 20 resources.

## Triad-pair workflow

Choose one family. A phrase uses one scalar collection or one WPS pair, not both.

On a scalar collection, inside and return use the home collection. Outside uses the paired scalar in `docs/HEXATONIC_PHASE_H3.md`. Major omit-seventh and the Lydian triad pair also carry a constituent triad reading. Other scalars say so when they have no triad split.

On a WPS pair, inside is the resolution triad. Outside is the tension triad of the same pair. Return comes back to the resolution triad. The tension triad is not a new key. Bass holds the parent root, or a shell tone that sits outside the union on volumes 2 (`sus-b9`), 3 (`minmaj13-sharp11`), 9 (`13-sharp11`), and 14 (`13b9`). Guitar does not take those shell tones.

## Inside, outside, return

`generateHexatonicPhrase` writes six 4/4 bars: inside, inside, outside, outside, return, return. Tempo mark is quarter = 92. Guitar is electric guitar. Bass is upright bass.

The cell is two to four notes. Later bars fragment it, shift it by an eighth, restate it, and change register. Rests are written. Guitar simultaneities are dyads or triads inside a four-fret span. A six-note chord is refused.

`M-DEG` and `M-NEAR` are the existing motif maps. A six-note or three-note row is passed as `orderedPitchClasses`. Five-note callers omit that field, so the pentatonic path is unchanged. Return uses `M-DEG` when the two collections share pitch classes, and `M-NEAR` when they do not. The requested method is still the development method stored on the phrase.

Bars 1, 3, and 5 carry the words INSIDE, OUTSIDE, and RETURN. The collection ids, centre, and source sit above bar 1. Bar 6 does not carry that long line.

## Project save and open

Format `hexatonic-project`, version 1. Files end in `.hexatonic.json` under `Hexatonic Projects` in the Composer OS files root. A project stores the selection, the original registry identity, the seed, the transformation, the six-bar structure, the guitar and bass events, the MusicXML, and the technical diagnostics.

Open returns that phrase. It does not call `generateHexatonicPhrase` again. An existing file stays in place unless replace is requested. A path outside Hexatonic Projects is refused. A `.pentatonic.json` or `.bhl.json` path is refused. Pentatonic and BHL validators still refuse `hexatonic-project`.

## Desktop MusicXML export

In the desktop app, Export MusicXML uses `composer-os-api:hexatonic-write-musicxml`. The file is written under `Documents/Composer OS Exports/Hexatonic Engine`. The write flag is `wx`, so an existing file is not replaced. The page shows the path that was written. Open in MuseScore 4 uses `composer-os-api:hexatonic-open-musescore` on that path.

A browser session downloads the file. A failed desktop write does not fall back to a download.

The MusicXML is standard notation. It has no TAB staff and no chord symbols. Guitar and bass are separate parts.

## Notation check recorded at H5A

MuseScore 4.7.5 imported three generated files and wrote one PNG page each:

- scalar `hex_major_omit_seventh`, centre C, seed 4, `M-DEG`
- WPS `maj9`, centre C, seed 4, `M-NEAR`
- scalar `hex_whole_tone_even`, centre F#, seed 11, `M-DEG`

Each page shows the title, quarter = 92, two staves, INSIDE / OUTSIDE / RETURN, the collection lines above bar 1, six bars, and bar 6 on the same page. Guitar and bass stay on their own staves. No TAB. Score metadata reports no chord symbols. No collision was found that required a source change. The MuseScore process on this Mac is under Rosetta and can exit with `mutex lock failed` after the page is written. That exit is a host-process failure. The PNG is the inspection. The music was not played.

## Known limitations

- Phrases are six bars. There is no song form, lyric, or arrangement pass.
- Technical membership, determinism, and MusicXML structure can pass while the phrase is still unapproved as music.
- Playability on a guitar or bass has not been verified by a player.
- The western six-note claim must not be labelled Ritsu.
- Shared pitch-class sets stay separate objects. Do not collapse `maj9` into `hex_major_omit_fourth`, or `min11` into `hex_minor_primary`.
- Shell tones outside a WPS union belong to the bass parent grip. They are not a third triad.
- Desktop export always uses the Documents export folder. It does not follow an alternate output root.
- H5A does not start a later hexatonic phase.
