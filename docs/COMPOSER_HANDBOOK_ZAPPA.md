# Composer OS Handbook — The Zappa Chapter

> *"The most important thing in art is The Frame. For without The Frame you don't have art—you have chaos."*
> — Frank Zappa

---

## Overview

Frank Zappa in Composer OS is the most architecturally complex VRB in the registry. He operates across two distinct creative modes, each with its own generation engine, harmonic logic, and rhythmic philosophy. Understanding which mode to invoke—and how to configure it—is the difference between getting a well-formed compositional structure and a fret-burning blues-rock eruption.

This chapter covers everything the Zappa engine can do, with 20+ practical scenarios and paste-ready chord progressions for immediate experimentation.

---

## Engine Architecture

### Two Modes, One VRB

| Mode | Label | Engine Path |
|---|---|---|
| Compositional | `compositional` | frankZappaSlice + Slonimsky solo + GCE structural fingerprint |
| Blues-Rock Ferocity | `bluesrockFerocious` | frankZappaSlice + Slonimsky ferocity profile; GCE structural bypass |

Set `zappaStyleMode` on the generation call. Default is `compositional`.

### Compositional Mode — What It Does

- **frankZappaSlice**: generates the compositional backbone — phrase fragmentation, meter splicing, textural density spikes, harmonic non-resolution
- **Slonimsky solo engine**: applies Slonimsky patterns (symmetric divisions, 7/8 cells) with guide-tone nudges and chromatic interpolation
- **GCE structural fingerprint**: scores output against Zappa's compositional pillars — meter disruption (7/8 + 5/4 + 4/4), ♭II/♭VII/tritone-sub cadence targets, phrase fragmentation (high section churn, weak return), sudden density contrast
- **Quote/collage flag**: `metadataOnly: true` — the engine knows this is a Zappa device but does not generate it (generative collage is a future phase)

### Blues-Rock Ferocity Mode — What It Does

- **Slonimsky ferocity profile** (`bluesrockFerocious`): Dorian + Mixolydian modal base, pentatonic embedded at 0.38 anchor ratio, chromatic budget 0.30, scale mingling enabled
- **Rhythmic engine**: quintuplets (5:4), septuplets (7:4), hemiola against locked shuffle, triplet-to-16th switching mid-phrase, speech-influenced irregular groupings
- **Phrase architecture**: build → tremolo burst → peak (feedback sustain) → hard cut
- **Silence policy**: `feedbackSustainAsRest: true`, `hardCutAtSectionBoundary: true` — solos cut off brutally, no gradual fade
- **Vamp policy**: pedal note or two-chord vamp only — no functional chord changes; one tonal center
- **GCE structural fingerprint**: bypassed in ferocity mode

### Receipt Compiler Coverage

| Prefix | Routes To |
|---|---|
| `FZ_MELO_*` | variationOperators |
| `FZ_RHY_*` | chromaticBudget |
| `FZ_HARM_*` / `FZ_BASS_*` / `FZ_FORM_*` / `FZ_DIS_*` / `FZ_GTR_*` / `FZ_ORCH_*` | riff profile fields |
| **`FZ_BURST`** (P3) | `sectionDensityPolicy` thick↔thin transitions + `cadenceTypes.hard_stop_rest` + solo density spike range |
| **`FZ_METRIC_SHIFT`** (P3) | `metricDisplacement` +0.25 (floor ~0.8) + `groupingPatterns` / superimposed 7/8 |
| **`FZ_REGISTER_COLLISION`** (P3) | wide register span (40–84) + `registerShift` operator + `zappaRegisterSwapForced` tuning flag |
| `FZ_DIFF_*` | metadataOnly: true |
| `FZ_RIFF_*` | riff profile (harm/rhy/melo/solo lane) |
| `FZBLUES_MODAL_*` | modalBase + pentatonicAnchorRatio |
| `FZBLUES_RHY_*` | rhythmicGroupings + chromaticBudget |
| `FZBLUES_PHR_*` | phraseEndingPolicy + contourShape |
| `FZBLUES_SIL_*` | silencePolicy |
| `FZBLUES_VAR_*` | variationOperators |
| `FZBLUES_REG_*` | registerPolicy |
| `FZBLUES_VAMP_*` | vampType + keyVampPatterns |

