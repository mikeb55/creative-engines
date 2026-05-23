# Composer OS — Musician Guide

*A plain-English guide to getting musical results from Composer OS.*
*For engine and architecture detail see COMPOSER_HANDBOOK.md.*

---

## How to use this guide

Each part is self-contained. If you know what mode you want, jump to Part 4. If you're not sure which voice to pick, start with Part 2. If you just want to paste chords and go, read the two-minute summary below.

---

## Two-minute summary

1. Open Composer OS
2. Paste your chord progression into the chord input field (e.g. `Cmaj7 | Am7 | Fmaj7 | G7`)
3. Pick a Mode (Song Mode, Big Band, String Quartet, Guitar-Bass Duo, etc.)
4. Pick a Compositional Voice (who is composing — Metheny, Shorter, Ellington, etc.)
5. Pick a Slonimsky Flavor if you want outside melodic color (Lyrical, Angular, Patterned, Chromatic, Riff)
6. Hit Generate
7. Open the MusicXML in Sibelius, Guitar Pro, or Cubase

That's it. Everything else in this guide is about going deeper.

---

## Part 1 — Modes

*What each mode sounds like and when to use it.*

---

### 1.1 Song Mode

**What it produces:** A full composition with melody, harmony, and inner voices written for a lead instrument + rhythm section. Think: a finished lead sheet brought to life.

**When to use it:** When you want a singable or playable melody over your chord changes, in the style of a specific composer or songwriter.

**What drives the output:** The songwriter you select shapes melody, harmony, and rhythm profile. Slonimsky flavor shapes the outside melodic color on top.

**Best for:** Jazz heads, pop writing, singer-songwriter ideas, ECM-style ballads, film themes.

---

### 1.2 Big Band

**What it produces:** Full ensemble writing across brass, saxes, and rhythm section. Arranged in sections — not just melody + comp.

**When to use it:** When you want a fully-voiced big band chart with section writing, shout choruses, and orchestrated harmony.

**What drives the output:** The arranger voice you select (Thad Jones, Sammy Nestico, Maria Schneider, etc.) shapes voicing density, section balance, and harmonic approach. Slonimsky ensemble controls shape how cells move through the ensemble.

**Best for:** Big band charts, orchestral jazz, large ensemble writing.

---

### 1.3 String Quartet

**What it produces:** Four-voice writing for two violins, viola, and cello.

**When to use it:** When you want chamber music writing with independent voices, not just melody + accompaniment.

**What drives the output:** The harmonic voice shapes voice-leading style and register approach. Slonimsky texture controls shape how independent the four voices are.

**Best for:** Classical/contemporary chamber writing, film underscore, modern quartet music.

---

### 1.4 Guitar-Bass Duo

**What it produces:** Two-voice writing for guitar and bass — melodic, groove-based, or textural depending on the voice and outside level.

**When to use it:** When you want a two-instrument output that works as a standalone piece or as a section of a larger arrangement.

**What drives the output:** The VRB voice shapes the melodic character. The Slonimsky Outside Level (Off / Subtle / Prominent) controls how far outside the harmony the lines reach.

**Best for:** Guitar/bass duo pieces, sketch ideas, groove-based riff writing.

---

### 1.5 Guitar-Bass Duo Single Line

**What it produces:** One melodic line, guitar-led, with bass following closely.

**When to use it:** When you want a single unison or octave-doubled line rather than independent voices.

**Best for:** Unison melody writing, guitar feature lines.

---

### 1.6 ECM Chamber

**What it produces:** Sparse, impressionist chamber writing. Space-first — long note values, open harmony, minimal density.

**When to use it:** When you want something that breathes — ECM Records aesthetic, Nordic jazz, open-air chamber.

**Best for:** Film scoring, ambient-adjacent jazz, palette-cleansing sections.

---

### 1.7 Riff Generator

**What it produces:** Short loops (1–32 bars) of groove-based writing. Designed to be looped or repeated as a section.

**When to use it:** When you want a repeating hook, vamp, or groove section — not a through-composed piece.

**Controls:**
- Loop length: 1, 2, 4, 8, 16, or 32 bars
- Family: Funk / Rock / Fusion / Art Rock
- VRB: Nile Rodgers, Led Zeppelin, Weather Report, Fripp, and others
- Density: Sparse / Medium / Dense
- Grid: Eighth / Sixteenth
- Line mode: Single line / Guitar-bass / Octave double
- Odd meter: Meter 5 / Meter 7 / Mahavishnu (Fusion and Art Rock only)

**Best for:** Groove writing, section vamps, intro/outro riffs, odd-meter phrases.

---

### 1.8 Slonimsky Etude

**What it produces:** A pattern-driven melodic etude built directly from Slonimsky cell sequences. No songwriter or harmonic voice — pure pattern.

**When to use it:** When you want to explore a Slonimsky pattern directly rather than as a flavoring on top of a compositional voice.

**Best for:** Practice material, study, melodic pattern exploration.

---

### 1.9 SQ→BB Hybrid

**What it produces:** A composition that moves between String Quartet and Big Band, or holds both ensembles simultaneously in a directed relationship.

**When to use it:** When you want the two ensembles to interact — one leading, one responding, or both locked together.

**What drives the output:** The SQ composer voice + the BB arranger voice + the Ensemble Relationship settings (conversation / contrast / unison / call and response).

**Best for:** Large ensemble writing, hybrid orchestration, through-composed multi-section works.

---

### 1.10 Choosing the right mode — decision table

| I want... | Use this mode |
|---|---|
| A melody over my chord changes | Song Mode |
| Full big band chart | Big Band |
| Four-voice chamber writing | String Quartet |
| Two-voice guitar and bass | Guitar-Bass Duo |
| A repeating groove or riff | Riff Generator |
| Sparse, open, ECM-style | ECM Chamber |
| Both SQ and BB together | SQ→BB Hybrid |
| Pure Slonimsky pattern study | Slonimsky Etude |

---

## Part 2 — Compositional Voices

*Who they are musically and what they change in your output.*

