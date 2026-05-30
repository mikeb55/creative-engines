# Tritonic Big Band Cookbook

**Composer OS v1.3.0** — scenario recipes for tritonic cell realisation (`bb` · `sq` · `ecm` modes), Wayne behaviour knobs, and named chord progressions. Each scenario maps a musical goal to engine settings plus a bar-by-bar harmony plan.

**Cell families:** `quartal` · `cluster` · `suspended` · `shorter_floating` · `bergonzi`

**Realisation modes:** `bb` (dense, high oddity floor 0.65) · `sq` (smooth, oddity cap 0.25) · `ecm` (suspended/shorter_floating bias, forced `delayedResolution`)

---

## Scenario 1 — Slow Blues in Bb (Freddie Green)

**Style:** Classic slow blues; Freddie Green comp on beats 2+4; shell voicings under tritonic cells floating in upper register.

**Engine:** bb | sparse | shell_voicing | medium | pentatonic

**Behaviour:** oddityScore 0.55 | delayedResolution false | melodyPriority false

**Key:** Bb **Tempo:** 72 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Bb7 | I — tritonic bergonzi cell on guide tones |
| 2 | Bb7 | pedal; suspended cell drift |
| 3 | Eb7 | IV — quartal colour |
| 4 | Eb7 | IV hold |
| 5 | Bb7 | return I |
| 6 | Bb7 | turnaround setup |
| 7 | F7 | V — cluster tension peak |
| 8 | Bb7 | cadence |

**Cell families:** bergonzi, suspended, quartal

**Musical notes:** Slow blues lets tritonic cells hover above Freddie Green shells without fighting harmonic rhythm. Beat-2/4 comping leaves space for three-note cell voice-leading to breathe bar to bar.

---

## Scenario 2 — Minor Blues in C (ECM Sparse)

**Style:** ECM chamber minor blues; sparse voicing; cluster + suspended families; no aggressive resolution.

**Engine:** ecm | sparse | open | medium | chromatic

**Behaviour:** oddityScore 0.45 | delayedResolution true | melodyPriority false

**Key:** C minor **Tempo:** 88 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Cm9 | i — suspended cell |
| 2 | Cm9 | pedal |
| 3 | Fm9 | iv — cluster semitone colour |
| 4 | Fm9 | iv hold |
| 5 | Cm9 | return i |
| 6 | Abmaj7 | bVI — shorter_floating lift |
| 7 | G7alt | V — cluster peak |
| 8 | Cm9 | soft landing |

**Cell families:** cluster, suspended, shorter_floating

**Musical notes:** ECM mode forces delayed resolution so the minor blues never fully cadences. Cluster cells add Nordic grit without breaking the sparse texture.

---

## Scenario 3 — Big Band Blues Shout in F

**Style:** Dense BB shout chorus; all-beats comping; high oddity; full section energy.

**Engine:** bb | dense | full_chord | hard | chromatic

**Behaviour:** oddityScore 0.92 | delayedResolution false | melodyPriority false

**Key:** F **Tempo:** 168 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | F7 | I shout |
| 2 | Bb7 | IV punch |
| 3 | F7 | I return |
| 4 | C7 | V drive |
| 5 | F7 | I |
| 6 | D7 | tritone sub colour |
| 7 | Gm7 | ii setup |
| 8 | C7 | V → I shout tag |

**Cell families:** bergonzi, cluster, quartal

**Musical notes:** BB mode raises oddity floor to 0.65+; pairing with 0.92 oddityScore yields maximum cell dissonance. All-beats pattern keeps the shout chorus driving while tritonic voice-leading supplies chromatic upper-structure motion.

---

## Scenario 4 — Simple ii–V–I in C Major

**Style:** Straight-ahead jazz; easy difficulty; pentatonic pattern; close voicing.

**Engine:** sq | resonant | close | easy | pentatonic

**Behaviour:** oddityScore 0.15 | delayedResolution false | melodyPriority false

**Key:** C **Tempo:** 120 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Dm7 | ii |
| 2 | G7 | V |
| 3 | Cmaj7 | I |
| 4 | Cmaj7 | extension |

**Cell families:** bergonzi, shorter_floating

