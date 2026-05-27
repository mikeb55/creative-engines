# Composer OS

## V67 Feature Guide

*For Musicians: How to Use Big Band, String Quartet, Counterpoint, and the Grid View*

---

## What V67 Adds

V67 adds ensemble intelligence to Composer OS. You can now configure a full big band or string quartet — controlling every voice, technique, and dynamic — and generate music that genuinely sounds like those ensembles. A contrapuntal engine lets you set species counterpoint rules per voice pair. And a new Grid View shows your generated output as a piano roll so you can see the music before you open it in Sibelius.

---

## How to Launch the App

Double-click directly — no installation needed:

```
C:\Dev\composer-os\apps\composer-os-desktop\release\win-unpacked\Composer OS Desktop.exe
```

---

## The Ensemble Tab

V67 adds an **Ensemble** tab to the main window. It contains three collapsible panels (all collapsed by default to save space):

1. Big Band Panel
2. String Quartet Panel
3. Contrapuntal Panel

Click the panel header to expand or collapse each one.

---

## Big Band Panel

### What it does

The Big Band Panel configures a full jazz big band ensemble. Every section and voice is individually controllable. The configuration passes to the engine as `bigBandConfig` at Generate time.

### Sections and voices

| Section | Voices |
|---------|--------|
| Trumpets | Lead, 2nd, 3rd, 4th |
| Trombones | Lead, 2nd, 3rd, Bass |
| Saxes | Lead Alto, 2nd Alto, Lead Tenor, 2nd Tenor, Baritone |
| Rhythm | Piano, Bass, Drums, Guitar |

### Per-section controls

- **Toggle on/off** — excludes the entire section from generation
- **Mute / Solo per voice** — isolate individual voices
- **Spread** — closed / drop-2 / drop-3 / spread
- **Register** — low / mid / high

### Global controls

- **Soli mode** — all voices move as a block (homophonic block writing)
- **Shout chorus** — forces fff dynamic and spread voicing throughout
- **Style preset** — Basie / Ellington / Kenton / Buddy Rich / Thad Jones

### Style presets explained

| Style | Character |
|-------|-----------|
| Basie | Laid-back, spare, riffing brass, blues feel |
| Ellington | Dramatic stops, featured solos, latin tinge, lush voicings |
| Kenton | Heavy brass pulse, march feel, progressive meter, dissonant clusters |
| Buddy Rich | Explosive, military precision, showmanship fills, fast tempos |
| Thad Jones | Rhythmic displacement, samba influence, mixed meters, melodic writing |

### Big Band drum styles

The Drummer Panel syncs to the Big Band style selector. Each band style maps to a matching drum pattern set in `bigBandDrums.js` (10 patterns across 5 styles, 2 per style).

### Scenarios

**Scenario A — Basie-style count off, full band**
- Style: Basie, Spread: drop-2, Register: mid
- Soli: off, Shout: off
- Drummer: Basie brush/swing pattern
- VRB: Close Dry or Nordic Studio

**Scenario B — Kenton shout chorus**
- Style: Kenton, Spread: spread, Register: high
- Soli: on, Shout: on
- All sections active, fff dynamic
- VRB: Cathedral Fade

**Scenario C — Ellington ballad, saxes only**
- Style: Ellington
- Trumpets: off, Trombones: off, Rhythm: Piano + Bass only
- Saxes: Spread: closed, Register: mid
- VRB: Nordic Studio, Density: Low

**Scenario D — Thad Jones, odd meter**
- Style: Thad Jones, Spread: drop-3
- Active section Meter: 7/8 (3+2+2)
- Drummer: Thad Jones displacement pattern

**Scenario E — Buddy Rich, full power**
- Style: Buddy Rich, Shout: on, Spread: spread
- All sections active
- Drummer: Rich fast/power pattern
- Section type: Shout Chorus, Density: High

---

## String Quartet Panel

### What it does

The String Quartet Panel configures a four-voice chamber ensemble. Each voice has independent technique, dynamic, and register settings. Configuration passes to the engine as `stringQuartetConfig`.

### The four voices

Violin I / Violin II / Viola / Cello

### Per-voice controls

- **Mute / Solo** — isolate individual voices
- **Register** — low / mid / high / extended
- **Technique** — arco / pizzicato / col legno / sul ponticello / sul tasto / harmonics / tremolo / spiccato
- **Dynamic** — ppp through fff (7 steps)

