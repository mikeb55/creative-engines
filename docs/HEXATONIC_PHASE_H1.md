# Hexatonic Phase H1 — Definition Lock

**Version:** `hexatonic-h1.0`  
**Date:** 2026-10-15  
**Baseline commit:** `75973f5e6c857adf4047ce666a1b07c9bae55e13`  
**Status:** definition lock and regression baseline. No generator, no sibling module, no change to pentatonic registries, BHL Worlds A–F, project files, or installed applications.

This document is original Composer OS analysis. It records pitch-class sets, identifiers, and decisions. It does not reproduce the Tonality Vault manual.

## 1. Sources

| Source | Location | Use in H1 |
| --- | --- | --- |
| Jordan Klemons, *Complete Tonality Vault Vols 1–16* (2025), DOCX | `reference-materials/tonality-vault/COMPLETE TONALITY VAULT VOLS 1-16 - 2025.docx` | Local copy. SHA-256 `cf0ebf45a5219227d8dc48ae0e14b7b22ba1aeb82034a95ebc0fc3d49e4306f5`. Same hash as the Downloads original recorded in `docs/WPS_TONALITY_VAULT_16_VOLUME_STUDY.md`. Gitignored. |
| Same title, PDF | `/Users/user/Downloads/COMPLETE TONALITY VAULT VOLS 1-16 - 2025.pdf` | Page companion. Not re-transcribed. |
| WPS 16-volume study | `docs/WPS_TONALITY_VAULT_16_VOLUME_STUDY.md` | Prior pitch-fact study. H1 compares it with the records below. |
| WPS records | `engines/composer-os-v2/core/wwh/wps/wpsTonalityVaultRecord.ts` — `WPS_VAULT_TONALITIES` | Authoritative stored pair identities for regression. |
| Older vault table | `engines/composer-os-v2/core/harmony/tonalityVaultDatabase.ts` — `TONALITY_VAULT_DATABASE` | Separate 17-row table. Quadratonic vault riffs read this table. |
| Modal palette note | `palettes/tonality_vault.md` | Short modal list. It does not define the 16 volumes or any hexatonic set. |

`All_Chords_in_Tonality_Vault.docx` was not found under the repository, Downloads, Documents, Desktop, or Spotlight. H1 does not invent its contents.

A text scan of the 16-volume DOCX finds the volume method (bebop scale, quadratonic, resolution, tension triad, triad pair) and finds none of these words: Ritsu, hexatonic, whole tone, Prometheus, augmented hexatonic. The manual’s six-note object is the bebop scale built from a resolution triad and its three passing tones. That object is the WPS pair union in section 4. It is not a catalogue of scalar hexatonic families.

## 2. Naming decisions