---

## Chord Progression Reference

These progressions are paste-ready for Composer OS. Use pipe-delimited format, 32-bar max, extended symbols supported.

### Compositional Mode Progressions

**Z-PROG-01 — Petrushka Bitonal Clash**
```
Cmaj7 | F#maj7 | Cmaj7 | F#maj7 | Cmaj7 | F#maj7 | Cmaj7 | F#maj7
```
*Two keys a tritone apart. GCE will flag tritone-sub cadence targets. Use with odd meter 7/8 for maximum fragmentation.*

**Z-PROG-02 — Chromatic Descent with Non-Resolution**
```
Gmaj7 | F#m7 | Fmaj7 | Em7 | Ebmaj7 | Dm7 | Dbmaj7 | Cmaj7
```
*Chromatic root descent. Engine avoids resolving to I — expect ♭II landing. Phrase fragmentation high.*

**Z-PROG-03 — Modal Vamp with Tritone Substitution**
```
Dm7 | Dm7 | Ab7 | Ab7 | Dm7 | Dm7 | Ab7 | Dm7
```
*D Dorian tonal center, Ab7 as tritone sub for A7. Slonimsky solo will navigate the Ab7 chromatically.*

**Z-PROG-04 — Odd-Meter Anchor (use with meter7 template)**
```
Fmaj7 | Fmaj7 | Bb7 | Bb7 | Ebmaj7 | Abmaj7 | Dbmaj7 | Cmaj7
```
*Cycle of fourths with a Dbmaj7 ♭II surprise before the C resolution. Set meter to 7/8.*

**Z-PROG-05 — Sudden Density Drop Trigger**
```
Bbm7 | Ebm7 | Abm7 | Dbm7 | Gbmaj7 | Bmaj7 | Emaj7 | Amaj7
```
*Full flat-side descent. Engine will generate density spike on Gbmaj7 and textural contrast on Bmaj7. Pure compositional Zappa territory.*

**Z-PROG-06 — Inca Roads-Style Lydian Shimmer**
```
Dmaj7#11 | Dmaj7#11 | Amaj7 | Amaj7 | Gmaj7#11 | Gmaj7#11 | Amaj7 | Dmaj7#11
```
*Lydian #11 throughout. I–II Lydian vamp variant. Slonimsky will deploy symmetric divisions over the #11 color.*

**Z-PROG-07 — Lumpy Gravy Cluster**
```
Cmaj7 | Dbmaj7 | Cmaj7 | Dbmaj7 | Ebmaj7 | Dbmaj7 | Cmaj7 | Bmaj7
```
*Semitone oscillation plus chromatic neighbors. ♭II cadence targets everywhere. High phrase fragmentation expected.*

**Z-PROG-08 — Yellow Shark Chamber Style**
```
Am11 | D13 | Gmaj9 | C#m7b5 | F#7alt | Bm7 | E7sus4 | Amaj7
```
*Functional harmony with altered dominants and half-diminished color. Use compositional mode, low density setting for chamber feel.*

**Z-PROG-09 — Synclavier-Style Polymodal**
```
Cmaj7 | Ebmaj7 | Gbmaj7 | Amaj7 | Cmaj7 | Ebmaj7 | Gbmaj7 | Cmaj7
```
*Augmented symmetry — major 3rd root cycle. All four chords equidistant. GCE structural fingerprint will score maximum meter disruption potential.*

**Z-PROG-10 — Thing-Fish Chromatic Shuffle**
```
Eb7 | D7 | Db7 | C7 | B7 | Bb7 | A7 | Ab7
```
*Chromatic dominant descent. Every chord a semitone lower. Phrase fragmentation engine will cut phrases at unexpected points. Good for 5/4 meter.*