### Ensemble controls

- **Voicing style** — close / open / mixed
- **Texture** — Homophonic / Melody+Accompaniment / Contrapuntal / Antiphonal / Unison
- **Style preset** — Beethoven / Bartók / Ravel / Shostakovich / Kronos (contemporary)

### Style presets explained

| Preset | Character |
|--------|-----------|
| Beethoven | Classical balance, clear voice leading, dramatic contrasts |
| Bartók | Aggressive rhythms, folk inflections, chromatic dissonance, pizzicato prominence |
| Ravel | Impressionist colour, sul ponticello effects, delicate harmonics |
| Shostakovich | Dark, sardonic, driving rhythms, sudden dynamic extremes |
| Kronos | Contemporary extended techniques, col legno, noise elements, open texture |

### Scenarios

**Scenario A — ECM-style Ravel quartet**
- Style: Ravel, Texture: Contrapuntal, Voicing: open
- Violin I: arco, pp–mp; Violin II: arco, pp
- Viola: sul tasto, pp; Cello: arco, p
- VRB: Nordic Studio or Stone Church Oslo

**Scenario B — Bartók aggressive development**
- Style: Bartók, Texture: Antiphonal, Voicing: close
- Violin I + II: spiccato, ff; Viola: col legno, mf
- Cello: pizzicato, f — locks to kick via drum conditioning
- VRB: Infinite Hall, Section type: Development

**Scenario C — Shostakovich driven unison**
- Style: Shostakovich, Texture: Unison
- All voices: arco, fff, Register: mid
- Section type: Shout Chorus

**Scenario D — Kronos contemporary**
- Style: Kronos, Texture: Contrapuntal, Voicing: mixed
- Violin I: harmonics, mp; Violin II: tremolo, pp
- Viola: col legno, mf; Cello: arco, p
- Tuning: 24-TET, Slonimsky: Ultra-chromatic
- Section type: Free

**Scenario E — Cello locks to kick, upper strings contrapuntal**
- Style: Beethoven, Texture: Contrapuntal
- Cello: arco, p–mf (engine locks cello to kick positions)
- Violin I: arco, attacks on snare positions
- Drummer: Elvin Jones, Section type: Groove

---

## Contrapuntal Panel

### What it does

The Contrapuntal Panel controls how the counterpoint engine writes multiple independent voices against each other. It is the most technically detailed panel in Composer OS. Configuration passes as `contrapuntalConfig`.

### Voice count

2 / 3 / 4 / 5 / 6 independent voices.

### Species per voice pair

Each pair of voices can be assigned a species (the classical counterpoint taxonomy):

| Species | What it means |
|---------|--------------|
| First | Note against note — same rhythm in all voices |
| Second | Two notes per cantus note — movement in one voice |
| Third | Four notes per cantus note — fast movement |
| Fourth | Syncopation and suspensions — tied across barlines |
| Fifth (Florid) | Mixed — combines all species |
| Free | No strict species constraint |

### Cantus firmus

The cantus firmus is the fixed melody that the other voices are written against.

- **Source** — use the active section's melody, or enter custom note names
- **Custom entry** — type note names e.g. `C D E F G A`
- **Direction bias** — ascending / descending / arch / free

### Rules toggles

Turn each rule on or off independently:

- Avoid parallel fifths
- Avoid parallel octaves
- Contrary motion preference
- No voice crossing
- Resolve leading tone
- Dissonance on weak beats only

### Style presets

| Preset | Character |
|--------|-----------|
| Palestrina | Smooth, modal, stepwise motion, careful dissonance |
| Bach | Functional harmony, clear voice leading, strong bass |
| Fux | Academic strict species, textbook rules |
| Hindemith | Chromatic but tonal, freer dissonance |
| Free Atonal | No tonal constraints |

### Scenarios

**Scenario A — Bach-style four-voice chorale**
- Voices: 4, Species: First (all pairs)
- Style: Bach, all rules on
- Cantus: active section melody, Direction: arch

**Scenario B — Palestrina-style motet**
- Voices: 5, Species: mix of Second and Third
- Style: Palestrina, parallel fifths/octaves: on, voice crossing: off
- Cantus: custom, Direction: ascending

**Scenario C — Free atonal counterpoint**
- Voices: 6, Species: Free (all pairs)
- Style: Free Atonal, all rules off
- Cantus: active section melody
- Tuning: Just intonation