| Topic | Decision |
| --- | --- |
| Traditional Ritsu | Five notes, C D F G A, pitch classes `0 2 5 7 9`. Same interval row as existing `open_pentatonic`. H1 records the relationship. It does not add a Ritsu id to either pentatonic registry. |
| Western six-note claim | C Db Eb F Ab Bb, pitch classes `0 1 3 5 8 10`. Stable id `hex_western_claim_not_ritsu`. The name Ritsu is refused for this set. Some Western scale lists use that name; the gagaku five-note collection and the vault manual do not. A second label, “Phrygian hexatonic,” is also disputed, because this set is Phrygian with the fifth omitted and other Phrygian omissions exist. H1 keeps the set and withholds both display names. |
| Major hexatonic, omit seventh | Adopted scalar id `hex_major_omit_seventh`. |
| Major hexatonic, omit fourth | Adopted scalar id `hex_major_omit_fourth`. Same C-centre pitch classes as the volume 16 pair union. Different musical object. See section 4. |
| Lydian triad pair | Adopted scalar id `hex_lydian_triad_pair`. Same C-root pitch classes and triad split as BHL World A. World A stays the BHL world. H1 does not rename it. |
| Minor hexatonic | Primary adopted id `hex_minor_primary` = C D Eb F G Bb. Competing omissions are listed and not adopted. |
| Whole tone | Two ids, `hex_whole_tone_even` and `hex_whole_tone_odd`. Distinct from pentatonic `whole_tone_pentachord` (`0 2 4 6 8`). |
| Augmented hexatonic | Four ids, `hex_augmented_t0` through `hex_augmented_t3`. Distinct from BHL World C, whose field has four pitch classes. |
| WPS pairs | Ids stay the existing record ids (`maj7-sharp5` … `maj9`). A future sibling registry may prefix them. H1 does not create that module. |
| Volumes 5 and 8 tension quality | The 16-volume study records that the printed tension quality is absent. `WPS_VAULT_TONALITIES` already stores major for both. H1 locks the stored record. It does not reopen the book. |
| Volumes 3 and 12 | `layerTwoAgreesWithPairPage` is false. The pair-page triads in the record are the pair. The layer-two sentence is not a second catalogue entry. |
| Volume 3 tension fifth | The record spells D#. One manual sentence also prints that augmented fifth as Eb. Same pitch class `3`. The stored spelling stays D#. |
| Volume 10 under-note | `topDownUnderNote` is null. H1 leaves it null. |
| Overlap rule | A strict six-note triad pair has two triads, six distinct pitch classes, and an empty intersection. Overlapping pairs stay out of that category. |

## 3. Scalar catalogue

Pitch classes are integers modulo 12. Reference spelling is the C-centre form. Transposition of a scalar id keeps the interval row and changes the centre. Whole-tone and augmented ids below are the distinct transpositional sets, so a further transposition lands on one of the listed ids.

| Id | Status | C-centre spelling | Pitch classes | Notes |
| --- | --- | --- | --- | --- |
| `ritsu_as_open_pentatonic` | relationship only | C D F G A | `0 2 5 7 9` | Five notes. Equals `open_pentatonic`. Not a hexatonic. |
| `hex_western_claim_not_ritsu` | defined, disputed name | C Db Eb F Ab Bb | `0 1 3 5 8 10` | Six notes. Not Ritsu. Not in the vault manual. |
| `hex_major_omit_seventh` | defined | C D E F G A | `0 2 4 5 7 9` | Ionian without 7. Disjoint reading: C major `0 4 7` and D minor `2 5 9`. |
| `hex_major_omit_fourth` | defined | C D E G A B | `0 2 4 7 9 11` | Ionian without 4. Same pitch classes as WPS `maj9` at a C root. The scalar id has no parent chord and no resolution role. |
| `hex_lydian_triad_pair` | defined | C D E F# G A | `0 2 4 6 7 9` | Disjoint major triads C `0 4 7` and D `2 6 9`. Same field as BHL World A at root 0. |
| `hex_minor_primary` | defined, primary minor | C D Eb F G Bb | `0 2 3 5 7 10` | Dorian without 6, and Aeolian without b6. Minor pentatonic plus 2. |
| `hex_minor_omit_second` | documented, not adopted | C Eb F G Ab Bb | `0 3 5 7 8 10` | Natural minor without 2. |
| `hex_minor_dorian_omit_second` | documented, not adopted | C Eb F G A Bb | `0 3 5 7 9 10` | Dorian without 2. |
| `hex_blues` | documented, not adopted | C Eb F Gb G Bb | `0 3 5 6 7 10` | Often called a blues scale. Not the primary minor hexatonic. |
| `hex_whole_tone_even` | defined | C D E F# G# Bb | `0 2 4 6 8 10` | One of two whole-tone sets. |
| `hex_whole_tone_odd` | defined | C# D# F G A B | `1 3 5 7 9 11` | The other whole-tone set. |
| `hex_augmented_t0` | defined | C Eb E G Ab B | `0 3 4 7 8 11` | Augmented scale. Invariant under transposition by 4. |
| `hex_augmented_t1` | defined | C Db E F G# A | `0 1 4 5 8 9` | Transpose `hex_augmented_t0` by 1. |
| `hex_augmented_t2` | defined | C# D F F# A Bb | `1 2 5 6 9 10` | Transpose `hex_augmented_t0` by 2. |
| `hex_augmented_t3` | defined | D Eb F# G Bb B | `2 3 6 7 10 11` | Transpose `hex_augmented_t0` by 3. Transposition by 4 returns `hex_augmented_t0`. |