---

### Blues-Rock Ferocity Mode Progressions

**Z-PROG-11 — Apostrophe Pedal (B Dorian)**
```
Bm7 | Bm7 | Bm7 | Bm7 | Bm7 | Bm7 | Bm7 | Bm7
```
*Pure B pedal. One tonal center. Engine generates freely above. Set `zappaStyleMode: bluesrockFerocious`. This is the Apostrophe title track vamp.*

**Z-PROG-12 — Stinkfoot C Dorian/Mixolydian Mingle**
```
Cm7 | Cm7 | Bb7 | Bb7 | Cm7 | Cm7 | Bb7 | Cm7
```
*C Dorian home, Bb7 as the one departure. Engine will mingle Eb/E natural — scale mingling enabled. Classic ferocity vamp.*

**Z-PROG-13 — Black Napkins i–♭IImaj7**
```
Bm7 | Cmaj7 | Bm7 | Cmaj7 | Bm7 | Cmaj7 | Bm7 | Bm7
```
*i–♭IImaj7 two-chord vamp. B minor home, C major as the color chord. Slow build ferocity. Feedback sustain on Cmaj7 expected.*

**Z-PROG-14 — Nanook Rubs It i–♭VI7**
```
Am7 | F7 | Am7 | F7 | Am7 | F7 | Am7 | Am7
```
*A minor home, F7 as ♭VI7 departure. Two chords only. Set ferocity mode, pedal-or-two-chord vamp type.*

**Z-PROG-15 — Zomby Woof Fast Mixolydian**
```
G7 | G7 | G7 | G7 | G7 | G7 | G7 | G7
```
*G Mixolydian pedal at high tempo. One chord. Set noteDensityRange to max. Tremolo burst texture expected. This is pure ferocity — no harmonic movement.*

**Z-PROG-16 — Cosmik Debris 12-Bar Blues Frame**
```
C7 | C7 | C7 | C7 | F7 | F7 | C7 | C7 | G7 | F7 | C7 | G7
```
*Only true 12-bar frame in the ferocity palette. C7#9 color. Engine will apply Dorian/Mixolydian mingling over the dominant 7ths. Chromatic alterations on every chord change.*

**Z-PROG-17 — Heavy Duty Judy Hemiola Vamp**
```
E7 | E7 | D7 | D7 | E7 | E7 | D7 | E7
```
*E Mixolydian, I–♭VII two-chord vamp. Engine plays hemiola against the shuffle. Set rhythmicGroupings to include hemiola. Band plays half-time, guitar double-time.*

**Z-PROG-18 — Torture Never Stops G Dorian Slow Build**
```
Gm7 | Gm7 | Gm7 | Gm7 | Gm7 | Gm7 | Gm7 | Gm7
```
*G pedal, extended. Start sparse, let ferocity engine build across 32 bars. Feedback sustain notes will appear as structural markers. Hard cut at bar 32.*

**Z-PROG-19 — Treacherous Cretins Dm–A Harmonic Climate**
```
Dm7 | Am7 | Dm7 | Am7 | Dm7 | Am7 | Dm7 | Dm7
```
*D Dorian home, A major as "harmonic climate" departure. Speech-influenced rhythmic groupings expected. Ferocity mode.*

**Z-PROG-20 — Soup 'n Old Clothes Extreme Density**
```
Dm7 | Dm7 | Dm7 | Dm7 | Dm7 | Dm7 | Dm7 | Dm7
```
*D pedal. Maximum noteDensityRange. This is the "costs an hour to transcribe a single bar" vamp. Do not attempt to follow the output on paper.*

---

## 20 Scenarios for Experimentation

### Compositional Mode Scenarios

**Scenario 1 — Orchestral Fragment Generator**
Use Z-PROG-09 (augmented symmetry). Set meter to `meter9`. Density: Sparse. Compositional mode. Output will be a set of melodic fragments that never resolve — useful as a compositional sketch for arrangement.

