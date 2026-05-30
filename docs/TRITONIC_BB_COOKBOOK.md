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
## Scenario 21 — Thad Jones (Dense Chromatic Inner Voices)

**Style:** Thad Jones big-band harmony; dense chromatic inner voices; full_chord voicing; all-beats comping.

**Engine:** bb | dense | full_chord | hard | chromatic

**Behaviour:** oddityScore 0.72 | delayedResolution false | melodyPriority false

**Key:** Bb **Tempo:** 176 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Dbmaj7#11 | bIII Lydian — Thad colour |
| 2 | Cm7b5 | passing iiø |
| 3 | F7alt | altered V |
| 4 | Bbmaj7 | I |
| 5 | Dbmaj7#11 | cycle repeat |
| 6 | Cm7b5 | |
| 7 | F7alt | |
| 8 | Bbmaj7 | shout tag |

**Cell families:** bergonzi, cluster, quartal

**Musical notes:** Thad's #11 maj7 stacks demand chromatic inner motion that tritonic cluster cells supply naturally. BB all-beats pattern keeps the section driving while voice-leading weaves between altered dominants.

---

## Scenario 22 — Maria Schneider (Orchestral Swell)

**Style:** Maria Schneider orchestral swell; ECM texture; open voicing; delayed resolution throughout.

**Engine:** ecm | resonant | open | medium | whole_tone

**Behaviour:** oddityScore 0.68 | delayedResolution true | melodyPriority false

**Key:** E **Tempo:** 84 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Emaj7 | I swell |
| 2 | F#m7 | ii colour |
| 3 | Gmaj7#11 | Lydian lift |
| 4 | Abmaj7 | chromatic mediant |
| 5 | Emaj7 | return |
| 6 | F#m7 | |
| 7 | Gmaj7#11 | peak |
| 8 | Abmaj7 | open ending |

**Cell families:** shorter_floating, suspended

**Musical notes:** Schneider's slow harmonic rhythm lets ECM cells breathe across bar lines without cadence. Open voicing mirrors wide orchestral spacing; delayedResolution sustains the swell past the Abmaj7 bar.

---

## Scenario 23 — Donald Fagen (Aja-Style)

**Style:** Donald Fagen Aja-style precision; chromatic pattern; resonant texture; medium difficulty.

**Engine:** bb | resonant | mixed | medium | chromatic

**Behaviour:** oddityScore 0.58 | delayedResolution false | melodyPriority true

**Key:** D **Tempo:** 112 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Dmaj7 | I |
| 2 | F#m7 | iii |
| 3 | Em7 | ii |
| 4 | A7sus4 | suspended V |
| 5 | Dmaj7 | I return |
| 6 | F#m7 | |
| 7 | Em7 | |
| 8 | A7sus4 | tag |

**Cell families:** bergonzi, shorter_floating, suspended

**Musical notes:** Fagen's sus4 dominants delay tertian resolution — matching tritonic suspended family behaviour. Chromatic pattern type colours the Em7→A7sus4 approach with cluster-adjacent cells without breaking the groove.

---

## Scenario 24 — XTC English Settlement (Slash Chords)

**Style:** XTC English Settlement; slash-chord harmony; odd bar lengths; cluster cells; offbeats comping.

**Engine:** sq | medium | mixed | medium | pentatonic

**Behaviour:** oddityScore 0.22 | delayedResolution false | melodyPriority true

**Key:** F **Tempo:** 126 bpm **Meter:** 7/8

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Fmaj7 | I |
| 2 | Bb/C | IV over V bass |
| 3 | Eb/F | bVII over I bass |
| 4 | Abmaj7/Bb | remote slash |
| 5 | Fmaj7 | return |
| 6 | Bb/C | |
| 7 | Eb/F | 7/8 — asymmetric tag |

**Cell families:** cluster, quartal

**Musical notes:** Slash chords decouple bass from upper structure — tritonic quartal cells float independently of the bass pedal. 7/8 meter plus offbeats comping mirrors Settlement's angular folk-rock pulse.

---

## Scenario 25 — Two-Part Counterpoint (Guitar–Bass Duo)

**Style:** Guitar–bass duo; upper quartal cells against stepwise diatonic bass; open voicing.

**Engine:** sq | sparse | open | easy | pentatonic

**Behaviour:** oddityScore 0.18 | delayedResolution false | melodyPriority true

**Key:** C **Tempo:** 96 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | C | I — bass root |
| 2 | G/B | V first inversion |
| 3 | Am | vi |
| 4 | F | IV |
| 5 | C/E | I third in bass |
| 6 | Dm | ii |
| 7 | G | V |
| 8 | C | cadence |

**Cell families:** quartal (upper), bergonzi (lower)