---

### 2.1 What a compositional voice does

A compositional voice (also called a VRB — Voice Rule Bundle) is a set of musical rules derived from studying how a specific composer or artist writes. It shapes:

- **Melody:** How lines move, interval sizes, phrase lengths
- **Harmony:** Which voicings get used, how chords are approached and left
- **Voice leading:** How inner voices move between chords
- **Rhythm:** Swing feel, rhythmic density, groove character
- **Register:** High/low tendencies, spread, register contrast

Selecting a voice doesn't mean the engine copies that artist's music. It means the engine composes using the same tendencies and priorities that artist uses.

---

### 2.2 Voice depth — what it means for your output

Some voices have deep research behind them (10+ fingerprint receipts) and produce highly differentiated output. Others are thinner and may sound more generic.

**Deep voices (most differentiated output):**
John Coltrane · Pat Metheny · Clare Fischer · Quincy Jones · Sammy Nestico · Count Basie · Duke Ellington · Gil Evans · Wayne Shorter · Maria Schneider · Thad Jones · Charles Mingus · Bob Brookmeyer · Olivier Messiaen · Oliver Nelson

**Good voices (solid differentiation):**
Bill Evans · Herbie Hancock · Thelonious Monk · Debussy · Ravel · Bartok · Shostakovich · Jobim · Arvo Pärt · Ornette Coleman · Coltrane · Gershwin · Cole Porter

**Note on Sonic Youth:** Listed as a Slonimsky song-mode writer but has no dedicated voice bundle — falls back to a generic profile. A warning badge appears in the UI. Use another writer if you need a specific character.

---

### 2.3 Song Mode voices

These voices work in Song Mode and shape melody + harmony + rhythm as a complete musical personality.

| Voice | Musical character | Best chord context |
|---|---|---|
| **Pat Metheny** | Open, singing lines with lift and space. Warm, clean-edged, lyrical. | Major 7ths, sus chords, open voicings |
| **Wayne Shorter** | Oblique, elliptical, post-bop. Lines that imply without stating. | Altered chords, modal ambiguity |
| **Bill Evans** | Flowing, inward, color-rich. Dense inner voices, modal clarity at the surface. | Minor 7ths, major 7ths, sus |
| **Herbie Hancock** | Sharply shaped, mobile, post-bop into fusion. Rhythmically alert. | Dominant chords, altered harmony |
| **Thelonious Monk** | Angular, surprising, rhythmically displaced. Never where you expect. | Blues changes, ii-V-I, tritone subs |
| **John Coltrane** | Interval-cell driven, cyclical, high density. Sheets of sound. | Coltrane changes, modal, Giant Steps |
| **Joni Mitchell** | Open-tuning quartal harmony. Clear, floating, graceful with surprising turns. | Open voicings, sus2/sus4, modal |
| **Frank Zappa** | Twisted, jagged, colorful, a little dangerous. High ferocity when pushed. | Any — Zappa ignores convention |
| **Radiohead** | Uneasy, fragile, tense with art-rock bite. Metric unease. | Minor, altered, chromatic mediant |
| **Duke Ellington** | Warm orchestral jazz. Sophisticated melody, rich inner voices. | Standards, ii-V-I, blues |
| **Debussy** | Parallel planing, whole-tone color, impressionist space. | Major 7#11, sus, open |
| **Jobim** | Bossa nova melody character, Brazilian harmonic color, lightness. | Major 7ths, minor 7ths, bossa changes |

---

### 2.4 Guitar-Bass Duo voices

These voices work in Guitar-Bass Duo mode and shape the two-voice interaction.

| Voice | Musical character |
|---|---|
| **Nile Rodgers** | Groove-first, hook-driven, rhythmically tight. Riff is the default. |
| **Eddie Van Halen** | Virtuosic rock energy, riff-based with angular motion. |
| **Larry Carlton** | Smooth, singing melodic lines, polished jazz-pop harmonic color. |
| **David Gilmour** | Strong melodic shape, sustained phrasing, memorable hooks. |
| **Hendrix** | Blues-rock vocabulary, wide dynamic range, expressive bends implied. |
| **Fripp** | Oblique, layered, textural. Outside the groove, into sound. |

---

### 2.5 Big Band arrangers

These voices work in Big Band mode and shape section writing, voicing density, and orchestral character.

| Voice | Musical character |
|---|---|
| **Thad Jones** | Warm, swinging, orchestral. The gold standard of modern big band. |
| **Sammy Nestico** | Clean, direct, driving. Count Basie's most trusted arranger. |
| **Bob Brookmeyer** | Chamber-influenced, voice-led, harmonically sophisticated. |
| **Maria Schneider** | Impressionist, spacious, orchestral color. ECM-adjacent big band. |
| **Gil Evans** | Modal, textural, wide-register. Miles Davis Nonet aesthetic. |
| **Oliver Nelson** | Blues-modal hybrid, pedal-based form, two-layer architecture. |
| **Quincy Jones** | Pop-jazz crossover, clean voicings, commercial but sophisticated. |
| **Clare Fischer** | Dense inner voices, complex harmony, Latin-influenced. |
| **Count Basie** | Riff-head writing, shout choruses, Basie Button, groove-first. |

---

### 2.6 String Quartet / SQ→BB voices

These voices work in String Quartet and SQ→BB Hybrid mode.

| Voice | Musical character |
|---|---|
| **Bartok** | Chromatic clusters, displaced downbeats, Eastern European modal color. |
| **Ravel** | Refined voice-leading, impressionist color, surface elegance. |
| **Shostakovich** | Dark, sardonic, rhythmically displaced. Soviet-era dramatic character. |
| **Messiaen** | Limited transposition modes, birdsong ornament, color-as-harmony. |
| **Joni Mitchell** | SQ stub — open-tuning quartal color in a chamber context. |
| **Herrmann** | Hitchcock chromatic tension, stabbing brass gestures (adapted for SQ). |
| **Williams** | Orchestral sweep, strong melodic statement, Hollywood narrative. |
| **Morricone** | Epic modal drama, space and silence as structural elements. |
| **Glass** | Additive diatonic cells, cycling patterns, minimal harmonic motion. |
| **Badalamenti** | Twin Peaks noir space, chromatic ambiguity, dark atmosphere. |