**Musical notes:** SQ mode caps oddity at 0.25 for smooth voice-leading through the canonical ii–V–I. Pentatonic pattern type keeps cell choices diatonic-friendly; ideal teaching scenario.

---

## Scenario 5 — Advanced ii–V–I with Tritone Sub

**Style:** Tritone substitution on V; chromatic pattern; medium difficulty.

**Engine:** bb | medium | mixed | medium | chromatic

**Behaviour:** oddityScore 0.55 | delayedResolution false | melodyPriority false

**Key:** C **Tempo:** 140 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Dm7 | ii |
| 2 | Db7 | tritone sub for G7 |
| 3 | Cmaj7 | I |
| 4 | Cmaj7 | tag |

**Cell families:** bergonzi, cluster, quartal

**Musical notes:** Chromatic pattern type plus tritone sub harmony doubles the chromatic tension. BB mode favours higher-tension cell starts so the Db7 bar gets cluster or bergonzi colour.

---

## Scenario 6 — Descending ii–V–I Chain

**Style:** Cycle of fifths descent; whole-tone pattern; hard difficulty.

**Engine:** bb | dense | open | hard | whole_tone

**Behaviour:** oddityScore 0.70 | delayedResolution false | melodyPriority false

**Key:** C **Tempo:** 160 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Cm7 | ii of Bb |
| 2 | F7 | V of Bb |
| 3 | Bbmaj7 | I |
| 4 | Ebmaj7 | IV / new tonic |
| 5 | Abmaj7 | bVII colour |
| 6 | Abmaj7 | hold |
| 7 | Dbmaj7 | remote centre |
| 8 | G7 | turnaround V |

**Cell families:** bergonzi, quartal, shorter_floating

**Musical notes:** Whole-tone pattern type aligns with the major-third jumps implicit in extended cycle-of-fifth chains. Hard difficulty widens leap tolerance in voice-leading candidates.

---

## Scenario 7 — Coltrane Changes

**Style:** Giant Steps cycle E–Ab–B–D; bergonzi cells; high oddity; delayed resolution.

**Engine:** bb | dense | mixed | hard | chromatic

**Behaviour:** oddityScore 0.88 | delayedResolution true | melodyPriority false

**Key:** E **Tempo:** 280 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Em7 | ii of D |
| 2 | B7 | V of E |
| 3 | Emaj7 | I |
| 4 | Abmaj7 | major third |
| 5 | C#m7 | ii of B |
| 6 | F#7 | V |
| 7 | Bmaj7 | I |
| 8 | Dmaj7 | major third |
| 9 | F#m7 | ii |
| 10 | B7 | V |
| 11 | Em7 | return |
| 12 | Emaj7 | cadence defer |

**Cell families:** bergonzi, cluster

**Musical notes:** Major-third cycles resist traditional resolution; delayedResolution keeps tension cells on weak bars. Bergonzi family supplies tertian anchor points inside chromatic motion.

---

## Scenario 8 — Nefertiti-Style (No Resolution)

**Style:** Wayne Shorter modal float; suspended cells; no cadential release.

**Engine:** ecm | suspended | open | medium | whole_tone

**Behaviour:** oddityScore 0.90 | delayedResolution true | melodyPriority false

**Key:** Bb **Tempo:** 96 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Bbmaj7#11 | Lydian colour |
| 2 | Bbmaj7#11 | pedal |
| 3 | Ebmaj7#11 | IV Lydian |
| 4 | Ebmaj7#11 | hold |
| 5 | Abmaj7 | bVII float |
| 6 | Abmaj7 | hold |
| 7 | Dbmaj7 | remote |
| 8 | Dbmaj7 | no V→I |

**Cell families:** suspended, shorter_floating

**Musical notes:** ECM mode plus 0.9 oddityScore creates perpetual hover. Suspended cells mirror the #11 Lydian wash without forcing dominant function.

---

## Scenario 9 — Infant Eyes Ballad

**Style:** Shorter ballad; shorter_floating family; sparse ECM texture; slow tempo.

**Engine:** ecm | sparse | close | easy | pentatonic

**Behaviour:** oddityScore 0.35 | delayedResolution true | melodyPriority true