**Musical notes:** Duo producer path splits register: quartal cells in guitar range, stepwise bass motion below. SQ mode keeps oddity low so the counterpoint stays singable.

---

## Scenario 26 — Fux Species Counterpoint (Third Species)

**Style:** Strict third-species counterpoint; duo producer; melodyPriority; close voicing.

**Engine:** sq | sparse | close | easy | pentatonic

**Behaviour:** oddityScore 0.12 | delayedResolution false | melodyPriority true

**Key:** D minor **Tempo:** 72 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Dm | i |
| 2 | C | bVII |
| 3 | Bb | bVI |
| 4 | A | V area |
| 5 | Dm | return |
| 6 | C | |
| 7 | Bb | |
| 8 | A | half cadence |

**Cell families:** bergonzi, shorter_floating

**Musical notes:** Third-species four-notes-against-one maps to tritonic cell chains per bar. melodyPriority signals lead-sheet-first intent for the cantus firmus line.

---

## Scenario 27 — Invertible Counterpoint (Voice Swap)

**Style:** Invertible counterpoint; voices swap at bar 5; guitar–bass duo.

**Engine:** sq | medium | mixed | medium | pentatonic

**Behaviour:** oddityScore 0.20 | delayedResolution false | melodyPriority true

**Key:** G **Tempo:** 108 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Gmaj7 | I |
| 2 | Em7 | vi |
| 3 | Am7 | ii |
| 4 | D7 | V |
| 5 | Am7 | **voice swap** — upper becomes bass line |
| 6 | D7 | |
| 7 | Gmaj7 | |
| 8 | Gmaj7 | tag |

**Cell families:** bergonzi, quartal

**Musical notes:** Bar 5 inversion tests whether tritonic voice-leading can mirror registral swap without rewriting the cell pool. Duo mode runs two SQ phrases with complementary tension curves.

---

## Scenario 28 — Messiaen Mode 3 (Limited Transposition)

**Style:** Messiaen Mode 3 pitch cycling; bergonzi cells exclusively; ECM mode; high oddity.

**Engine:** ecm | suspended | open | hard | whole_tone

**Behaviour:** oddityScore 0.90 | delayedResolution true | melodyPriority false

**Key:** C **Tempo:** 66 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | C | Mode 3 pitch 1 |
| 2 | Db | pitch 2 |
| 3 | E | pitch 3 |
| 4 | F | pitch 4 |
| 5 | Ab | pitch 5 |
| 6 | A | pitch 6 |
| 7 | C | cycle return |
| 8 | Db | |

**Cell families:** bergonzi only

**Musical notes:** Mode 3's six-pitch set resists functional harmony — bergonzi tertian anchors are the only family that maps cleanly to chord export. ECM forced delayedResolution keeps the cycle perpetually unresolved.

---

## Scenario 29 — Messiaen Mode 4 (Diminished)

**Style:** Messiaen Mode 4 diminished stacks; suspended + cluster cells; delayed resolution.

**Engine:** ecm | resonant | mixed | hard | chromatic

**Behaviour:** oddityScore 0.82 | delayedResolution true | melodyPriority false

**Key:** C **Tempo:** 92 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Cdim | dim stack 1 |
| 2 | Dbdim | half-step rise |
| 3 | Ddim | |
| 4 | Ebdim | |
| 5 | Cdim | return |
| 6 | Dbdim | |
| 7 | Ddim | |
| 8 | Ebdim | open |

**Cell families:** suspended, cluster

**Musical notes:** Diminished symmetry pairs with cluster semitone stacks for maximum chromatic density. Suspended cells on weak beats prevent accidental major-third resolution.

---

## Scenario 30 — Quartet for the End of Time

**Style:** Messiaen *Quartet for the End of Time* homage; shorter_floating only; ultra-slow tempo.

**Engine:** ecm | sparse | open | easy | whole_tone

**Behaviour:** oddityScore 0.55 | delayedResolution true | melodyPriority false

**Key:** E **Tempo:** 30 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Emaj7 | block 1 |
| 2 | Emaj7 | |
| 3 | Emaj7 | |
| 4 | Emaj7 | |
| 5 | Fmaj7#11 | block 2 — Lydian shift |
| 6 | Fmaj7#11 | |
| 7 | Fmaj7#11 | |
| 8 | Fmaj7#11 | |

**Cell families:** shorter_floating only

**Musical notes:** Extreme slowness exposes every semitone in cell voice-leading across four-bar blocks. The E→Fmaj7#11 shift is a single Messiaen-like colour change without functional dominant.

---

## Scenario 31 — Completely Atonal (12 Roots)