---

### 2.7 Harmonic voice vs songwriter — what's the difference

**Songwriter** shapes the full compositional character — melody, rhythm, harmony, form all at once.

**Harmonic voice** shapes specifically the harmonic and voice-leading layer — which voicings get used, how chords are approached, what inner voices do. It's a more targeted influence.

In practice: you can set a songwriter AND a harmonic voice. The songwriter drives the surface; the harmonic voice colors the harmony underneath. For example: Metheny as songwriter + Coltrane as harmonic voice produces Metheny-style melody over Coltrane-influenced harmony.

---

### 2.8 Blending two voices

You can blend two VRBs with a weight split (e.g. `Debussy 0.5 + Ravel 0.5`). The blend interpolates between the two voice profiles — the closer in character they are, the smoother the result. Cross-family blends (e.g. Messiaen + Nile Rodgers) are possible but produce less predictable output.

**Good blends:**
- Debussy + Ravel — impressionist watercolour, smooth
- Morricone + Herrmann + Badalamenti — cinematic layering
- Zimmer + Morricone — modern epic with modal drama
- Cole Porter + Gershwin — Broadway gradient

**Unusual blends (intentionally strange):**
- Coltrane + Bartok — interval-cell density meets chromatic clusters
- Ornette Coleman + Arvo Pärt — harmolodic freedom frames tintinnabuli stillness

---

## Part 3 — Slonimsky Controls

*What they do musically. No theory required.*

---

### 3.1 What Slonimsky is — plain English

Nicolas Slonimsky catalogued 78 melodic patterns in his Thesaurus of Scales and Melodic Patterns (1947). These patterns — called cells — divide the octave in unusual ways, creating melodic shapes that don't follow normal scale logic. Coltrane used them. Zappa used them. They're the source of that "outside but organized" quality in advanced jazz and contemporary classical writing.

In Composer OS, the Slonimsky engine picks cells that fit your chord changes and applies them as melodic color. You don't choose individual cells — you set the flavor and direction, and the engine does the choosing.

---

### 3.2 The five flavors

| Flavor | What it sounds like | Genre / mood |
|---|---|---|
| **Lyrical** | Smooth, singable, flowing. A line you could breathe. | Jazz ballads · Film scoring · ECM-style improv |
| **Angular** | Jumping, sharp-edged, restless. Wide intervals, direction changes. | Art rock · Post-bop · Tense modern chamber |
| **Patterned** | Balanced, slightly uncanny. A phrase that turns around itself. | Modern classical · Prog · Hypnotic soundtrack |
| **Chromatic** | Slippery, dark, searching. Slides and squeezes between notes. | Noir film cues · Avant-jazz · Uneasy slow burns |
| **Riff** | Hooky, driving, repeatable. Locks into a shape with physical pull. | Guitar-driven rock · Fusion vamps · Groove-based |

*(Note: Patterned = Symmetric internally. Display name changed for clarity.)*

---

### 3.3 The three knobs

| Knob | Left (-1) | Right (+1) |
|---|---|---|
| **Motion** | Grounded, stepwise, stays close | Wide-leaping, rangy, interval-driven |
| **Tension** | Calm, consonant, settled | Charged, dark, unresolved |
| **Variation** | Consistent — keeps its shape bar to bar | Unpredictable — morphs further each bar |

**Practical combinations:**

| Sound you want | Motion | Tension | Variation |
|---|---|---|---|
| Settled, lyrical, consistent | -0.3 | -0.5 | -0.3 |
| Building energy | 0 | +0.4 | +0.3 |
| Maximum ferocity (Zappa) | +0.9 | +0.8 | +0.8 |
| Floating, open, ECM | -0.4 | -0.6 | -0.2 |
| Post-bop tension | +0.5 | +0.7 | +0.4 |
| Minimal, patterned | -0.2 | 0 | -0.5 |

---

### 3.4 The harmonic voice selector

Separate from the Slonimsky flavor. The harmonic voice selector lets you assign a specific VRB to the harmonic layer independently of which songwriter is active. This gives you:

- A songwriter driving the melody and rhythm
- A different voice coloring the harmony underneath

Example: Frank Zappa as songwriter + Wayne Shorter as harmonic voice = Zappa's melodic wildness over Shorter's harmonic ellipsis.

Available per mode — the selector shows only voices confirmed to work in the active mode.

**Note on Sonic Youth:** Shows a ⚠ warning badge. No dedicated voice bundle exists — output falls back to a generic profile.

---

### 3.5 The bar-cell strip

After generating, the bar-cell strip shows which Slonimsky cells fired in each bar. Hover over a bar to see the cell ID and pattern name. This lets you see exactly what the engine chose and — in the Advanced drawer — pin or forbid those specific cells on the next pass.

---

### 3.6 The Advanced drawer

The Advanced drawer is the deepest level of Slonimsky control. Open it by clicking the drawer toggle (above the Generate button).

**Cell family browser:** Shows all five flavor families. Expand any family to see the individual cells within it.

**Pin a cell:** Mark a cell to always appear in the next generation. Use this when you like what a specific cell did and want to keep it.

**Forbid a cell:** Mark a cell to never appear. Use this when a cell produced something you don't want repeated.

**Dual-use hint:** Cells that appear in more than one flavor family show a tooltip indicating the overlap. This is useful when you want to bridge between flavors.

**Zappa section:** When Frank Zappa is selected as songwriter or harmonic voice, the drawer gains a Zappa-specific section with ferocity controls, era preset, phrase character, symmetry bias, and chain depth.

---

## Part 4 — Slonimsky by Mode

*Recipes: settings that produce specific musical results.*

---

### 4.1 Song Mode recipes