`whole_tone_pentachord` remains the five-note row `0 2 4 6 8`. H1 does not lengthen it.

## 4. Six-note triad-pair inventory

### 4.1 BHL World A

World A at root pitch class 0:

| Triad | Quality | Pitch classes |
| --- | --- | --- |
| Lower | major | `0 4 7` |
| Upper, root plus 2 | major | `2 6 9` |
| Union | strict six | `0 2 4 6 7 9` |

Intersection is empty. This is `hex_lydian_triad_pair`. The world id stays `A`.

### 4.2 The 16 WPS resolution / tension pairs

Parent is the C-root tonality. Resolution is the melodic triad. Tension is the passing-tone triad. Union is the strict six-note set. Shell is the left-hand grip and is not the second triad. Every pair below has an empty triad intersection and six distinct pitch classes.

Shell pitch classes outside the pair, locked from the current records:

| Volume | Id | Shell pitch outside the union |
| --- | --- | --- |
| 2 | `sus-b9` | `11` (B) |
| 3 | `minmaj13-sharp11` | `0` (C) |
| 9 | `13-sharp11` | `0` (C) |
| 14 | `13b9` | `0` (C) |

The other twelve shells sit inside the pair union. A future writer uses the pair for the hexatonic exchange and keeps the shell as the parent grip.

| Vol | Id | Parent | Harris | Resolution | Tension | Union |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `maj7-sharp5` | Cmaj7#5 | T3 | E major E G# B | F# diminished F# A C | `0 4 6 8 9 11` |
| 2 | `sus-b9` | Csusb9 | tb7 | Bb minor Bb Db F | C minor C Eb G | `0 1 3 5 7 10` |
| 3 | `minmaj13-sharp11` | CminMaj13#11(9) | T2 | D major D F# A | G augmented G B D# | `2 3 6 7 9 11` |
| 4 | `maj7-sharp11-sharp9` | Cmaj7#11#9 | T7 | B major B D# F# | C major C E G | `0 3 4 6 7 11` |
| 5 | `sus9` | Csus9 | Tb7 | Bb major Bb D F | C major C E G | `0 2 4 5 7 10` |
| 6 | `min9` | Cmin9 | t5 | G minor G Bb D | A diminished A C Eb | `0 2 3 7 9 10` |
| 7 | `maj7` | Cmaj7 | t3 | E minor E G B | F major F A C | `0 4 5 7 9 11` |
| 8 | `dim7-b13` | Cdim7b13 | Tb6 | Ab major Ab C Eb | D major D F# A | `0 2 3 6 8 9` |
| 9 | `13-sharp11` | C13#11(9) | T2 | D major D F# A | E diminished E G Bb | `2 4 6 7 9 10` |
| 10 | `maj7-sharp11` | Cmaj7#11 | t3 | E minor E G B | F# diminished F# A C | `0 4 6 7 9 11` |
| 11 | `minmaj9` | CminMaj9 | T5 | G major G B D | A diminished A C Eb | `0 2 3 7 9 11` |
| 12 | `min7b5` | Cmin7b5 | tb3 | Eb minor Eb Gb Bb | F minor F Ab C | `0 3 5 6 8 10` |
| 13 | `7-sharp9-sharp5` | C7#9#5 | Tb6 | Ab major Ab C Eb | Bb diminished Bb Db Fb | `0 1 3 4 8 10` |
| 14 | `13b9` | C13b9 | T6 | A major A C# E | Eb major Eb G Bb | `1 3 4 7 9 10` |
| 15 | `min11` | Cmin11(9) | Tb7 | Bb major Bb D F | C minor C Eb G | `0 2 3 5 7 10` |
| 16 | `maj9` | Cmaj9 | T5 | G major G B D | A minor A C E | `0 2 4 7 9 11` |