**Key:** F **Tempo:** 56 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Fmaj7 | I |
| 2 | Em7b5 | passing iiø |
| 3 | A7b9 | V of ii |
| 4 | Dm | ii minor colour |
| 5 | Cm7 | bVII area |
| 6 | F7 | secondary V |
| 7 | Bbmaj7 | IV major |
| 8 | Fmaj7 | gentle return |

**Cell families:** shorter_floating, suspended

**Musical notes:** Ballad tempo exposes every semitone in cell voice-leading. melodyPriority flag (V99 stub, honoured in cookbook routing) signals lead-sheet-first arrangement intent.

---

## Scenario 10 — ECM Floating (No Tonal Centre)

**Style:** Major-thirds cycle; no fixed tonic; suspended + quartal cells; open voicing.

**Engine:** ecm | suspended | open | medium | whole_tone

**Behaviour:** oddityScore 0.75 | delayedResolution true | melodyPriority false

**Key:** none (Ab centre) **Tempo:** 80 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Abmaj7 | ∆ |
| 2 | Emaj7 | major third |
| 3 | Cmaj7 | major third |
| 4 | Gmaj7 | major third |
| 5 | Abmaj7 | cycle repeat |
| 6 | Emaj7 | |
| 7 | Cmaj7 | |
| 8 | Gmaj7 | |

**Cell families:** suspended, quartal, shorter_floating

**Musical notes:** Symmetric major-third cycle destroys functional hierarchy — ideal ECM use case. Quartal cells stack fourths that ignore tertian chord spelling while still mapping to maj7 surfaces.

---

## Scenario 11 — Walk On By (Bacharach Chromatic Descent)

**Style:** Lush Bacharach-style chromatic inner lines; resonant texture; mixed voicing.

**Engine:** bb | resonant | mixed | medium | chromatic

**Behaviour:** oddityScore 0.50 | delayedResolution false | melodyPriority true

**Key:** C **Tempo:** 118 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Cmaj7 | I |
| 2 | C#dim7 | chromatic passing |
| 3 | Dm7 | ii |
| 4 | G7sus4 | suspended dominant |
| 5 | G7 | V resolve colour |
| 6 | Cmaj7 | I |
| 7 | Cmaj7 | tag |
| 8 | Cmaj7 | hold |

**Cell families:** shorter_floating, suspended, bergonzi