**Recipe 1 — ECM ballad (Metheny / Lyrical)**
```
Chords:    Cmaj9 | Bm7 | Am9 | Gmaj7
Writer:    pat_metheny
Flavor:    Lyrical
Motion:    -0.3
Tension:   -0.5
Variation: -0.2
```
*Expect:* Floating, spacious, singable. Long phrase arcs. Open inner voices. The kind of melody that sits comfortably over ECM-style chord movement.

---

**Recipe 2 — Post-bop tension (Shorter / Angular)**
```
Chords:    Dm7b5 | G7alt | Cbmaj7 | Ebm9
Writer:    wayne_shorter
Flavor:    Angular
Motion:    +0.6
Tension:   +0.7
Variation: +0.4
```
*Expect:* Oblique, restless, searching. Lines that imply rather than state. Harmonic ambiguity at every turn. Classic Shorter ellipsis.

---

**Recipe 3 — Zappa ferocity burst**
```
Chords:    Am7 | Am7 | Am7 | Am7 | Am7 | Am7 | Am7 | Am7
Writer:    frank_zappa
Flavor:    Chromatic
Motion:    +0.9
Tension:   +0.8
Variation: +0.8
```
*Expect:* Dense, jagged, unpredictable. Maximum ferocity. Burst bars with 12+ events. The engine pushes hard against the static harmony. Open in Sibelius and check the note density per bar.

---

**Recipe 4 — Folk openness (Mitchell / Lyrical)**
```
Chords:    G/B | Cadd9 | D/F# | Em
Writer:    joni_mitchell
Flavor:    Lyrical
Motion:    -0.2
Tension:   -0.6
Variation: -0.4
```
*Expect:* Clear, open, natural arc. Quartal inner voices. Melody that floats above the changes rather than navigating them. Mitchell's open-tuning aesthetic in a standard notation context.

---

**Recipe 5 — Art rock unease (Radiohead / Angular)**
```
Chords:    Em9 | Cmaj7#11 | Bm7 | F#m
Writer:    radiohead
Flavor:    Angular
Motion:    +0.4
Tension:   +0.6
Variation: +0.5
```
*Expect:* Fragile, tense, art-rock bite. Metric unease in the inner voices. Melody that feels slightly off-kilter but always intentional.

---

**Recipe 6 — Coltrane cycles (Coltrane / Patterned)**
```
Chords:    Emaj7 | Cmaj7 | Abmaj7 | Emaj7
Writer:    john_coltrane  (harmonic voice)
Flavor:    Patterned
Motion:    +0.5
Tension:   +0.6
Variation: +0.3
```
*Expect:* Cyclic, driven, interval-cell saturation. The patterned flavor suits Coltrane's tendency to repeat and develop interval cells across the Giant Steps cycle. Feels organized but relentless.

---

### 4.2 Song Mode — section shaping

Use pin/avoid to build an arc across a full song form.

**Tension build through sections:**
```
Intro:      Pin Lyrical · Avoid Chromatic
Verse:      Pin Lyrical
Pre-chorus: Unpin · Allow Angular
Chorus:     Pin Angular · Avoid Lyrical
Bridge:     Pin Chromatic
Outro:      Pin Lyrical
```
*Result:* Composition starts settled and open, builds through restlessness into maximum tension at the bridge, then resolves back to the opening character.

**Contrast arc (AABA form):**
```
A sections: Pin Lyrical
B section:  Pin Angular · Avoid Lyrical
```
*Result:* Classic AABA contrast — the bridge feels genuinely different, not just a different key.

---

### 4.3 Big Band recipes

**Recipe 1 — Thad Jones swing**
```
Chords:       Bbmaj7 | Gm7 | Cm7 | F7
Voice:        thad_jones
Flavor:       Lyrical
Section Role: Lead
Cohesion:     +0.6
Harmonic Grip: +0.5
Preset:       Orchestral
```
*Expect:* Warm, swinging, full ensemble. Lead section carries the melody, inner sections fill with characteristic Thad Jones voicings.

---

**Recipe 2 — Maria Schneider impressionist**
```
Chords:       Emaj7#11 | F#m9 | Dmaj7 | Amaj7
Voice:        maria_schneider
Flavor:       Patterned
Section Role: Support
Cohesion:     +0.3
Harmonic Grip: +0.7
Preset:       Orchestral
```
*Expect:* Spacious, layered, floating. Wide register spread. Sections that color rather than state. ECM-adjacent big band writing.

---

**Recipe 3 — Ferocious fusion BB**
```
Chords:       E7#9 | Bb7#11 | A7alt | D7#9
Flavor:       Angular
Section Role: Counter
Cohesion:     -0.2
Harmonic Grip: +0.8
Preset:       Fusion
```
*Expect:* Jagged, aggressive, dense. Counter-melodic lines fighting each other. High harmonic grip means the engine stays close to the altered chord tones even while pushing outside.

---

**Recipe 4 — Bebop head**
```
Chords:       Dm7 | G7alt | Cmaj7 | A7b9 | Dm7 | G7 | Cmaj7 | Cmaj7
Voice:        count_basie  (or oliver_nelson)
Flavor:       Chromatic
Section Role: Lead
Cohesion:     +0.8
Harmonic Grip: +0.6
Preset:       Bebop
```
*Expect:* Fast, chromatic, bebop-flavored melody in the lead section with characteristic bebop inner voice movement underneath.

---

### 4.4 String Quartet recipes

**Recipe 1 — Bartok tension**
```
Chords:    Cm | F#m | Ebm | Am
Voice:     bartok
Flavor:    Angular
Texture Role: Counterpoint
Voice Independence: +0.8
Register Spread: +0.6
Preset:    Modern
```
*Expect:* Four independent voices, each moving against the others. Chromatic cluster harmony. Eastern European modal color. High rhythmic and melodic independence.

---

**Recipe 2 — Arvo Pärt stillness**
```
Chords:    Amaj | E | F#m | Amaj
Voice:     part
Flavor:    Lyrical
Texture Role: Melody
Voice Independence: -0.6
Register Spread: -0.3
Preset:    Minimal
```
*Expect:* Sparse, pure, tintinnabuli-adjacent. The melody voice sings a simple line while the other voices move in slow, consonant support. Silence is structural.