**Style:** Twelve different roots in twelve bars; all cell families; maximum oddity; no tonal centre.

**Engine:** bb | dense | open | hard | chromatic

**Behaviour:** oddityScore 1.00 | delayedResolution true | melodyPriority false

**Key:** none **Tempo:** 100 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | C7alt | root 1 |
| 2 | Db7alt | root 2 |
| 3 | D7alt | root 3 |
| 4 | Eb7alt | root 4 |
| 5 | E7alt | root 5 |
| 6 | F7alt | root 6 |
| 7 | Gb7alt | root 7 |
| 8 | G7alt | root 8 |
| 9 | Ab7alt | root 9 |
| 10 | A7alt | root 10 |
| 11 | Bb7alt | root 11 |
| 12 | B7alt | root 12 |

**Cell families:** quartal, cluster, suspended, shorter_floating, bergonzi

**Musical notes:** Maximum oddityScore (1.0) plus all five families exercises the full dictionary in one pass. delayedResolution prevents any bar from acting as a tonal anchor.

---

## Scenario 32 — Microtonally-Inspired (Semitone Maj7 Chain)

**Style:** Microtonally-inspired semitone maj7 chain; cluster cells; high tension; ECM mode.

**Engine:** ecm | dense | close | hard | chromatic

**Behaviour:** oddityScore 0.88 | delayedResolution true | melodyPriority false

**Key:** C **Tempo:** 64 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Cmaj7 | anchor |
| 2 | C#maj7 | +1 semitone |
| 3 | Dbmaj7 | enharmonic slide |
| 4 | Cmaj7 | return |
| 5 | Cmaj7 | |
| 6 | C#maj7 | repeat |
| 7 | Dbmaj7 | |
| 8 | Cmaj7 | |

**Cell families:** cluster

**Musical notes:** Semitone maj7 shifts mimic microtonal drift in twelve-tone equal temperament. Cluster cells maximise semitone friction between adjacent bars.

---

## Scenario 33 — Nonsensical Chromatic Explosion

**Style:** Deliberately nonsensical chromatic harmony; all families; BB mode; near-max oddity.

**Engine:** bb | dense | full_chord | hard | chromatic

**Behaviour:** oddityScore 0.95 | delayedResolution false | melodyPriority false

**Key:** C **Tempo:** 148 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Ab7 | remote bVI |
| 2 | Emaj7 | chromatic mediant |
| 3 | Bbm7b5 | ø colour |
| 4 | F#maj7#11 | Lydian remote |
| 5 | Dm7 | sudden ii |
| 6 | Gbmaj7 | tritone mediant |
| 7 | Amaj7b5 | altered maj |
| 8 | Cmaj7 | accidental landing |

**Cell families:** quartal, cluster, suspended, shorter_floating, bergonzi

**Musical notes:** Each bar pivots by unrelated interval — testing tritonic voice-leading under extreme harmonic whiplash. BB dense voicing fills the section for cartoon chase-score energy.

---

## Scenario 34 — Random Walk (Interval Rotation)

**Style:** Random-walk root motion by interval rotation; quartal cells; SQ smooth mode.

**Engine:** sq | medium | open | medium | whole_tone

**Behaviour:** oddityScore 0.24 | delayedResolution false | melodyPriority false

**Key:** C **Tempo:** 116 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | C | root |
| 2 | Eb | +3 semitones |
| 3 | A | +7 from Eb |
| 4 | F# | +6 from A |
| 5 | Bb | +5 from F# |
| 6 | D | +3 from Bb |
| 7 | G | +7 from D |
| 8 | B | +4 from G |

**Cell families:** quartal

**Musical notes:** Interval rotation destroys functional bass while quartal cells maintain vertical coherence. SQ oddity cap keeps the random walk from becoming pure noise.

---

## Scenario 35 — Polymodal (C Major / F# Major)

**Style:** Polymodal bitonality; C major upper register | F# major lower; guitar–bass duo; high tension.

**Engine:** sq | dense | open | hard | chromatic

**Behaviour:** oddityScore 0.25 | delayedResolution false | melodyPriority false

**Key:** C / F# **Tempo:** 102 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Cmaj7 (upper) / F#maj7 (lower) | tritone bitonal clash |
| 2 | Cmaj7 / F#maj7 | sustained clash |
| 3 | Am7 / D#m7 | relative minors |
| 4 | Am7 / D#m7 | |
| 5 | Fmaj7 / Bmaj7 | subdominant area |
| 6 | Fmaj7 / Bmaj7 | |
| 7 | G7 / C#7 | dominant clash |
| 8 | Cmaj7 / F#maj7 | return |

**Cell families:** bergonzi, cluster, quartal