**Scenario 2 — Meter-Splice Study**
Use Z-PROG-04 with meter7 template. Compositional mode. The 7/8 template will splice against the 4/4 implied by the chord progression. Observe where the GCE structural fingerprint places phrase fragmentation points — these are the bar breaks Zappa would have composed-in.

**Scenario 3 — Tritone Substitution Workout**
Use Z-PROG-03. Compositional mode. Watch the Slonimsky engine navigate the Ab7 tritone sub. The guide-tone nudges will pull the solo line toward D and F# (the 3rd and 7th of Ab7 = ♭7 and 3rd of Dm7 swapped). Good harmonic ear training.

**Scenario 4 — Chromatic Descent Composition**
Use Z-PROG-02. Set density to Medium. Compositional mode. Phrase fragmentation will cut across the smooth root descent — you get a composed tension between the harmonic logic (smooth) and the structural logic (jagged). Classic Zappa opposition.

**Scenario 5 — Petrushka Bitonal Clash**
Use Z-PROG-01. Compositional mode, density Busy. GCE will score the tritone clash as maximum disruption. Slonimsky will deploy symmetric cells that work in both C and F# simultaneously. Output is atonal-adjacent without being free.

**Scenario 6 — Chamber Reduction**
Use Z-PROG-08. Compositional mode, density Sparse, 2-bar loop length. Output will be sparse, chord-tone targeted, wide interval. Useful for adding a Zappa-flavored melodic line over complex harmony — Yellow Shark territory.

**Scenario 7 — Yellow Shark Texture Build**
Use Z-PROG-05 (flat-side descent). Start Sparse, regenerate at Medium, then Busy across three passes. Observe how the density spike lands on Gbmaj7 each time — this is the GCE structural fingerprint at work.

**Scenario 8 — Lumpy Gravy Semitone Oscillation**
Use Z-PROG-07. Compositional mode. Density: Medium. The semitone oscillation between C and Db will drive the engine to produce chromatic neighbor-note phrases. Expect ♭II landings on every Dbmaj7.

**Scenario 9 — Synclavier Polymodal Sketch**
Use Z-PROG-09 in 32-bar form (repeat twice). Compositional mode. The augmented symmetry means every chord is a new tonal center — the engine treats each as a fresh modal environment. Output functions as a polymodal étude.

**Scenario 10 — Thing-Fish Chromatic Shuffle**
Use Z-PROG-10 with meter5 template (5/4). Compositional mode, Busy density. The chromatic dominant descent in 5/4 produces maximum phrase churn. Hard to follow, impossible to predict — exactly right.

---

### Blues-Rock Ferocity Mode Scenarios

**Scenario 11 — Pure Pedal Eruption**
Use Z-PROG-11 (B pedal). Ferocity mode. 32 bars. Density: Busy. This is the closest the engine gets to the Apostrophe title track solo. Let it run the full 32 bars — the hard cut at the end is correct behaviour, not an error.

**Scenario 12 — Scale Mingling Study**
Use Z-PROG-12 (Stinkfoot vamp). Ferocity mode. Watch the engine alternate Eb and E natural across the Cm7–Bb7 changes. These are the Dorian/Mixolydian neighbour notes (Dorian has natural 6, Mixolydian has ♭7) — the engine mingles them at phrase transitions.

**Scenario 13 — Two-Chord Slow Build**
Use Z-PROG-13 (Black Napkins). Ferocity mode. Start Sparse. The feedback sustain notes will appear on the Cmaj7 chord — these are the silence-proxy events. After 8 bars the engine builds toward Busy. Do not intervene.

**Scenario 14 — Hemiola Against Shuffle**
Use Z-PROG-17 (Heavy Duty Judy). Ferocity mode. Set rhythmicGroupings to hemiola. The engine will play 3-against-4 phrasing over the E7–D7 shuffle. This is the exact rhythmic mechanism Zappa described in his own words.