---

**Recipe 3 — Reich phasing feel**
```
Chords:    Dm | Am | Dm | C | Dm | Am | Bb | C
Voice:     reich_glass
Flavor:    Patterned
Texture Role: Accompaniment
Voice Independence: +0.4
Register Spread: -0.2
Preset:    Minimal
```
*Expect:* Cycling, hypnotic, pattern-driven. The patterned flavor suits Reich's additive process — phrases that shift by small increments. Low register spread keeps the voices close together.

---

**Recipe 4 — Romantic lush**
```
Chords:    Dbmaj7 | Bbm7 | Ebm7 | Ab7 | Dbmaj7
Voice:     ravel  (or dutilleux)
Flavor:    Lyrical
Texture Role: Melody
Voice Independence: -0.4
Register Spread: -0.5
Preset:    Romantic
```
*Expect:* Rich, singing, expressive. Upper violin carries a long melodic line. Inner voices move in smooth, Ravel-style voice leading. Full register with close spacing.

---

### 4.5 Guitar-Bass Duo recipes

**Recipe 1 — Metheny open**
```
Chords:        Gmaj9 | Em9 | Cmaj7 | D11
Voice:         pat_metheny
Outside Level: Subtle
```
*Expect:* Warm, open, lyrical. Guitar carries a clean singing line. Bass provides mobile harmonic support. Outside cells appear occasionally — not intrusive, just colorful.

---

**Recipe 2 — Nile Rodgers groove**
```
Chords:        E9 | A9 | B9 | E9
Voice:         nile_rodgers
Outside Level: Off
```
*Expect:* Hooky, groove-first, tight. Guitar stays close to the chord tones with strong rhythmic character. Bass locks in. No outside cells — this is about the groove, not the color.

---

**Recipe 3 — Van Halen riff energy**
```
Chords:        E5 | D5 | A5 | B5 | E5 | D5 | A5 | A5
Voice:         eddie_van_halen
Outside Level: Subtle
```
*Expect:* Driving, riff-based, angular. Power chord context pushes the engine toward strong rhythmic riff shapes. Subtle outside level adds occasional color without losing the energy.

---

**Recipe 4 — Fripp texture**
```
Chords:        Fmaj7#11 | Cmaj7 | Gmaj7 | Dmaj7
Voice:         fripp
Outside Level: Prominent
```
*Expect:* Oblique, layered, textural. Prominent outside level means cells frequently step away from the chord tones. Fripp's voice profile pushes toward sound-as-texture rather than melody-as-hook.

---

**Recipe 5 — Larry Carlton jazz-pop**
```
Chords:        Cmaj7 | Am7 | Dm7 | G7 | Cmaj7 | Am7 | Fmaj7 | G7
Voice:         larry_carlton
Outside Level: Subtle
```
*Expect:* Smooth, singing, polished. Carlton's voice profile produces clean jazz-pop lines — melodic, accessible, harmonically sophisticated without being aggressive.

---

### 4.6 SQ+BB Hybrid recipes

**Recipe 1 — Conversation**
```
Chords:               Cmaj7 | Am7 | Fmaj7 | G7
Ensemble Relationship: Conversation
Foreground Owner:      Alternating
Density Split:         0
Register Carve:        0
```
*Expect:* SQ and BB trade phrases — one speaks, the other listens. Equal density, equal register. The most natural hybrid texture.

---

**Recipe 2 — Contrast**
```
Chords:               Dbmaj7 | Bbm7 | Ebm9 | Ab7
Ensemble Relationship: Contrast
Foreground Owner:      BB
Density Split:         +0.6
Register Carve:        -0.5
```
*Expect:* BB dense and low, SQ sparse and high. Maximum contrast between the two ensembles. BB carries the weight, SQ provides high filigree.

---

**Recipe 3 — Unison power**
```
Chords:               E7#9 | A7#9 | D7#9 | G7#9
Ensemble Relationship: Unison
Foreground Owner:      BB
Density Split:         +0.8
Register Carve:        +0.3
```
*Expect:* Both ensembles locked together — one massive sound. High density split means BB dominates the texture, SQ reinforces rather than leads.

---

**Recipe 4 — Call and response**
```
Chords:               Bm9 | E13 | Amaj7 | F#m9
Ensemble Relationship: Call and response
Foreground Owner:      SQ
Density Split:         -0.3
Register Carve:        +0.6
```
*Expect:* SQ calls high, BB responds low. The register carve separates them in space. SQ leads — delicate, high, melodic. BB answers — warm, low, full.

---

### 4.7 Advanced drawer recipes

**Pin + flavor combination:**
Pin a lyrical cell, then switch to angular flavor. The engine uses angular motion but returns to the pinned lyrical cell as an anchor. Result: angular movement with a melodic home base.

**Forbid edge case:**
Forbid all cells in the chromatic family, then set chromatic flavor. The engine is forced toward neighboring families — the result sounds like chromatic intent with slightly diatonic resolution. Useful for "almost outside" writing.

**Zappa ferocity via drawer:**
Open the Zappa section inside the drawer. Set:
- Era preset: Blues-Rock Ferocious
- Phrase character: Burst
- Symmetry bias: High
- Chain depth: Maximum

Combined with Chromatic flavor + Motion +0.9 + Tension +0.8 — this is full Zappa ferocity mode. Expect dense burst bars, feedback proxy silence events at phrase ends, maximum outside color.

---

## Part 5 — Section Shaping

*Building an arc across a full arrangement.*

---

### 5.1 What sections are

Composer OS understands standard section labels: **intro · verse · pre-chorus · chorus · bridge · outro** (song mode) and **opening · statement · development · contrast · climax · coda** (instrumental mode).

Each section can have its own Slonimsky flavor pinned or avoided. This means the engine doesn't use one uniform flavor across the whole piece — it follows the arc you set.

---

### 5.2 Pin and Avoid — plain English