**Scenario D — Florid two-voice invention**
- Voices: 2, Species: Fifth / Florid
- Style: Bach, contrary motion: on, leading tone: on
- Cantus: custom `C E G F E D C`

---

## Grid View

### What it does

The Grid View is a read-only piano roll display of the last generated output. It appears in the **Grid** tab in the main window. It updates automatically every time a new generation completes.

### Layout

- **Y axis** — pitch, chromatic C0–C8, scrollable
- **X axis** — time in beats, subdivided to 16th notes
- **Note rectangles** — filled, coloured by voice/part
- **Hover tooltip** — shows pitch name, beat position, duration, and voice name

### Controls

- **Zoom X** — bar / beat / 8th / 16th
- **Zoom Y** — full range / 2 octaves / 1 octave
- **Voice filter** — checkboxes to show or hide individual voices
- **Playhead** — vertical line at current playback position (static if not playing)

### How to use it

1. Generate a result
2. Click the Grid tab — the piano roll populates automatically
3. Use Zoom X to see the full piece or zoom into a passage
4. Use Zoom Y to focus on a register
5. Use Voice filter to isolate a single voice (e.g. just the bass line)
6. Hover over any note rectangle to see its details

### Scenarios

**Scenario A — Check bass line locking to kick**
- Generate with Art Blakey drum pattern active
- Open Grid tab
- Voice filter: show Bass only
- Zoom X: beat — check bass note positions align with kick hits in the drum pattern

**Scenario B — Inspect contrapuntal voice crossings**
- Generate with Contrapuntal panel, 4 voices
- Grid tab, Zoom Y: 2 octaves
- Show all voices — look for lines crossing
- If crossings appear, enable No voice crossing rule and regenerate

**Scenario C — Verify microtonal inflections**
- Generate with 24-TET tuning and Ultra-chromatic Slonimsky
- Grid tab — hover over notes to check pitch names
- Quarter-tone inflections appear as non-standard pitch names

---

## Putting It All Together — Full Scenarios

### Scenario 1 — Full big band suite, three sections

**Intro**
- Big Band: Basie style, Saxes only, Spread: closed
- Drummer: Basie brush, Section type: Intro
- VRB: Nordic Studio, Density: Low

**Main Head**
- Big Band: Basie style, full band, Spread: drop-2
- Drummer: Basie swing, Section type: Groove
- VRB: Stone Church Oslo, Density: Medium-High

**Shout Chorus**
- Big Band: Buddy Rich, full band, Shout: on, Spread: spread
- Drummer: Rich power pattern, Section type: Shout Chorus
- VRB: Cathedral Fade, Density: High

Generate each section. Review all three in Grid View to check the arc.

### Scenario 2 — String quartet with counterpoint

**Groove section**
- String Quartet: Ravel, Texture: Contrapuntal, 4 voices
- Contrapuntal: 4 voices, Species: Second+Third mix, Style: Palestrina
- Drummer: DeJohnette brush, VRB: Nordic Studio

**Development section**
- String Quartet: Bartók, Texture: Antiphonal
- Contrapuntal: 5 voices, Species: Fifth, Style: Hindemith, all rules off
- Meter: 7/8, Tuning: Just intonation, VRB: Infinite Hall

### Scenario 3 — Hybrid big band and quartet

**Verse**
- Big Band active (Ellington style, Saxes + Rhythm only)
- String Quartet active (Ravel, Melody+Accompaniment)
- Both configurations pass simultaneously in the generate payload

---

## Troubleshooting

### The Ensemble tab panels are all collapsed and I can't find anything
Click the panel header bar to expand. All panels are collapsed by default.

### The big band style changed but the drums didn't sync
The DrummerPanel style selector syncs when you change the Big Band style preset. If it didn't, try reselecting the style from the Big Band dropdown.

### The Grid View is empty
The Grid View only shows the last generated result. Run Generate first.

### The Grid View shows notes but they look wrong
Check Zoom Y — if you are zoomed too far in you may be looking at the wrong register. Set Zoom Y to full range to see all voices.

### Voice crossing appears in the grid despite the rule being on
The No voice crossing rule constrains the contrapuntal engine — it does not apply to Big Band or String Quartet voice assignment. For ensembles, use the Spread and Register controls to separate voices manually.

### The contrapuntal engine ignores my cantus firmus
Make sure you have selected Custom entry as the cantus firmus source and typed valid note names (letter names only, e.g. `C D Eb F G`).