**Musical notes:** Tritone-separated key centres produce permanent bitonal friction. Duo producer assigns C-major cells to guitar and F#-major cells to bass register.

---

## Scenario 36 — Lloyd Webber (Deliberate Clash)

**Style:** Lloyd Webber pastiche; lush diatonic progression with tritonic cell clash; shell voicing.

**Engine:** bb | resonant | shell_voicing | medium | pentatonic

**Behaviour:** oddityScore 0.62 | delayedResolution false | melodyPriority true

**Key:** G **Tempo:** 108 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Gmaj7 | I |
| 2 | Em7 | vi |
| 3 | Cmaj7 | IV |
| 4 | D7sus4 | suspended V |
| 5 | D7 | V resolve |
| 6 | Gmaj7 | I |
| 7 | Gmaj7 | tag |
| 8 | Gmaj7 | |

**Cell families:** shorter_floating, cluster (clash layer)

**Musical notes:** Deliberately clashes tritonic cluster cells against Lloyd Webber's diatonic maj7 wash. Shell voicing in comping leaves room for the clash to register in upper register only.

---

## Scenario 37 — Samba Jazz (Bossa Offbeats)

**Style:** Samba jazz; bossa offbeats comping pattern; resonant texture.

**Engine:** bb | resonant | mixed | medium | pentatonic

**Behaviour:** oddityScore 0.48 | delayedResolution false | melodyPriority false

**Key:** G minor **Tempo:** 132 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Am7b5 | iiø |
| 2 | D7b9 | V |
| 3 | Gm | i |
| 4 | Cm7 | iv |
| 5 | F7 | V/iv |
| 6 | Bbmaj7 | bVII major |
| 7 | Am7b5 | turnaround |
| 8 | D7b9 | |

**Cell families:** bergonzi, suspended, shorter_floating

**Musical notes:** Offbeats comping pattern syncopates against straight harmonic rhythm — classic samba jazz feel. Resonant texture supports nylon-string guitar voicings in upper register.

---

## Scenario 38 — Nordic Folk Drone

**Style:** Nordic folk drone; DADGAD-adjacent sus2 harmony; suspended cells; slow tempo.

**Engine:** ecm | sparse | open | easy | pentatonic

**Behaviour:** oddityScore 0.42 | delayedResolution true | melodyPriority false

**Key:** G **Tempo:** 60 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Gsus2 | I drone |
| 2 | Dsus2 | V sus |
| 3 | Asus2 | IV sus |
| 4 | Esus2 | remote sus |
| 5 | Gsus2 | return |
| 6 | Dsus2 | |
| 7 | Asus2 | |
| 8 | Gsus2 | |

**Cell families:** suspended only

**Musical notes:** Nordic drone aesthetic maps directly to suspended family cells without tertian third. 60 bpm tempo exposes slow voice-leading shifts across sus2 changes.

---

## Scenario 39 — Steve Reich Phase (Additive Bass)

**Style:** Steve Reich phase shifting; descending bass pedal under static top; quartal cells only; SQ mode.

**Engine:** sq | sparse | open | medium | whole_tone

**Behaviour:** oddityScore 0.20 | delayedResolution false | melodyPriority true

**Key:** E minor **Tempo:** 120 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Em | tonic |
| 2 | Em/D | bass descends |
| 3 | Em/C# | |
| 4 | Em/C | |
| 5 | Em/B | cycle |
| 6 | Em/D | |
| 7 | Em/C# | |
| 8 | Em/C | |

**Cell families:** quartal only

**Musical notes:** Reich's phase process maps to repeating quartal cell with shifting bass anchor. melodyPriority keeps the top voice as the perceptual focus while bass phases underneath.

---

## Scenario 40 — Cinema Noir (Descending Chromatic)

**Style:** Cinema noir; descending chromatic bass; cluster + bergonzi; BB full_chord; slow tempo.

**Engine:** bb | dense | full_chord | hard | chromatic

**Behaviour:** oddityScore 0.75 | delayedResolution false | melodyPriority false

**Key:** D minor **Tempo:** 58 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Dm | i |
| 2 | Db7 | chromatic bVII7 |
| 3 | Cm | iv |
| 4 | B7 | chromatic V |
| 5 | Bbm | bvi |
| 6 | A7 | V |
| 7 | Dm | return |
| 8 | Dm | fade |

**Cell families:** cluster, bergonzi

**Musical notes:** Chromatic descending bass line is classic noir harmonic language. Cluster cells on Db7 and B7 bars maximise film-score tension at slow tempo.

---

## Scenario 41 — Stravinsky Petrushka (Polychord)

**Style:** Stravinsky Petrushka polychord; Cmaj7 over F#maj7; cluster cells; dense BB voicing.