**Pin:** "Keep this flavor active here. Make sure cells from this family appear in this section."

**Avoid:** "Steer away from this flavor here. Don't use cells from this family in this section."

You can pin and avoid different flavors in the same section — e.g. pin lyrical and avoid chromatic on the verse, then reverse it on the bridge.

---

### 5.3 Building tension through sections

This is the most common use of section shaping — a composition that starts open and settled, builds through restlessness, peaks at maximum tension, and resolves.

```
Intro:       Pin Lyrical, Avoid Chromatic
Verse:       Pin Lyrical
Pre-chorus:  No pin (allow any flavor)
Chorus:      Pin Angular, Avoid Lyrical
Bridge:      Pin Chromatic, Avoid Lyrical
Outro:       Pin Lyrical, Avoid Chromatic
```

The result tracks a clear emotional arc: settled → open → restless → tense → searching → resolved.

---

### 5.4 Contrast arc

For AABA or verse-chorus structures where the bridge or B section needs to feel genuinely different:

```
A / Verse sections:  Pin Lyrical
B / Bridge section:  Pin Angular, Avoid Lyrical
Return:              Pin Lyrical
```

Simple but effective. The contrast is structural, not just a key change.

---

### 5.5 Cinematic arc

For longer through-composed works (32+ bars):

```
Opening:     Pin Lyrical (establish the world)
Statement:   Pin Patterned (introduce the pattern)
Development: Pin Angular (tension builds)
Climax:      Pin Chromatic (maximum darkness)
Coda:        Pin Lyrical (resolution, but changed)
```

The coda returning to lyrical after chromatic feels like resolution — but the listener has been through something. The same flavor reads differently at the end than at the beginning.

---

### 5.6 Zappa through a song form

```
Intro:   Flavor Chromatic, Motion +0.4, Tension +0.3
Verse:   Flavor Riff, Motion +0.3, Tension +0.2 (hook-based)
Chorus:  Flavor Angular, Motion +0.7, Tension +0.6 (push harder)
Bridge:  Pin Chromatic, Motion +0.9, Tension +0.8 (ferocity peak)
Outro:   Flavor Riff (return to the hook, but you've been through the bridge)
```

The Riff sections provide a recurring anchor. The bridge detonates and returns.

---

## Part 6 — Chord Progressions

*What the engine accepts, what stresses it, and what produces interesting results.*

---

### 6.1 Basic format

Paste chords separated by pipes. One chord per bar.

```
Cmaj7 | Am7 | Fmaj7 | G7
```

The engine matches bar count to the chord count you paste. For a 32-bar piece, paste 32 chords.

**Supported chord types:**
Major 7, minor 7, dominant 7, half-diminished (m7b5), diminished, suspended (sus2, sus4, 9sus4), add9, major 9, minor 9, 13, major 7#11, 7#9, 7b9, 7alt, 6, minor 6.

---

### 6.2 Diatonic progressions — safe baselines

These progressions work cleanly in every mode. Good starting points before you stress-test with harder harmony.

```
Jazz ballad:    Cmaj7 | Am7 | Dm7 | G7
Minor blues:    Am7 | Am7 | Dm7 | Dm7 | Am7 | Am7 | E7 | Am7
Modal (Dorian): Dm7 | Dm7 | G7 | G7 | Dm7 | Dm7 | Em7b5 | A7
Bossa nova:     Amaj7 | F#m7 | Bm7 | E7 | Amaj7 | F#m7 | D#m7b5 | G#7
```

---

### 6.3 Slash chords

Slash chords work — they specify a melody note or bass note over a different chord root. The engine reads both the chord quality and the bass note.

**Pedal point slash chords:**
```
Cmaj7/E | Am7/G | Fmaj7/A | Gsus/D
```
The descending bass line (E → G → A → D) is preserved in the output.

**Implied polychords via slash:**
```
Bb/C | Eb/F | Ab/Bb
```
These read as suspended dominant chords (C11, F11, Bb11) — the engine interprets the upper chord as an extension of the bass root.

**Tritone bass:**
```
F#/G | B/C | E/F
```
Highly dissonant — the bass note is a tritone below the chord root. Expect the engine to choose cells that lean into the tension rather than resolve it.

---

### 6.4 Polychords

Stack two chords using a slash with both chord names:

**Bitonal (Petrushka-style):**
```
[Cmaj/F#maj] | [Gmaj/Dbmaj] | [Dmaj/Abmaj]
```
The engine works with the combined pitch field — expect dense chromatic output.

**Wayne Shorter upper structure triads:**
```
F#maj7/G13 | Bmaj7/C7alt | Emaj7/F7
```
Upper structure above a dominant chord — produces the characteristic Shorter "wrong note that's right" quality.

---

### 6.5 Coltrane changes

The Giant Steps cycle divides the octave into three equal parts (major thirds). The engine handles these correctly — expect high cell density and angular motion as the engine tracks the rapid key centers.

**Short cycle (2 bars each):**
```
Emaj7 | Cmaj7 | Abmaj7 | Emaj7
```

**Full Giant Steps:**
```
Bmaj7 | D7 | Gmaj7 | Bb7 | Ebmaj7 | F#7 | Bmaj7 | Bmaj7
```

**With Coltrane harmonic voice + Patterned flavor:** The engine leans into the cyclic symmetry. The patterned flavor suits this — it produces phrases that mirror the harmonic symmetry of the changes.

---

### 6.6 Modal / static harmony

One chord, many bars. The engine handles this well — uses the Slonimsky cells to create melodic interest without functional harmonic movement.

```
Pure Dorian (8 bars):    Dm7 | Dm7 | Dm7 | Dm7 | Dm7 | Dm7 | Dm7 | Dm7
Pure Lydian (8 bars):    Cmaj7#11 | Cmaj7#11 | Cmaj7#11 | Cmaj7#11 | ...
```

**Tip:** With static harmony, use higher Variation (+0.5 to +0.8) to prevent the engine from repeating cells. The more bars of the same chord, the more variation you want.

---