Volume 16’s union equals `hex_major_omit_fourth`. The WPS object remains parent `maj9`, resolution G major, tension A minor. The scalar object remains an ionian collection with the fourth omitted. H1 stores both ids.

Volumes 1 and 10 share the tension triad F# diminished and use different resolution triads (E major, E minor). Their unions differ (`8` versus `7`).

`TONALITY_VAULT_DATABASE` is a different table. It has 17 rows, including `Maj6`, which is absent from `WPS_VAULT_TONALITIES`. Its `Maj7` melodic triad is stored as major. The WPS `maj7` melodic triad is E minor. Quadratonic primary sets in both tables have four notes. They are not hexatonic catalogue entries.

### 4.3 Excluded from the strict six-note category

| Existing field | Why it stays out |
| --- | --- |
| BHL World B at root 0, tension `primary` | Four pitch classes `0 1 5 8`, chord type `sus-b9` from the older vault table via `planLiquidHarmony`. A quadratonic. |
| BHL World C at root 0 | Four pitch classes `0 4 7 8`. Major and augmented triads on the same root share `0` and `4`. |
| BHL World D at root 0 | Five pitch classes `0 3 4 6 7`. Major and diminished triads on the same root share `0`. |
| BHL World E at root 0 | Five pitch classes `0 2 4 7 9`. Major pentatonic. |
| BHL World F at root 0 | Seven pitch classes `0 1 3 4 6 7 10`. Three major triads. The minor-third pair `0 4 7` with `3 7 10` shares `7` and has five notes. |
| World F tritone component `0 4 7` with `6 10 1` | Six notes and an empty intersection. It remains one group inside World F. H1 does not give it a sibling id and does not split the world. |
| Every WPS primary quadratonic | Four notes. Liquid harmony inside one chord. Not a triad-pair hexatonic. |
| `triad-pair-pendulum` | Existing vault-riff style. On `Maj7`, root 0, one bar, it alternates pitch classes `4` and `11`. That motion comes from `TONALITY_VAULT_DATABASE` through `selectQuadratonicMelodySpec`. It does not play the WPS `maj7` pair E minor / F major. |

## 5. Musical design for a later phase

These strategies are specification only. H1 implements none of them.

The duo is guitar and upright bass. The bass keeps the parent root, or the shell tone the guitar left out. The guitar plays inside one six-note collection for a span. A span is one collection, one pair, or one scalar hexatonic. Device changes happen between spans.

**Triad-to-triad motif exchange.** A motif states one triad as an arpeggio or a broken shape. The answering motif uses the other triad of the same pair. On a strict pair the two shapes share no pitch class, so the answer is a real exchange. On World A the exchange is C major against D major. On a WPS pair the exchange is resolution against tension, and the bass root stays the parent, so the tension triad does not become a new key.

**Two-to-four-note fragments.** A phrase uses two, three, or four notes of the six. A six-note run is outside this design. The fragment still belongs to one collection. Pentatonic phrase rules that already forbid a five-note run stay on the five-note engine.

**Dyad and triad writing.** Guitar states a dyad (two notes of one triad) or a full triad. The next grip is a dyad or triad from the other side of the pair, or a return to the first. One grip family lasts for the span. Block chords of all six notes are a piano picture. The guitar keeps two or three notes.

