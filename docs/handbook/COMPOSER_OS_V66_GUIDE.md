# Composer OS

## V66 Feature Guide

*For Musicians: How to Use Section Architecture, Drums, Frank Zappa Receipts, and ECM VRB*

---

## What V66 Adds

V66 turns Composer OS into a section-aware writing environment. You can build a song as a chain of sections — each with its own meter, tuning, feel, and Slonimsky seed — and generate music that respects that structure. Four jazz drummer engines (Elvin, Tony, Blakey, DeJohnette) plus 16 named presets give you real drum feel at Generate time. Frank Zappa GCE fingerprint receipts are visible and selectable. A deferred generate queue prevents overlapping engine runs. And six ECM-inspired reverb profiles colour the output with Manfred Eicher-style space.

---

## How to Launch the App

Double-click directly — no installation needed:

```
C:\Dev\composer-os\apps\composer-os-desktop\release\win-unpacked\Composer OS Desktop.exe
```

---

## The Structure Tab

V66 adds a **Structure** tab to the main window. It contains:

1. Section Editor
2. Meter Editor
3. Tuning / Slonimsky Panel
4. Drummer Panel
5. FZ Receipts Panel
6. ECM VRB Panel

All section-scoped controls read and write the active section selected in the Section Editor.

---

## Section Editor

### What it does

The Section Editor is the hub for song form. Each section has a label, GBD type, bar count, feel, key, and tempo. Configuration passes to the engine as the `song` object at Generate time.

### GBD section types

| Type | Label | Typical use |
|------|-------|-------------|
| intro | Intro | Opening material, sparse |
| verse | Verse | Main narrative |
| chorus | Chorus | Hook, higher energy |
| bridge | Bridge | Contrast section |
| development | Development | Harmonic/rhythmic expansion |
| shout_chorus | Shout Chorus | Full-power climax |
| custom | Custom | Free-form |

Each type has a colour in the row list and in the **GBD flow strip** at the bottom — a proportional bar chart of the whole form.

### Controls

- **Add Section** — appends 8 bars
- **Rename** — click section label
- **Type dropdown** — GBD classification per section
- **Move up / down** — reorder; bars repartition automatically
- **Delete** — removes section (minimum one section required)
- **Feel / Key / Tempo** — per active section, bottom of panel

### Scenarios

**Scenario A — AABA 32-bar form**
- Section A: Verse, 8 bars, swing, C, 120 bpm
- Section B: Bridge, 8 bars, latin, F, 110 bpm
- Section A: Verse (duplicate feel)
- Section A: Verse

**Scenario B — Ballad with intro and development**
- Intro: Intro, 4 bars, ballad, Eb, 72 bpm
- Verse: Verse, 8 bars
- Development: Development, 8 bars, odd feel
- Shout: Shout Chorus, 4 bars, 140 bpm

---

## Meter Editor

### What it does

Per-section time signature and beat grouping. Writes to the active section's `meterMap` and UI overrides.

### Controls

- **Numerator / Denominator** — standard meter (e.g. 4/4, 7/8)
- **Compound** — checkbox; auto-groups beats in threes when numerator divisible by 3
- **Additive grouping** — text field, e.g. `3+3+2` for 7/8; preview dots show beat groups
- **Metric modulation** — ratio field, e.g. `3:2` for pulse shift notation

Additive input accepts digits and `+` only; group sum must not exceed the numerator.

### Scenarios

**Scenario A — Brubeck 7/8**
- Numerator: 7, Denominator: 8
- Additive: `3+3+2`

**Scenario B — Compound 6/8**
- Numerator: 6, Denominator: 8
- Compound: on → preview shows three groups of 2

---

## Tuning / Slonimsky Panel

### What it does

Per-section tuning system and Slonimsky interval seed. Slonimsky pattern id passes to Generate as `slonimskyPatternId` when the active section has one applied.

### Tuning systems

| ID | Name |
|----|------|
| 12tet | Equal temperament |
| just | Just intonation |
| pythagorean | Pythagorean |
| 24tet | Quarter-tone (24-TET) |
| user | User-defined cent offsets per scale degree (0–99 cents each) |

### Slonimsky patterns

Browse 12 catalogue patterns (interval summaries shown). **Preview** plays note names from section key. **Apply** stores pattern on active section.

### Scenarios

**Scenario A — Quarter-tone colour**
- Tuning: 24-TET, Key: D
- Slonimsky: Ultra-chromatic pattern

**Scenario B — Just intonation drone section**
- Tuning: Just, Key: G
- No Slonimsky — neutral seed

---

## Drummer Panel

### What it does

Select drummer personality, pattern, or named preset. Active 16th-note grid passes to Generate as `uiDrumPattern`.

### Drummers

| Drummer | Character |
|---------|-----------|
| Elvin Jones | Rolling triplet feel, polyrhythmic tension |
| Tony Williams | Modern jazz, explosive linear fills |
| Art Blakey | Hard bop, backbeat drive, gospel swing |
| Jack DeJohnette | ECM brush, floating time, open texture |

Each drummer has 4+ named patterns with feel and meter tags.

### Named presets

16 presets tagged by feel (brush, mambo, Afro-Cuban, swing, etc.). Filter by feel tag; empty filter shows all presets.

### Pattern grid

16-step display for kick, snare, hat, ride lanes — read-only view of active pattern.