### 6.7 Weird and edge case progressions

**Chromatic mediant moves:**
```
Cmaj7 | Ebmaj7 | Gmaj7 | Bbmaj7
```
Major chords moving by minor thirds. The engine tracks the voice leading — expect smooth chromatic movement despite the large key changes.

**Tritone substitutions:**
```
Cmaj7 | Db7 | Cmaj7 | Db7
```
Db7 substituting for G7. Classic bebop movement — the engine handles this as a conventional dominant substitution.

**All rests (one bar):**
If you include a bar with no chord, the engine holds the previous harmony. Useful for creating a fermata or held moment.

**Single chord, single bar:**
The engine generates a full output even for a one-bar input. Useful for short loops in Riff Generator mode.

---

### 6.8 Chord format reference

| Symbol | Meaning | Example |
|---|---|---|
| `maj7` | Major seventh | Cmaj7 |
| `m7` | Minor seventh | Am7 |
| `7` | Dominant seventh | G7 |
| `m7b5` | Half-diminished | Bm7b5 |
| `dim7` | Diminished seventh | Bdim7 |
| `sus4` | Suspended fourth | Gsus4 |
| `sus2` | Suspended second | Dsus2 |
| `9sus4` | Dominant 9 suspended | F9sus4 |
| `add9` | Add ninth | Cadd9 |
| `maj9` | Major ninth | Cmaj9 |
| `m9` | Minor ninth | Am9 |
| `13` | Dominant thirteenth | G13 |
| `maj7#11` | Lydian chord | Cmaj7#11 |
| `7#9` | Dominant sharp nine | G7#9 |
| `7b9` | Dominant flat nine | G7b9 |
| `7alt` | Altered dominant | G7alt |
| `/` | Slash chord (bass note) | G/B |

---

## Part 7 — Scenario Cookbook

*Ready-to-use starting points. All multi-section scenarios need more than 16 bars total.*

---

### Stylistic contrast

**Sacred to chaotic:**
```
Opening:     arvo_part    (crystalline stillness)
Development: ornette_coleman (harmolodic freedom)
Reprise:     arvo_part    (return to stillness)
```
Hard cut at the development boundary — no transition. The contrast is structural.

**French refinement vs Soviet brutalism:**
```
Opening:     ravel        (smooth impressionist)
Development: shostakovich (displaced downbeats, dark modal)
Coda:        ravel        (refined resolution)
```

**Hollywood sweep to serial fragmentation:**
```
Opening:     williams     (strong orchestral narrative)
Contrast:    webern       (pointillist extremes)
Reprise:     williams     (recovery)
```

---

### Same-family blending

**Impressionist watercolour:**
```
Blend: debussy 0.5 + ravel 0.5
```
Parallel planing softened by Ravel's voice-leading clarity. Smooth throughout.

**Broadway gradient:**
```
Intro/Verse: cole_porter  (controlled cabaret, swing 0.52)
Chorus:      gershwin     (broader jazz exuberance, swing 0.65)
Outro:       cole_porter  (return to precision)
```

**Cinematic three-way:**
```
Blend: morricone 0.4 + herrmann 0.35 + badalamenti 0.25
```
Epic modal drama shadowed by chromatic unease with noir space.

---

### Jazz lineage

**A century of jazz:**
```
Opening:     cole_porter     (Broadway cabaret)
Verse:       gershwin        (jazz-classical)
Chorus:      coltrane        (modal interval cells)
Coda:        ornette_coleman (harmolodic freedom)
```

**Swing gradient:**
```
Intro:       cole_porter  (swing 0.52)
Verse:       gershwin     (swing 0.65)
Chorus:      turtle_island (swing 0.80)
```
Progressive swing intensification.

**Joni Mitchell bridge:**
```
Verse:  cole_porter   (Broadway sophistication)
Bridge: joni_mitchell (open-tuning quartal)
Chorus: gershwin      (jazz exuberance)
```

---

### Cinematic arc

**The Hero's Journey:**
```
Opening:     badalamenti  (noir ambience)
Statement:   morricone    (epic modal drama)
Development: goldsmith    (Hollywood tension)
Climax:      williams     (orchestral sweep)
Coda:        badalamenti  (noir return)
```
64+ bars. Boundary ramp active.

**Suspense to resolution:**
```
Opening:     herrmann     (Hitchcock unease)
Development: goldsmith    (Hollywood tension)
Coda:        williams     (orchestral resolution)
```

---

### Modernist cluster

**The Modernist Arc:**
```
Opening:     shostakovich (displaced downbeats)
Development: bartok       (chromatic clusters)
Contrast:    ligeti       (micropolyphony)
Coda:        webern       (serial pointillism)
```
64+ bars.

**Soviet Sandwich:**
```
Opening:   shostakovich
Contrast:  ligeti
Reprise:   shostakovich
```
Same family — transitions smooth naturally.

---

### Messiaen mode explorations

| Mode | Character |
|---|---|
| M1 — Floating | Whole tone, airborne, unresolved |
| M2 — Shadowed | Octatonic, dark, symmetric tension |
| M3 — Luminous | 9-note field, rich, devotional |
| M4 — Austere | Compact, restrained, precise |
| M5 — Sparse | Wide open, very few pitches |
| M6 — Veiled | Ambiguous, colour-shifting |
| M7 — Dense | 10-note field, maximum saturation |

**Colour sequence (light to dark):**
M1 Floating → M2 Shadowed → M6 Veiled → M7 Dense

**Sparse to dense:**
M5 Sparse → M3 Luminous → M7 Dense

---

### Minimal vs maximal

**The Sigma Journey (register arc):**
```
Opening:     arvo_part  (σ=16, narrowest)
Development: ligeti     (σ=32, doubles)
Climax:      webern     (σ=40, maximum)
Coda:        arvo_part  (σ=16, collapses back)
```
Pure register drama. 64+ bars.

**Glass vs Herrmann:**
```
Opening:  glass    (σ=18, additive diatonic)
Contrast: herrmann (σ=36, Hitchcock clusters)
Coda:     glass    (σ=18, return)
```