**Common-tone retention.** When a pair shares a pitch class, that pitch can hold while the other voices move. World A and the 16 WPS pairs share nothing between the two triads, so this device does not apply inside those exchanges. It applies to the excluded overlapping fields (World C’s shared major third, World D’s shared root, World F’s minor-third pair and its shared fifth) and to motion inside one quadratonic. H1 does not move those overlapping fields into the strict list in order to gain a common tone.

**Nearest-tone movement when the pair is disjoint.** Each moving voice goes to the nearest pitch class in the other triad. Distance is the smaller of the two semitone directions. The three voices need not move in parallel. A voice may leap when the nearest tone would collide with another voice. The bass does not take one of those voice motions.

**Inside / outside / return.** Inside is the resolution triad, or the scalar hexatonic treated as home. Outside is the tension triad, the other whole-tone set, or `hex_western_claim_not_ritsu` against a diatonic home. Return is the resolution triad or the home hexatonic again, in the same span or the next one. A WPS tension triad is outside colour on the parent chord. It is not a modulation. Chaos triads in volumes 14 and 15 stay a later rung and are not the default outside.

**Register changes.** The same pitch classes may move by an octave. Guitar keeps the shift inside a four-fret reach when the notes are simultaneous. A registral jump of one triad tone, as volume 16 already describes for a piano inversion, is the same triad. Silence in one register with the notes resuming in another is a register change, not a new collection.

**Rhythmic transformations.** The same fragment may be augmented, diminished, or displaced by an eighth. The bebop picture in the vault method puts triad tones on strong eighths and passing tones on weak eighths. That placement is one rhythmic reading of a WPS pair. A later phase may also state the triad as quarters or as a held dyad. The pitch-class set stays fixed while the rhythm changes.

**Silence.** A rest is part of the phrase. The bass may be the only harmony during a guitar rest. Neither part fills the other part’s rest. A silent bar does not license a new collection on the next attack.

**Guitar and upright-bass interaction.**

- Bass on the parent root: guitar plays one triad, a dyad from it, or the exchange into the other triad.
- Bass on a shell tone that sits outside the pair (volumes 2, 3, 9, and 14): that pitch stays a bass pitch. The guitar hexatonic does not have to absorb it.
- Bass holding: guitar moves, by nearest tone or by triad exchange.
- Bass moving: guitar holds a dyad or rests.
- One pair of triads for the span. The parent symbol on the leadsheet does not change when the guitar exchanges triads.
- Playability of a six-note piano grip is not assumed. Two or three guitar notes are the written surface.

## 6. Architecture

Audited recommendation, confirmed for a later phase:

**A sibling six-note collection registry that calls the musical utilities Composer OS already has.**

Those utilities include `pitchClassOf` and `spellName` in `wpsTonalityVaultRecord.ts`, and the pentatonic pitch helpers (`mod12`, canonical pitch-class sets) for interval rows. The sibling reads `WPS_VAULT_TONALITIES` and `buildBhlWorldField` when it needs an existing pair. It does not copy their tables into a second source of truth.

H1 does not create the module. Later work also does not:

- create a separate application
- insert six-note sets into `PENTATONIC_ARCHETYPES` or `PENTATONIC_COLOUR_RESOURCES`
- change BHL Worlds A–F or `buildBhlWorldField`
- change `pentatonic-project` version 1
- change installed Mac or Windows applications
- treat `TONALITY_VAULT_DATABASE` as the 16-volume pair list
- retarget `triad-pair-pendulum` onto the WPS pairs

Pentatonic parent extraction stays a five-note operation. `fieldFromPitchClasses` accepts five pitch classes. A six-note parent may yield five-note subset fields. It does not become a hexatonic registry entry.

## 7. Regression contract

`engines/composer-os-v2/tests/hexatonicH1Regression.test.ts` freezes the behaviour this document depends on. A failure there means an existing collection, world, pair, project format, or pendulum style moved. H1 does not authorise an algorithm edit to clear that failure.

## 8. Out of scope

Phase H2 and any generator, MusicXML, WWH score, desktop build, or installer.