**Musical notes:** Chromatic descending bass (C→C#→D) pairs with cluster-adjacent cells on the dim7 bar. Sus4 dominant delays resolution Bacharach-style before G7 release.

---

## Scenario 12 — Alfie (Unexpected Modulations)

**Style:** Bacharach modulatory ballad; close voicing; melodyPriority.

**Engine:** sq | resonant | close | medium | pentatonic

**Behaviour:** oddityScore 0.40 | delayedResolution false | melodyPriority true

**Key:** F **Tempo:** 102 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Fmaj7 | I |
| 2 | Gm7 | ii |
| 3 | C7 | V |
| 4 | Abmaj7 | bVI surprise |
| 5 | Bbmaj7 | IV / new key area |
| 6 | Fmaj7 | return |
| 7 | Fmaj7 | |
| 8 | Fmaj7 | |

**Cell families:** shorter_floating, bergonzi

**Musical notes:** Abrupt Abmaj7 shift tests whether tritonic voice-leading can pivot without rewriting cells. SQ smooth mode keeps the modulation singable.

---

## Scenario 13 — Chromatic Mediant Chain

**Style:** Non-diatonic mediants; cluster cells; high tension; BB mode.

**Engine:** bb | dense | full_chord | hard | chromatic

**Behaviour:** oddityScore 0.85 | delayedResolution false | melodyPriority false

**Key:** C **Tempo:** 132 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Cmaj7 | I |
| 2 | Emaj7 | chromatic mediant |
| 3 | Abmaj7 | chromatic mediant |
| 4 | Cmaj7 | return |
| 5 | Cmaj7 | |
| 6 | Emaj7 | repeat cycle |
| 7 | Abmaj7 | |
| 8 | Cmaj7 | |

**Cell families:** cluster, bergonzi, quartal

**Musical notes:** Major-third mediants are functionally ambiguous; cluster cells emphasise the strangeness. BB dense voicing fills the section for film-score shock harmony.

---

## Scenario 14 — Quartal Harmony (Stacked Fourths)

**Style:** Pure quartal cells; no traditional tertian names; stacked-fourth spelling.

**Engine:** ecm | sparse | open | medium | whole_tone

**Behaviour:** oddityScore 0.80 | delayedResolution true | melodyPriority false

**Key:** C **Tempo:** 90 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | C–F–Bb | quartal stack (sus4 family) |
| 2 | D–G–C | transposed stack |
| 3 | E–A–D | |
| 4 | C–F–Bb | return |
| 5 | F–Bb–Eb | |
| 6 | G–C–F | |
| 7 | A–D–G | |
| 8 | C–F–Bb | |

**Cell families:** quartal only

**Musical notes:** Quartal family maps to sus4 chord suffix in realisation export. Voice-leading prioritises parallel fourth motion over functional bass.

---

## Scenario 15 — Messiaen Mode 2 (Octatonic)

**Style:** Octatonic diminished-scale harmony; bergonzi + cluster; ECM mode.

**Engine:** ecm | resonant | mixed | hard | chromatic

**Behaviour:** oddityScore 0.78 | delayedResolution true | melodyPriority false

**Key:** D **Tempo:** 108 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Dm7b5 | octatonic iø |
| 2 | Eb7 | half-step dominant |
| 3 | Fm7b5 | |
| 4 | F#7 | |
| 5 | Am7b5 | |
| 6 | Bb7 | |
| 7 | Dm7b5 | return |
| 8 | Eb7 | open cadence |

**Cell families:** bergonzi, cluster

**Musical notes:** Alternating m7b5 and dominant 7th pairs outline octatonic set {0,1,3,4,6,7,9,10}. Cluster cells on ø chords maximise semitone density.

---

## Scenario 16 — Basie Rhythm Changes

**Style:** Count Basie Bb rhythm changes; Freddie Green beats 2+4; dense voicing.

**Engine:** bb | dense | full_chord | medium | pentatonic

**Behaviour:** oddityScore 0.60 | delayedResolution false | melodyPriority false

**Key:** Bb **Tempo:** 200 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Bbmaj7 | I |
| 2 | G7 | VI7 |
| 3 | Cm7 | ii |
| 4 | F7 | V |
| 5 | Dm7 | iii area |
| 6 | G7 | V/ii |
| 7 | Cm7 | ii |
| 8 | F7 | V turnaround |

**Cell families:** bergonzi, quartal

**Musical notes:** Classic A-section rhythm changes at Basie tempo; beats_2_4 comping leaves room for brass hits on 1 and 3 while tritonic cells connect upper voices across the ii–V pairs.

---

## Scenario 17 — Ellington Ballad

**Style:** Rich extensions; full_chord voicing; all_beats; low oddity.

**Engine:** bb | resonant | full_chord | easy | pentatonic

**Behaviour:** oddityScore 0.25 | delayedResolution false | melodyPriority true

**Key:** Db **Tempo:** 68 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Dbmaj7 | I |
| 2 | Bbm7 | vi |
| 3 | Ebm7 | ii |
| 4 | Ab7 | V |
| 5 | Dbmaj7 | I |
| 6 | Gbmaj7 | IV |
| 7 | F7 | bVII7 colour |
| 8 | Dbmaj7 | cadence |

**Cell families:** shorter_floating, bergonzi

**Musical notes:** Ellington ballad harmony favours lush maj7 and m7 extensions; low oddityScore keeps cells consonant. all_beats pattern supports sustained pad texture underneath melody.

---

## Scenario 18 — DADGAD Open Tuning Drone

**Style:** Alternate tuning drone; suspended cells only; sparse; open voicing.

**Engine:** ecm | sparse | open | easy | pentatonic

**Behaviour:** oddityScore 0.50 | delayedResolution true | melodyPriority false

**Key:** D **Tempo:** 76 bpm **Meter:** 4/4

**Tuning:** capo 0 · strings `[62,57,55,50,45,38]` (DADGAD MIDI)

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Dsus2 | open D drone |
| 2 | Gsus2 | IV sus |
| 3 | Asus4 | V sus colour |
| 4 | Dsus2 | return |
| 5 | Dsus2 | |
| 6 | Gsus2 | |
| 7 | Asus4 | |
| 8 | Dsus2 | |

**Cell families:** suspended only

**Musical notes:** DADGAD open strings reinforce sus2/sus4 cells without tertian third. delayedResolution prevents dominant cadences that would break the drone meditation.

---

## Scenario 19 — Sonic Youth (CGDGCD Power Clash)

**Style:** Noise-rock alternate tuning; power fifths; cluster cells; no functional harmony.

**Engine:** bb | dense | open | hard | chromatic

**Behaviour:** oddityScore 0.95 | delayedResolution true | melodyPriority false

**Key:** C **Tempo:** 140 bpm **Meter:** 4/4

**Tuning:** strings `[48,55,62,55,62,60]` (CGDGCD MIDI)

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | C5 | power |
| 2 | G5 | |
| 3 | Db5 | tritone shift |
| 4 | Ab5 | |
| 5 | C5 | return |
| 6 | G5 | |
| 7 | Db5 | |
| 8 | Ab5 | |

**Cell families:** cluster, quartal

**Musical notes:** Near-maximum oddityScore (0.95) plus cluster family mimics SY inter-guitar friction. CGDGCD tuning enables duplicate pitch strings for beating partials.

---

## Scenario 20 — Andrew Hill (Augmented Cycle)

**Style:** Asymmetric rhythm feel; augmented major-third cycle; shorter_floating + bergonzi; BB mode.

**Engine:** bb | medium | mixed | hard | whole_tone

**Behaviour:** oddityScore 0.85 | delayedResolution true | melodyPriority false

**Key:** C **Tempo:** 124 bpm **Meter:** 7/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Cm∆7 | augmented cycle start |
| 2 | Ebm∆7 | +3 semitones |
| 3 | F#∆7 | +3 |
| 4 | A∆7 | +3 / return axis |
| 5 | Cm∆7 | cycle repeat |
| 6 | Ebm∆7 | |
| 7 | F#∆7 | 7/4 bar — asymmetric feel |

**Cell families:** shorter_floating, bergonzi

**Musical notes:** Hill's non-functional major-third cycles align with whole_tone pattern type. 7/4 meter breaks four-square BB phrasing; delayedResolution sustains ambiguity across bar lines.

---

## Scenario 21 — Wayne Shorter Footprints (Bonus)

**Style:** Modal minor vamps; suspended + quartal; ECM sparse; medium oddity.

**Engine:** ecm | sparse | open | medium | pentatonic

**Behaviour:** oddityScore 0.65 | delayedResolution true | melodyPriority false

**Key:** C minor **Tempo:** 132 bpm **Meter:** 6/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Cm7 | i vamp |
| 2 | Cm7 | |
| 3 | F7 | Dorian colour |
| 4 | F7 | |
| 5 | Cm7 | return |
| 6 | Bb7 | subdominant area |

**Cell families:** suspended, quartal, shorter_floating

**Musical notes:** 6/4 lope matches Footprints-style floating time. ECM delayedResolution keeps the F7 bars from resolving to Bb major — staying inside the minor modal world.

---

## Quick reference

| Setting | Values |
|---------|--------|
| mode | `bb` · `sq` · `ecm` |
| texture | `sparse` · `resonant` · `suspended` · `dense` · `medium` |
| voicing | `close` · `open` · `mixed` · `shell_voicing` · `full_chord` |
| difficulty | `easy` · `medium` · `hard` |
| patternType | `pentatonic` · `chromatic` · `whole_tone` |
| comping beatPattern | `beats_2_4` · `beats_1_3` · `all_beats` · `offbeats` |

**Implementation:** `realiseTritonic()` → `realisationToMusicContext()` in `engines/composer-os-v2/core/tritonic/tritonicRealisation.ts`. Cookbook progressions are user-facing harmony plans; cell realisation fills upper-structure motion via voice-leading + Wayne behaviour layer.