---

### Solo instrument simulation

**Coltrane Quartet:**
```
Mode:     String Quartet
Voice:    coltrane
Character: Melody cycles interval-cell patterns, inner voices share cell, bass holds modal pedal.
```

**Sax and Bass Duo (Ornette style):**
```
Mode:     Guitar/Bass Duo
Voice:    ornette_coleman
Character: Guitar takes melody overlay, bass takes floating overlay. No chord roots.
```

---

## Part 8 — Working with your DAW / Notation Software

---

### 8.1 Sibelius

**Import:** File → Open → select the MusicXML file. Sibelius imports all parts, dynamics, and articulations from the export.

**Playback check:** Before listening, check:
- Tempo is set correctly (Composer OS exports at the tempo you set)
- Instrument sounds are assigned (default Sibelius sounds work well for initial review)
- Mixer levels are balanced — the engine doesn't mix, it writes

**What to listen for:**
- Is the melodic line sitting at the right register for your instrument?
- Are the inner voices creating harmony or clutter?
- Is the rhythmic density right for your tempo?
- Does the Slonimsky color appear where you expected it?

**What Sibelius can't tell you:** Whether the engine made musically interesting choices. That requires a musician's ear. Listen to at least 4 bars before deciding to regenerate.

---

### 8.2 Guitar Pro

Import → MusicXML → open the exported file. Guitar Pro renders all parts. Check the tab view for guitar-specific parts — the engine writes standard notation, not guitar-idiomatic notation, so some passages may need editing for playability.

---

### 8.3 Cubase

File → Import → MusicXML. Cubase imports all tracks. Assign VST instruments to each track for playback. The engine exports with standard MIDI instrument names — match these to your VST library.

---

### 8.4 What the engine can't decide for you

- **Dynamics:** The engine suggests dynamic markings but doesn't mix. You set the balance.
- **Articulation detail:** Broad articulation is written (staccato, slur, accent) but detailed bowing, fingering, or guitar technique is yours to add.
- **Tempo changes:** The engine generates at a fixed tempo. Rallentando, rubato, and tempo variation are your edit.
- **Orchestration decisions:** In Big Band and SQ modes, the engine writes all parts — but doubling decisions, divisi, and section balance are yours to refine.

---

## Part 9 — Quick Reference

---

### 9.1 Mode selector

| Mode | Voices | Output |
|---|---|---|
| Song Mode | Songwriter + harmonic voice | Lead melody + harmony |
| Big Band | Arranger voice | Full ensemble chart |
| String Quartet | Harmonic voice | 4-voice chamber |
| Guitar-Bass Duo | VRB voice | 2-voice, melodic/groove |
| ECM Chamber | Songwriter | Sparse, impressionist |
| Riff Generator | Riff VRB | 1–32 bar loops |
| Slonimsky Etude | None | Pattern-driven etude |
| SQ→BB Hybrid | SQ voice + BB voice | Dual ensemble |

---

### 9.2 Voice depth reference

| Voice | Depth | Best mode |
|---|---|---|
| Clare Fischer | Deep (44) | Big Band |
| Quincy Jones | Deep (46) | Big Band / Song |
| Sammy Nestico | Deep (41) | Big Band |
| Count Basie | Deep (38) | Big Band |
| Pat Metheny | Deep (12) | Song / GBD |
| Thad Jones | Deep (12) | Big Band |
| Bob Brookmeyer | Deep (12) | Big Band |
| Oliver Nelson | Deep (12) | Big Band |
| Messiaen | Deep (12) | SQ / SQ→BB |
| Wayne Shorter | Deep (11) | Song |
| Maria Schneider | Deep (11) | Big Band |
| Gil Evans | Deep (11) | Big Band |
| Charles Mingus | Deep (11) | Big Band |
| Duke Ellington | Deep (11) | Big Band / Song |
| John Coltrane | Deep (10) | Song / SQ |

---

### 9.3 Flavor × genre

| Flavor | Jazz | Classical | Rock | Film |
|---|---|---|---|---|
| Lyrical | ECM ballad, bossa | Romantic, impressionist | Singer-songwriter | Warm themes |
| Angular | Post-bop, free | Modern, Bartok | Art rock, prog | Tension cues |
| Patterned | Modal, Coltrane | Reich, Glass, minimalist | Prog, krautrock | Hypnotic underscore |
| Chromatic | Avant-jazz, Shorter | Contemporary, Berg | Experimental | Noir, unease |
| Riff | Funk, groove jazz | — | Rock, fusion | Action, drive |

---

### 9.4 Knob settings cheat sheet

| Sound goal | Motion | Tension | Variation |
|---|---|---|---|
| Settled, lyrical | -0.3 | -0.5 | -0.3 |
| ECM floating | -0.4 | -0.6 | -0.2 |
| Post-bop tension | +0.5 | +0.7 | +0.4 |
| Building energy | 0 | +0.4 | +0.3 |
| Ferocity (Zappa) | +0.9 | +0.8 | +0.8 |
| Minimal/patterned | -0.2 | 0 | -0.5 |
| Art rock unease | +0.4 | +0.6 | +0.5 |
| Modal static | 0 | +0.2 | +0.6 |

---

### 9.5 Slonimsky cell families

| Family | Display name | Character |
|---|---|---|
| lyrical | Lyrical | Smooth, singable, stepwise |
| angular | Angular | Wide intervals, direction changes |
| symmetric | Patterned | Cyclic, balanced, slightly uncanny |
| chromatic | Chromatic | Half-step motion, dark, searching |
| riff | Riff | Repeating shape, rhythmic, hooky |

Each family contains multiple cells (the 78 Slonimsky patterns are distributed across the five families). The Advanced drawer lets you browse and pin/forbid individual cells within each family.

---

*End of Composer OS Musician Guide*
*Version: V61 — 2026-05-23*
*For engine detail: COMPOSER_HANDBOOK.md*
*For roadmap: COMPOSER_OS_ROADMAP.md*