**Scenario 15 — Maximum Density Stress Test**
Use Z-PROG-20 (D pedal). Ferocity mode. noteDensityRange max. 32 bars. This is the Soup 'n Old Clothes scenario. Output will be dense enough to be unreadable as notation — use the MusicXML export and zoom out to see the contour shape rather than individual notes.

**Scenario 16 — 12-Bar Ferocity**
Use Z-PROG-16 (Cosmik Debris). Ferocity mode. This is the only 12-bar blues in the palette. The engine applies modal mingling over standard 12-bar changes — output sits between blues and jazz-fusion. Good for comparing against a straight Hendrix or Iommi pass on the same changes.

**Scenario 17 — Low-Register Melody Pass**
Use Z-PROG-18 (Torture Never Stops). Ferocity mode. Set register bias to low (6th/5th string). The engine will generate low-string melodies as per `lowStringMelodyProbability: 0.25`. Contrast with a standard high-register pass on the same vamp.

**Scenario 18 — Motif Cycled Three Times**
Use Z-PROG-19 (Treacherous Cretins). Ferocity mode. 8 bars. Regenerate three times from the same seed. Observe how the engine cycles the core motif with varied rhythmic starts (quintuplet → straight 8th → triplet) — this is `cycledMotifRhythmVariation` in action.

**Scenario 19 — Fast Mixolydian Burst**
Use Z-PROG-15 (Zomby Woof G pedal). Ferocity mode. Busy density. Short loop: 2 bars. Regenerate rapidly. Each pass is a different tremolo burst pattern over the same G7 pedal. Use stem export to compare outputs side by side.

**Scenario 20 — Ferocity vs Compositional — Same Changes**
Use Z-PROG-03 (Dm7–Ab7 tritone vamp) in both modes. Run compositional first, then ferocity on the same progression. Compare: compositional output will be structured, fragmented, meter-disrupted; ferocity output will be modal, dense, rhythmically irregular. Same harmony, completely different musical world.

---

## MusicXML Export Notes

All Zappa outputs export as:
- **Electric Guitar** (GM 28) — riff and compositional layers
- **Electric Guitar Solo** (GM 31) — Slonimsky solo lane

In ferocity mode, tremolo burst passages will appear as dense 32nd-note runs in MusicXML. This is correct. Do not attempt to simplify notation — the density is the point.

Feedback sustain events export as whole notes with a sustain articulation marker. Hard cuts export as a double barline at the section boundary.

---

## Known Gaps (Post-V59)

| Gap | Status |
|---|---|
| Quote/collage generative mode | metadataOnly: true — future phase |
| zappaStyleMode UI selector (compositional vs ferocity) | ✅ shipped — Advanced panel, frank_zappa only |
| zappaEraPreset / zappaPhraseCharacter / zappaSymmetryBias / zappaChainDepth | pending — riff API surface area needed first (5b) |
| zappaStyleMode riff path wiring | pending — styleMode currently affects duo path only; riff solo adapter does not receive context/metadata |
| Nile Rodgers deepening receipts | pending |
| Carlton + Gilmour golden fixture refresh | pending after receipt deepening |
| Zappa GCE structural fingerprint: Ionian/Lydian mode coverage | ✅ scored — Lydian #11 + no V→I; Ionian major field + phrase endings avoid tonic; metric displacement on phrase starts |

---

## Quick Reference — Zappa Generation Checklist

```
1. Choose mode:        zappaStyleMode: 'compositional' | 'bluesrockFerocious'
2. Choose vamp:        paste progression from Z-PROG-01 through Z-PROG-20
3. Choose meter:       compositional → meter5/7/9/10/mahavishnu/fripp/weatherReport
                       ferocity → 4/4 default (meter disruption is internal)
4. Choose density:     Sparse / Medium / Busy
5. Choose loop length: 2 / 4 / 8 / 16 / 32 bars
6. Export:             MusicXML → Electric Guitar + Electric Guitar Solo
7. Compare:            run same progression in both modes for maximum insight
```

---

*Composer OS Handbook — Zappa Chapter — V59 — 2026-05-22*