### Scenarios

**Scenario A — Hard bop swing**
- Drummer: Art Blakey
- Pattern: Blues Drive or similar swing pattern
- Section feel: swing

**Scenario B — ECM floating brush**
- Drummer: Jack DeJohnette
- Pattern: Brush Float
- VRB: Nordic Studio (see below)

**Scenario C — Afro-Cuban preset**
- Load preset tagged `mambo` or `afro`
- Section feel: latin

---

## FZ Receipts Panel

### What it does

Surfaces 15 Frank Zappa GCE fingerprint receipts from the engine. Select receipts to include in Generate as `fingerprintReceipt`. Each receipt nudges orchestration density, metric behaviour, or satirical quote density.

### Receipt categories

- **Rhythm / metric** — FZ_POLYRHYTHM, FZ_METRIC_MOD, FZ_SYNCLAVIER_GRID
- **Harmony / colour** — FZ_MODAL_VAMP, FZ_JAZZ_PROBE, FZ_XENOCHRONY
- **Orchestration** — FZ_ORCHESTRAL_DENSITY, FZ_ROCK_ANCHOR
- **Character** — FZ_WRONG_NOTES, FZ_SATIRICAL_QUOTE, FZ_REGISTER_COLLISION

Toggle individual receipts on/off. Active set passes in payload.

### Scenarios

**Scenario A — Zappa metric disruption**
- Enable: FZ_METRIC_MOD, FZ_POLYRHYTHM
- Section meter: additive 7/8
- Style profile: frank_zappa

**Scenario B — Satirical big-band quote**
- Enable: FZ_SATIRICAL_QUOTE, FZ_ORCHESTRAL_DENSITY
- Section type: Shout Chorus

---

## Deferred Generate Queue

### What it does

When Generate is clicked while a prior run is still active, the new request queues instead of failing. Header shows **DeferredQueueIndicator** with queue depth (max 8). Events: `deferred:queued`, `deferred:complete`.

### Behaviour

- Queue full → rejection with QUEUE_FULL message
- Serial execution — one generate at a time
- No user action required — automatic

---

## ECM VRB Panel

### What it does

Six ECM Records–inspired reverb profiles. Active profile passes as `vrbProfile` in Generate payload.

### Presets

| Preset | Character |
|--------|-----------|
| Nordic Studio | Dry focus, long tail, restrained reflections (Eicher signature) |
| Stone Church Oslo | Diffuse stone bloom, slow build |
| Infinite Hall | Endless tail, low damping, halo |
| Close Dry | Near-zero reverb, close-mic intimacy |
| Distant Bloom | Wide hall, soft onset |
| Cathedral Fade | Large space, gradual decay |

### Controls

- **Preset dropdown** — includes **— Off —** to disable VRB
- **Lock to Preset** — when locked, slider moves do not drift from preset values
- **Sliders** — Room size, Decay (0.1–8 s), Predelay, Damping, Diffusion
- **Reset to preset** — restore preset defaults

Header chip shows active VRB name when enabled.

### Scenarios

**Scenario A — ECM chamber ballad**
- VRB: Nordic Studio or Stone Church Oslo
- Drummer: DeJohnette brush
- Density: sparse section, ballad feel

**Scenario B — Dry intimate duo**
- VRB: Close Dry
- Lock: on

---

## Putting It All Together — Full Scenarios

### Scenario 1 — Three-section jazz tune

**Intro (4 bars)**
- Type: Intro, Meter: 4/4, Feel: ballad
- Drummer: DeJohnette brush, VRB: Nordic Studio

**Head (16 bars)**
- Type: Verse, Feel: swing, Key: Bb
- Drummer: Art Blakey, pattern: Hard Swing
- Slonimsky: none

**Solos (8 bars)**
- Type: Development, Feel: swing, Tempo: 132
- Drummer: Elvin Jones, VRB: Stone Church Oslo
- FZ receipts: off

Generate once — `song` object carries all section boundaries.

### Scenario 2 — Odd-meter Zappa experiment

- Section A: 7/8 additive `3+3+2`, Type: Development
- Tuning: 24-TET, Slonimsky: Ultra-chromatic
- FZ: FZ_METRIC_MOD + FZ_WRONG_NOTES enabled
- Drummer: Tony Williams, aggressive pattern
- VRB: Infinite Hall

### Scenario 3 — Slonimsky seed per section

- Section A: Apply Slonimsky pattern A, Key: C
- Section B: Apply different pattern B, Key: G
- Generate — active section's seed used when Structure tab drives `slonimskyPatternId`

---

## Troubleshooting

### Section changes don't affect output
Confirm you selected the correct active section (highlighted row). Generate reads the full `song` object, not just the active section — but Slonimsky seed uses the active section id at Generate click time.

### Drummer pattern not in output
Check that a pattern is selected (grid visible). `uiDrumPattern` only sends when a valid pattern is loaded.

### VRB seems inactive
Preset may be **— Off —**. Select a named preset. Check header chip for confirmation.

### Queue stuck
Wait for current generate to finish. Max depth 8 — if full, wait for completions before retrying.

### Additive meter rejected
Use digits and `+` only. Sum of groups must be ≤ numerator (e.g. `3+3+2` for 7, not `4+4` for 7).

### User cent tuning values look wrong
Cent fields clamp to 0–99 per degree.