**Engine:** bb | dense | full_chord | hard | chromatic

**Behaviour:** oddityScore 0.85 | delayedResolution false | melodyPriority false

**Key:** C / F# **Tempo:** 144 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Cmaj7/F#maj7 | Petrushka polychord |
| 2 | Cmaj7/F#maj7 | sustained |
| 3 | G7/C#7 | dominant polychord |
| 4 | G7/C#7 | |
| 5 | Cmaj7/F#maj7 | return |
| 6 | Cmaj7/F#maj7 | |
| 7 | F7/B7 | subdominant clash |
| 8 | Cmaj7/F#maj7 | |

**Cell families:** cluster

**Musical notes:** The Petrushka chord (C major + F# major) is the canonical tritone polychord. Cluster cells mirror Stravinsky's semitone-rich vertical stacks in the bitonal register.

---

## Scenario 42 — Bartók Night Music (Chromatic Ascent)

**Style:** Bartók night music; chromatic ascending minor triads; cluster + bergonzi; ECM mode; very slow.

**Engine:** ecm | sparse | close | hard | chromatic

**Behaviour:** oddityScore 0.80 | delayedResolution true | melodyPriority false

**Key:** C **Tempo:** 40 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Cm | ascent start |
| 2 | C#m | +1 semitone |
| 3 | Dm | |
| 4 | D#m | |
| 5 | Em | continue |
| 6 | Fm | |
| 7 | F#m | |
| 8 | Gm | open |

**Cell families:** cluster, bergonzi

**Musical notes:** Chromatic ascending minors create uncanny night-music atmosphere without functional progression. 40 bpm exposes every semitone shift in cell voice-leading.

---

## Scenario 43 — Bitonality (Bb / D)

**Style:** Bitonality; Bbmaj7 upper | Dmaj7 lower; guitar–bass duo; quartal upper, shell lower.

**Engine:** sq | medium | mixed | medium | pentatonic

**Behaviour:** oddityScore 0.22 | delayedResolution false | melodyPriority false

**Key:** Bb / D **Tempo:** 98 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Bbmaj7 (upper) / Dmaj7 (lower) | bitonal |
| 2 | Bbmaj7 / Dmaj7 | |
| 3 | F7 / Am7 | dominant area |
| 4 | F7 / Am7 | |
| 5 | Ebmaj7 / Gmaj7 | subdominant |
| 6 | Ebmaj7 / Gmaj7 | |
| 7 | Bbmaj7 / Dmaj7 | return |
| 8 | Bbmaj7 / Dmaj7 | |

**Cell families:** quartal (upper), bergonzi (lower)

**Musical notes:** Major-second bitonality (Bb vs D) is milder than tritone clash but still resists unified tonic. Quartal upper cells float above shell-voiced D-major bass.

---

## Scenario 44 — Polymodal Folk (Dorian / Phrygian)

**Style:** Polymodal folk; Dorian upper | Phrygian lower; duo producer; simultaneous mode streams.

**Engine:** sq | sparse | open | medium | pentatonic

**Behaviour:** oddityScore 0.23 | delayedResolution false | melodyPriority true

**Key:** D / E **Tempo:** 104 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Dm7 (Dorian) / Em (Phrygian) | dual mode |
| 2 | Em7b5 / Fm | |
| 3 | Fmaj7 / Gm | |
| 4 | G7 / Am | |
| 5 | Dm7 / Em | repeat |
| 6 | Em7b5 / Fm | |
| 7 | Fmaj7 / Gm | |
| 8 | G7 / Am | |

**Cell families:** bergonzi, suspended

**Musical notes:** Parallel mode streams a semitone apart produce subtle polymodal folk colour. Duo producer assigns Dorian cells to guitar and Phrygian cells to bass.

---

## Scenario 45 — Lydian over Locrian

**Style:** Lydian upper (Fmaj7#11) over Locrian lower (Bm7b5); ECM texture; high oddity.

**Engine:** ecm | suspended | open | hard | whole_tone

**Behaviour:** oddityScore 0.90 | delayedResolution true | melodyPriority false

**Key:** F / B **Tempo:** 78 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Fmaj7#11 (upper) / Bm7b5 (lower) | Lydian/Locrian clash |
| 2 | Fmaj7#11 / Bm7b5 | |
| 3 | C7#11 / F#m7b5 | dominant area |
| 4 | C7#11 / F#m7b5 | |
| 5 | Bbmaj7#11 / Em7b5 | subdominant |
| 6 | Bbmaj7#11 / Em7b5 | |
| 7 | Fmaj7#11 / Bm7b5 | return |
| 8 | Fmaj7#11 / Bm7b5 | |

**Cell families:** shorter_floating, suspended

**Musical notes:** Bright Lydian #11 over dark Locrian ø creates maximum modal contrast. ECM delayedResolution prevents either mode from dominating the other.

---

## Scenario 46 — Hans Zimmer Ostinato (Rising Oddity)

**Style:** Hans Zimmer ostinato; i–bVI–bIII–bVII loop; oddityScore rises 0.2→0.8 across sections.

**Engine:** bb | dense | full_chord | medium | pentatonic

**Behaviour:** oddityScore 0.20→0.80 (section ramp) | delayedResolution false | melodyPriority false

**Key:** D minor **Tempo:** 136 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Dm | i — oddity 0.2 |
| 2 | Bb | bVI |
| 3 | F | bIII |
| 4 | C | bVII |
| 5 | Dm | repeat — oddity 0.5 |
| 6 | Bb | |
| 7 | F | |
| 8 | C | peak — oddity 0.8 |

**Cell families:** bergonzi, cluster, quartal

**Musical notes:** Section-ramped oddityScore mimics Zimmer's tension arc over static ostinato harmony. all_beats comping drives the loop while cells grow increasingly dissonant.

---

## Scenario 47 — Bernard Herrmann Psycho (Alternating Minors)

**Style:** Bernard Herrmann *Psycho* alternating minors; cluster cells only; SQ mode.

**Engine:** sq | dense | close | hard | chromatic

**Behaviour:** oddityScore 0.24 | delayedResolution false | melodyPriority false

**Key:** C **Tempo:** 80 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Cm | i |
| 2 | C#m | +1 semitone |
| 3 | Cm | return |
| 4 | C#m | |
| 5 | Cm | |
| 6 | C#m | |
| 7 | Cm | |
| 8 | C#m | stab |

**Cell families:** cluster only

**Musical notes:** Herrmann's semitone oscillation is pure cluster-cell territory. SQ mode keeps smoothness in voice-leading while cluster content supplies the stab intensity.

---

## Scenario 48 — Ennio Morricone Western

**Style:** Ennio Morricone western; suspended cells; DADGAD-adjacent; sparse texture.

**Engine:** ecm | sparse | open | easy | pentatonic

**Behaviour:** oddityScore 0.38 | delayedResolution true | melodyPriority true

**Key:** A minor **Tempo:** 88 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Am | i |
| 2 | E/G# | V with bass |
| 3 | G | bIII |
| 4 | D/F# | IV with bass |
| 5 | F | bVI |
| 6 | C | bIII major |
| 7 | E | V |
| 8 | Am | return |

**Cell families:** suspended

**Musical notes:** Morricone's open-fifth and sus harmony maps to suspended family cells and sparse ECM texture. DADGAD-adjacent tuning reinforces the desert-wide spacing.

---

## Scenario 49 — John Barry Bond Style

**Style:** John Barry Bond theme; shell voicing; offbeats; bergonzi cells.

**Engine:** bb | medium | shell_voicing | medium | chromatic

**Behaviour:** oddityScore 0.55 | delayedResolution false | melodyPriority true

**Key:** E minor **Tempo:** 124 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Em | i |
| 2 | F | bII Neapolitan colour |
| 3 | Em | return |
| 4 | F#m7b5 | iiø |
| 5 | B7 | V |
| 6 | Em | cadence |
| 7 | Em | tag |
| 8 | Em | |

**Cell families:** bergonzi

**Musical notes:** Barry's minor-key spy harmony uses chromatic neighbour chords (F, F#m7b5) that bergonzi cells colour naturally. Offbeats comping supplies the iconic syncopated drive.

---

## Scenario 50 — Nino Rota Fellini Circus

**Style:** Nino Rota Fellini circus; 3/4 meter; cluster + quartal; ECM mode.

**Engine:** ecm | resonant | mixed | medium | pentatonic

**Behaviour:** oddityScore 0.60 | delayedResolution true | melodyPriority true

**Key:** C **Tempo:** 120 bpm **Meter:** 3/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | C | I |
| 2 | Ab | bVI |
| 3 | C | return |
| 4 | G | V |
| 5 | Eb | bIII |
| 6 | G | |
| 7 | C | |
| 8 | C | tag |

**Cell families:** cluster, quartal

**Musical notes:** Rota's circus harmony jumps by unexpected intervals in waltz time. 3/4 meter changes tritonic phrase plan cadence feel — cells align to three-beat bars.

---

## Scenario 51 — Jerry Goldsmith Atonal (12-Tone Row)

**Style:** Jerry Goldsmith atonal; twelve-tone row as chord progression; all families; maximum oddity.

**Engine:** bb | dense | open | hard | chromatic

**Behaviour:** oddityScore 1.00 | delayedResolution true | melodyPriority false

**Key:** none **Tempo:** 96 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | C7alt | pc 0 |
| 2 | F#7alt | pc 6 |
| 3 | D7alt | pc 2 |
| 4 | Ab7alt | pc 8 |
| 5 | E7alt | pc 4 |
| 6 | Bb7alt | pc 10 |
| 7 | G7alt | pc 7 |
| 8 | Db7alt | pc 1 |
| 9 | A7alt | pc 9 |
| 10 | Eb7alt | pc 3 |
| 11 | B7alt | pc 11 |
| 12 | F7alt | pc 5 |

**Cell families:** quartal, cluster, suspended, shorter_floating, bergonzi

**Musical notes:** Full twelve-tone row as harmony bars exercises every pitch class without repetition before completion. Goldsmith-style thriller scoring at oddityScore 1.0.

---

## Scenario 52 — Polyrhythmic Polymodal

**Style:** Polyrhythmic polymodal; 4/4 harmony against implied 3/4 cell rhythm; SQ mode.

**Engine:** sq | medium | open | medium | whole_tone

**Behaviour:** oddityScore 0.24 | delayedResolution false | melodyPriority true

**Key:** C **Tempo:** 108 bpm **Meter:** 4/4 (harmony) / implied 3/4 (cells)

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Cmaj7 | polymodal I |
| 2 | Ebmaj7 | bIII |
| 3 | Gbmaj7 | tritone |
| 4 | Amaj7 | major second |
| 5 | Cmaj7 | repeat |
| 6 | Ebmaj7 | |
| 7 | Gbmaj7 | |
| 8 | Amaj7 | |

**Cell families:** bergonzi, quartal

**Musical notes:** Major-second polymodal cycle resists tonal centre while 3:4 polyrhythm in cell phrasing creates metric tension against 4/4 harmony. melodyPriority keeps the top line perceptually stable.

---

## Scenario 53 — Thomas Newman Suburban (Static Unease)

**Style:** Thomas Newman suburban unease; static diatonic loop; shorter_floating cells create anxiety.

**Engine:** ecm | sparse | close | easy | pentatonic

**Behaviour:** oddityScore 0.52 | delayedResolution true | melodyPriority false

**Key:** C **Tempo:** 74 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Cmaj7 | I |
| 2 | G/B | V first inv |
| 3 | Am | vi |
| 4 | Fmaj7 | IV |
| 5 | Cmaj7 | repeat |
| 6 | G/B | |
| 7 | Am | |
| 8 | Fmaj7 | |

**Cell families:** shorter_floating only

**Musical notes:** Harmonic stasis is deliberate — shorter_floating cells supply unease through voice-leading drift without changing chords. Newman-style suburban dread in sparse ECM texture.

---

## Scenario 54 — Jonny Greenwood (There Will Be Blood)

**Style:** Jonny Greenwood *There Will Be Blood*; chromatic ascending minors; cluster cells; ECM mode.

**Engine:** ecm | dense | close | hard | chromatic

**Behaviour:** oddityScore 0.95 | delayedResolution true | melodyPriority false

**Key:** C **Tempo:** 35 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Cm | start |
| 2 | Dbm | +1 |
| 3 | Dm | |
| 4 | C#m | enharmonic slide |
| 5 | Cm | return |
| 6 | Dbm | |
| 7 | Dm | |
| 8 | Cm | |

**Cell families:** cluster

**Musical notes:** Greenwood's chromatic minor clusters at 35 bpm create oppressive stasis. Near-max oddityScore plus ECM delayedResolution prevents any harmonic escape.

---

## Scenario 55 — Shostakovich Ironic Waltz

**Style:** Shostakovich ironic waltz; 3/4 meter; bergonzi cells; BB mode.

**Engine:** bb | resonant | mixed | hard | chromatic

**Behaviour:** oddityScore 0.68 | delayedResolution false | melodyPriority true

**Key:** D minor **Tempo:** 132 bpm **Meter:** 3/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Dm | i waltz |
| 2 | A7 | V |
| 3 | Dm | return |
| 4 | F#maj7 | ironic major injection |
| 5 | Dm | |
| 6 | Bb | bVI |
| 7 | A7 | V |
| 8 | Dmaj7 | major cadence — ironic |

**Cell families:** bergonzi

**Musical notes:** Shostakovich's major-key endings in minor contexts are the ironic gesture. Bergonzi cells supply tertian clarity while BB mode adds sarcastic brass weight.

---

## Scenario 56 — Miles Sketches of Spain (Phrygian / Dorian)

**Style:** Miles *Sketches of Spain*; E Phrygian upper | E Dorian lower; guitar–bass duo; open voicing.

**Engine:** ecm | sparse | open | medium | pentatonic

**Behaviour:** oddityScore 0.48 | delayedResolution true | melodyPriority true

**Key:** E **Tempo:** 92 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Em | i |
| 2 | Fmaj7 | bII Phrygian |
| 3 | Em | return |
| 4 | Fmaj7 | |
| 5 | Dm | Dorian iv |
| 6 | Em | |
| 7 | Fmaj7 | |
| 8 | Em | |

**Cell families:** suspended, shorter_floating

**Musical notes:** Phrygian bII (Fmaj7) against Dorian iv (Dm) captures Sketches' modal Spanish flavour. Duo producer splits Phrygian upper from Dorian lower register.

---

## Scenario 57 — Stealth Cinematic Tension

**Style:** Stealth cinematic tension; shorter_floating only; ECM mode; major-third cycle.

**Engine:** ecm | sparse | open | medium | whole_tone

**Behaviour:** oddityScore 0.88 | delayedResolution true | melodyPriority false

**Key:** Ab **Tempo:** 55 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Abmaj7 | ∆ |
| 2 | Emaj7 | major third |
| 3 | Cmaj7 | major third |
| 4 | G#maj7 | major third |
| 5 | Abmaj7 | repeat |
| 6 | Emaj7 | |
| 7 | Cmaj7 | |
| 8 | G#maj7 | |

**Cell families:** shorter_floating only

**Musical notes:** Stealth-game harmonic language uses symmetric cycles that never cadence. 55 bpm plus 0.88 oddityScore creates sustained dread without jump-scare dynamics.

---

## Scenario 58 — Polychordal Cluster Bomb

**Style:** Polychordal cluster bomb; Cmaj7 + Gbmaj7 + Dbmaj7 implied simultaneously; cluster only.

**Engine:** bb | dense | full_chord | hard | chromatic

**Behaviour:** oddityScore 0.92 | delayedResolution true | melodyPriority false

**Key:** C / Gb / Db **Tempo:** 156 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Cmaj7+Gbmaj7+Dbmaj7 | triple polychord |
| 2 | Cmaj7+Gbmaj7+Dbmaj7 | sustained |
| 3 | Cmaj7+Gbmaj7+Dbmaj7 | |
| 4 | Cmaj7+Gbmaj7+Dbmaj7 | |
| 5 | Fmaj7+Bmaj7+F#maj7 | shift |
| 6 | Fmaj7+Bmaj7+F#maj7 | |
| 7 | Cmaj7+Gbmaj7+Dbmaj7 | return |
| 8 | Cmaj7+Gbmaj7+Dbmaj7 | |

**Cell families:** cluster only

**Musical notes:** Three mutually tritone-related maj7 chords sounding together is maximum harmonic density. Cluster cells are the only family that survives this polychordal context without collapsing to consonance.

---

## Scenario 59 — John Adams Minimalist Swell

**Style:** John Adams minimalist swell; quartal cells; fifth-cycle root motion; SQ mode.

**Engine:** sq | resonant | open | medium | whole_tone

**Behaviour:** oddityScore 0.21 | delayedResolution false | melodyPriority true

**Key:** Db **Tempo:** 52 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Db | cycle start |
| 2 | Ab | +7 |
| 3 | Eb | |
| 4 | Bb | |
| 5 | F | continue |
| 6 | Db | return |
| 7 | Ab | |
| 8 | Eb | |

**Cell families:** quartal only

**Musical notes:** Adams-style harmonic swell over quartal cells creates orchestral shimmer without functional progression. 52 bpm tempo matches *Harmonielehre* pacing; melodyPriority keeps the soaring top line forward.

---

## Scenario 60 — Max Richter Post-Minimal

**Style:** Max Richter post-minimal; diatonic loop with shorter_floating shimmer above; ECM sparse.

**Engine:** ecm | sparse | open | easy | pentatonic

**Behaviour:** oddityScore 0.44 | delayedResolution true | melodyPriority true

**Key:** C **Tempo:** 63 bpm **Meter:** 4/4

**Progression:**

| Bar | Chord | Notes |
|-----|-------|-------|
| 1 | Cmaj7 | I |
| 2 | Am7 | vi |
| 3 | Fmaj7 | IV |
| 4 | G7sus4 | V sus |
| 5 | Cmaj7 | repeat |
| 6 | Am7 | |
| 7 | Fmaj7 | |
| 8 | G7sus4 | |

**Cell families:** shorter_floating only

**Musical notes:** Richter's post-minimal aesthetic pairs simple diatonic loops with shimmering upper voices. shorter_floating cells supply the shimmer; ECM delayedResolution avoids dominant cadence on G7sus4.

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
