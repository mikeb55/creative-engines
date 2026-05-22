# Composer OS handbook

Practical notes for **using** Composer OS—generation, evaluation, and quality workflows. For architecture detail see **`COMPOSER_OS_ARCHITECTURE.md`**; for roadmap see **`COMPOSER_OS_ROADMAP.md`**.

---

## VoiceRuleBundle (VRB) fingerprint status

Compiled harmonic voice bundles live in **`engines/composer-os-v2/core/composer/voiceRuleBundles.ts`**. Optional **`orchestrationPolicy.fingerprintReceipts`** are **research-derived orchestration planning lines** (not the same thing as **GCE structural memory** JSON fingerprints in **`gce-memory/fingerprints/`**). **`getVoiceRuleBundle(id)`** returns the bundle for harmonic-voice / BB pairing; unknown ids fall back to **`neutral`** (no receipts).

**Deep (≥10 `fingerprintReceipts`):** **John Coltrane** (`john_coltrane`) **10** · **Pat Metheny** (`pat_metheny`) **12** · **Clare Fischer** (`clare_fischer`) **44** · **Quincy Jones** (`quincy_jones`) **46** · **Sammy Nestico** (`sammy_nestico`) **41** · **Count Basie** (`count_basie`) **38** · **Duke Ellington** (`duke_ellington` / `ellington`) **11** · **Gil Evans** (`gil_evans`) **11** · **Wayne Shorter** (`wayne_shorter`) **11** · **Maria Schneider** (`maria_schneider`) **11** · **Thad Jones** (`thad_jones`) **12** · **Charles Mingus** (`charles_mingus`) **11** · **Bob Brookmeyer** (`bob_brookmeyer`) **12** · **Olivier Messiaen** (`messiaen` / `olivier_messiaen`) **12** · **Oliver Nelson** (`oliver_nelson`) **12**.

**Extended:** none — **`count_basie`** (**`CB_HARM_*`**, **`CB_VL_*`**, **`CB_RHYTHM_*`**, **`CB_FORM_*`**, **`CB_FP_*`**) raised the bundle to **deep**; slice layer still carries shout-chorus / riff-head / **Basie Button** behaviour.

**Thin:** none (see table). **Alban Berg** — low-count **Also bundled** row, not **deep**.

| Composer (harmonic voice id) | Fingerprint count | Status |
|------------------------------|-------------------|--------|
| **John Coltrane** (`john_coltrane`) | 10 | **deep** |
| **Pat Metheny** (`pat_metheny`) | 12 | **deep** |
| **Clare Fischer** (`clare_fischer`) | 44 | **deep** |
| **Quincy Jones** (`quincy_jones`) | 46 | **deep** |
| **Duke Ellington** (`duke_ellington`, alias `ellington`) | 11 | **deep** |
| **Gil Evans** (`gil_evans`) | 11 | **deep** |
| **Wayne Shorter** (`wayne_shorter`) | 11 | **deep** |
| **Maria Schneider** (`maria_schneider`) | 11 | **deep** |
| **Thad Jones** (`thad_jones`) | 12 | **deep** |
| **Charles Mingus** (`charles_mingus`) | 11 | **deep** |
| **Bob Brookmeyer** (`bob_brookmeyer`) | 12 | **deep** |
| **Olivier Messiaen** (`messiaen`, alias `olivier_messiaen`) | 12 | **deep** |
| **Oliver Nelson** (`oliver_nelson`) | 12 | **deep** |
| **Sammy Nestico** (`sammy_nestico`) | 41 | **deep** |
| **Count Basie** (`count_basie`) | 38 | **deep** |

**Also bundled:** **Alban Berg** (`berg` / `alban_berg`) **4** — see **`voiceRuleBundles.ts`** for authoritative counts.

**Ship hashes:** VRB deepen Ellington / Gil / Shorter / Schneider **`4aa848a5`** · Messiaen slice **`a4ae08de`** · Basie Song Mode **`ac875ae8`** · Quincy Song Mode + BB **`8b8775e4`** · BB composer stubs rail **`6344cdcb`** · Brookmeyer stack **`48e5407d`** · Oliver Nelson stack **`e4814fb3`**.

---

### Bob Brookmeyer (`bob_brookmeyer`)

- **Pitch-module spine:** Generative **3-note cell** (Brookmeyer pitch module); harmony and rhythm are derivatives (**inversion / retrograde / augmentation / diminution**) — not chord-chart-first planning.
- **`lineFirstHierarchy`:** **`VoiceRuleBundle`** flag drives **`voiceLeadingSolver`** — **melody wins** when symbols disagree with the active module (**`voiceRuleBundles.ts`**, **`voiceLeadingSolver.ts`**).
- **Solo gate:** Slice defers **solo-permitted** episodes until composed architecture completes (episode receipts **`brk:*`**).
- **`brookmeyerPeriodMode`:** **`early_brookmeyer`** vs **`late_brookmeyer`** — early = tighter swing grid + brass clarity; late = looser grid, chamber dialogue across sections (**`GenerateRequest`** / manifests).

### Oliver Nelson (`oliver_nelson`)

- **Two-layer form:** Planner tags **`pedalBased`**, **`bluesModalHybrid`**, **`twoLayerForm`** — **modal / pedal head** episodes vs **functional 12-bar C minor blues** solo layer (**`nelsonEpisodeTypes.ts`**, **`oliverNelsonSlice.ts`**).
- **Pedal field:** Bass **i** pedal (**`activePedal`** pitch class); upper structures alternate **♭IIImaj7** and **IVmaj7** (e.g. **E♭maj7** / **Fmaj7** over **C**) — **`upperModalChords`** metadata.
- **Turnaround:** **♭VI7(9,13) → V7(9,13) → im7** default; optional **Dø7–G7** bar-12 variant; **ivm7** minor IV (**Fm7**), not gospel **IV7**, unless optional colour.
- **`NelsonPeriodMode` / `NelsonBluesFormVariant`:** **`early_nelson` / `middle_nelson` / `late_nelson`** × **`twelve_bar` / `sixteen_bar`** — API **`nelsonPeriodMode`**, **`nelsonBluesFormVariant`** on **`GenerateRequest`** + manifests.

### Olivier Messiaen (`messiaen`) — modes, colour, rhythm

- **Limited transposition modes 2 / 3 / 4** — Pool tiers **`messiaen_mode2`**, **`messiaen_mode3`**, **`messiaen_birdsong`** (**`seed % 3`**); harmony spine favours **colour translation**, not functional **V→I** discharge.
- **`messiaenPeriodMode`:** **`early_messiaen`** (modes + theological programme) · **`middle_messiaen`** (birdsong-as-structure + CTI-style stacks) · **`late_messiaen`** (birdsong-heavy colour cosmology).
- **`colourTag` stub** (`generationMetadata`) — maps active mode tag → Messiaen colour label until a dedicated colour engine exists.
- **Birdsong layer:** Receipts / metadata allow **extreme-treble ornamental** strata decoupled from bar-grid melody (**`om:*`** family).
- **Non-retrogradable rhythm:** Palindrome / additive rhythm receipts — phrase windows may carry **prime-length** sixteenth totals and **non-retrogradable** cells.

**Messiaen colour stub** (`generationMetadata.colourTag`) — until **`engines/messiaen-colour-engine`** supplies live tags, the slice maps active limited-transposition mode tag → catalogue colour:

| Mode tag | Colour label |
|----------|--------------|
| Mode 2¹ | violet-blue |
| Mode 2² | gold-brown |
| Mode 2³ | green |
| Mode 3¹ | orange-gold |
| Mode 3² | grey-mauve-gold |
| Mode 3³ | blue-green |
| Mode 3⁴ | orange-red |
| Mode 4¹ | grey-gold-blue |
| Mode 6¹ | grey-gold-orange |

---

## GCE Structural Memory

### What it is

**GCE Structural Memory** is a small **JSON fingerprint library**: each entry captures measurable **structure** of a chart you already trust (density per bar, drum activity shape, where rehearsal marks land and how much the texture shifts, how long melodic instruments sit out, and guards against robotic melodic repetition). Fingerprints live under **`engines/composer-os-v2/gce-memory/fingerprints/`** as named JSON files (for example **`orbit_v6_64.json`**).

### Why it exists

Iterative generation often revisits the **same failure modes**—too many identical melodic cells, a horn section that disappears for half the form, drums that never breathe, or section letters that print on the page but do not change the band’s weight. Structural memory gives the pipeline a **concrete reference**: reject candidates that repeat known bad shapes before you burn time on subjective listening rounds.

### How it works (extract → store → validate → retry)

1. **Extract** — From a finished score (usually exported MusicXML that already hits your quality bar), the engine computes a fingerprint: bar-by-bar **density**, **drum narrative** counts, **section transitions**, **rest-span profiles** on melodic parts, and melodic **pitch-sequence** behaviour.
2. **Store** — You save that fingerprint under a stable id so it can be loaded later (same id used by scripts and registry lookups).
3. **Validate** — Each new candidate score is checked against the chosen fingerprint (and/or extra gates such as the Steely Orbit V2 pack below). Failures return a **plain-text list** of what diverged.
4. **Retry** — Orchestration scripts can loop on new seeds until validation passes or you hit a max-attempt budget.

Think of it as **lint for orchestration**, grounded in a chart you already like.

### The five Steely Orbit V2 gate rules (what each catches)

Batch scripts such as **`npm run orbit:steely-v2`** ( **`engines/composer-os-v2`** ) can require **five** independent checks against a reference fingerprint before combined GCE runs. **Steely Orbit V2** uses **`steely_orbit_target`**—same lineage as **`orbit_v6_64`** through bar **56**, but bars **57–64** encode **thinning** (hand off toward Orbit darkness, not Bill Evans’ dense V6 tail). Any **8-bar window** that overlaps **57–64** can use a **looser** mean-abs cap (**`STEELY_V2_DENSITY_ZONE_MAX`**, default **0.65**); every other window still uses the strict **0.4**-scale rule (**`STEELY_V2_DENSITY_EIGHT_MAX`**).

| Rule | What it catches |
|------|-----------------|
| **Melodic pitch sequence streak** | More than **two consecutive bars** with the **same pitch sequence** on a melodic part **outside** the opening phrase (bars **1–4** are exempt). Stops “copy-paste” melodic loops that read as lazy sequencing. |
| **Alto rest span** | **Alto sax** (and similar constraints in tooling) sitting silent for **too many bars in a row** outside exempt regions—prevents the lead voice vanishing when it should stay present. |
| **Density vs reference (8-bar windows)** | **Mean absolute deviation** between your candidate’s bar-density curve and the reference, scanned across **every 8-bar window**. Flags ensemble **weight** drift; **Steely** adds the **transition-zone** exception above so intentional drain at the end is not scored against the wrong artistic target. |
| **Drum narrative variance (16-bar windows)** | **Population variance** of drum voice-1 activity inside **every 16-bar span**. Catches **flat** drum parts that never change contour—machine-like timekeeping with no narrative arc. |
| **Section transition density delta** | At each **rehearsal mark** after the intro, the **absolute change** in density across the transition must clear a floor (default **0.1**). Catches **labels without theatre**: “Fill” or “Shout Chorus” printed where the band’s thickness never actually shifts. |

Scripts may expose environment variables to relax individual gates while you fix orchestration—defaults aim at the **full set** above.

### Format gate overrides (ensemble floors)

When reasoning about “good enough” combined scores **by ensemble**, the repo carries **hint floors** (not a substitute for the main GCE evaluator threshold, but useful for comparing apples to oranges):

- **Big band:** **7.3** (empirical floor post BB scorer calibration; see **`steely_orbit_target`** V2.1 baseline)
- **String quartet:** **8.0**
- **Duo:** **8.8**
- **ECM chamber:** **8.8**

Defined in **`gceMemoryRegistry.ts`** as **`formatGateOverrides`**.

### Adding a new fingerprint

1. Start from a **high-scoring export** you trust (same length and form as the project you will gate).
2. Run extraction in code or via the repo’s seed pipeline: **`npm run gce:seed-structural-fingerprints`** from **`engines/composer-os-v2`** refreshes canonical fingerprints from the Orbit MusicXML sources when those files change.
3. **Save** the fingerprint JSON into **`engines/composer-os-v2/gce-memory/fingerprints/`** with a clear id (for example **`my_reference_64`**).
4. Optionally register **`format:songwriterId` → fingerprint id** in **`gceMemoryRegistry.ts`** so **`getBestFingerprint`** resolves automatically for that pairing.

Each time you promote a **better** export to “canonical,” regenerate or overwrite the JSON—the registry **gets smarter** because validation targets move toward **proven** layouts.

### Using structural memory to improve an existing score

Load the reference fingerprint, run **`validateAgainstFingerprint`** on your candidate score with a chosen numeric **tolerance**. You get back a **failure list**: per-bar density mismatches, drum shape mismatches, mismatched rehearsal transitions, rest-span drift, and melodic streak violations—**edit those bars first** instead of guessing.

For Big Band iteration specifically, **`validateSteelyOrbitV2FingerprintGate`** narrows the five-rule pack before combined evaluation so you do not chase a high style score on a structurally broken chart.

### Intent tags (reference fingerprints)

Optional **`intentTags`** on a fingerprint JSON declare **macro dramaturgy** so validators do not punish charts for the wrong aesthetic:

| Tag | Effect on Steely V2 gate (when present on the **reference** fingerprint) |
|-----|---------------------------------------------------------------------------|
| **`sparse_ending`** | Loosens the **57–64 density** transition tolerance slightly (adds **+0.15** to the zone mean-abs cap — stacks with env overrides). |
| **`constant_density`** | Sets **section rehearsal |densityΔ|** floor to **0** — allows flat orchestration between formally labelled sections when the reference chart is **texture-static by design**. |
| **`bright_opening`** | Documentary tag today — reserved for future gates (brightness vs darkness scoring). |
| **`gradual_darkening`** | Documentary — pairs with sparse-ending drains or long arcs. |
| **`climax_driven`** | Future use: expect a mid-form ensemble spike (validators may tighten mid-thirds rather than relax globally). |
| **`through_composed`** | Documentary — minimal sectional rehearsal contrast expected. |

Shipped examples: **`steely_orbit_target`** uses **`bright_opening`**, **`gradual_darkening`**, **`sparse_ending`**; **`orbit_v6_64`** uses **`gradual_darkening`**, **`constant_density`**.

### Works across formats

Fingerprints carry a **format** tag (**big band**, **string quartet**, **duo**, **ECM**). Extraction targets that format’s scoring layout; the **workflow** is the same everywhere—extract trusted output, validate new runs against it, retry.

---

*Structural memory is additive: every high-quality artifact you codify becomes a reusable **anchor** for the next generation pass.*

---

## Riff Generator

Preset **`riff_generator`** — short-loop MusicXML (1–32 bars) to the **Riffs** library. Internal quality gate uses **`scoreRiffGce`** (not duo / Song Mode GCE). VRB family tags, odd-meter overlay, and per-bar locks are documented in **`engines/composer-os-v2/core/counterpoint/INVARIANTS.md`** (Riff Generator block).

### Controls

| Control | API field | Notes |
|---------|-----------|--------|
| Loop length | `totalBars` | Stepper: **1, 2, 4, 8, 16, 32** |
| Family | UI → `riffVrbId` | **funk** · **rock** · **fusion** · **art_rock** |
| VRB | `riffVrbId` | Stub profiles: e.g. `nile_rodgers`, `led_zeppelin`, `weather_report`, `fripp` |
| Density | `riffDensity` | `sparse` · `medium` · `dense` |
| Grid | `riffGrid` | `eighth` · `sixteenth` |
| Line mode | `riffLineMode` | `single_line` · `guitar_bass` · `octave_double` |
| Bass part | `riffBass` | With `guitar_bass` line mode |
| Odd meter | `riffOddMeterPreset` | Fusion / art_rock only (`meter5`, `meter7`, `mahavishnu`, …) |
| Regenerate / mutate | `riffOp` | `regenerate` · `mutate` (needs prior `riffCarryForward`) |
| Per-bar lock | `riffBarLocks` | Preserves locked bars on regen/mutate |
| Chords | `chordProgressionText` | Pipe-delimited — see **Chord progression input** below |

### Chord progression input

Pass a pipe-delimited chord string to the riff engine via `chordProgressionText`
on `RiffGeneratorParams`. The parser resolves per-bar pitch fields when
`USE_PITCH_FIELD_NOTE_SELECTION = true`.

Format: `Dm9 | BbMaj7#11 | Eb9sus4 | AbMaj7 | F#m9 | BMaj7 | Gsus2 | Dm9`

Rules:
- One chord per bar — chord count should match `totalBars`
- Supported extensions: m9, Maj7#11, 9sus4, sus2, dom9, 13, add9
- Bad symbols log [riff-chord] warning and fall back to bar root — no silent maj7 swap
- Empty or missing input falls back to Am7 for every bar
- Loop truncation removed — up to 32 chords supported (matches bar stepper max)

Known parser behaviour: extended symbol parsing is in place; if a symbol
produces unexpected output check the [riff-chord] log before assuming
a VRB profile issue.

### Zappa Solo Generator

**Full chapter:** [COMPOSER_HANDBOOK_ZAPPA.md](COMPOSER_HANDBOOK_ZAPPA.md) · [COMPOSER_HANDBOOK_ZAPPA.docx](COMPOSER_HANDBOOK_ZAPPA.docx) — compositional vs blues-rock ferocity modes, Z-PROG-01–20 progressions, 20 scenarios, export notes.

Frank Zappa VRB auto-enables a solo overlay on generation.
No toggle needed — solo is always on when `frank_zappa` is selected.

Solo engine: `riffSoloFromZappaEngine` — uses Slonimsky `FRANK_ZAPPA`
pattern map, 7/8 rhythmic cell snapping, guide-tone nudges from
`zappaVoiceLeading`. Separate from duo `zappasoloEngine` lane.

MusicXML export:
- Guitar part: "Clean Electric Guitar", GM 28
- Solo part: "Electric Guitar Solo", GM 31
- Both export as instrument-name "Electric Guitar" for Sibelius compatibility

Chord input: pipe-delimited, up to 32 bars
Example: `Dm9 | BbMaj7#11 | Eb9sus4 | AbMaj7 | F#m9 | BMaj7 | Gsus2 | Dm9`

Known gaps post-Z5:
- 15x FZ_* songwriter receipts not yet compiled by riffReceiptCompiler
- 4x FZ_RIFF_* stub receipts not yet wired
- Zappa GCE structural fingerprint not yet created

---

## Scenario Cookbook

Practical scenario starting points across composers,
harmonic voices, modes and sections. All multi-section
scenarios require `totalBars > 16`. Song mode examples
use `sectionLabelMode: song`; instrumental examples
use `sectionLabelMode: instrumental` (default).

---

### 1. Stylistic Contrast (Jekyll & Hyde Sections)

**1.1 — Sacred to Chaotic**
Sections: `opening: arvo_part` · `development: ornette_coleman` · `reprise: arvo_part`
Crystalline stillness gives way to semi-independent pitch fields, then returns to silence. Hard cut at the development boundary — no ramp between tintinnabuli and free jazz families.
Key: totalBars 32+, instrumental mode.

**1.2 — French Refinement vs Soviet Brutalism**
Sections: `opening: ravel` · `development: shostakovich` · `coda: ravel`
Smooth impressionist opening, displaced downbeats and dark modal harmony in the middle, refined resolution at close. Cross-family hard cut at opening→development.
Key: instrumental mode, transitionBars 2 at ravel boundaries.

**1.3 — Hollywood Sweep to Serial Fragmentation**
Sections: `opening: williams` · `contrast: webern` · `reprise: williams`
Strong orchestral narrative collapses into pointillist extremes (σ=40), then recovers. Maximum register contrast.
Key: webern σ=40 ceiling active, instrumental mode.

---

### 2. Same-Family Blending

**2.1 — Impressionist Watercolour**
Blend: `debussy 0.5 + ravel 0.5` across full composition.
Parallel planing softened by Ravel's voice-leading clarity. σ interpolated 20–21.
Key: `blendVrbIds: ['debussy','ravel']`, `blendWeights: [0.5, 0.5]`.

**2.2 — Broadway Gradient**
Sections: `intro: cole_porter` · `verse: cole_porter` · `chorus: gershwin` · `outro: cole_porter`
Controlled cabaret feel (swing 0.52) in verses, broader jazz exuberance (swing 0.65) in chorus. Tempo-adaptive curve widens the gap at slower tempos.
Key: song mode, bpm 90.

**2.3 — Cinematic Three-Way**
Blend: `morricone 0.4 + herrmann 0.35 + badalamenti 0.25`
Epic modal drama shadowed by chromatic unease with noir space. σ clamped to morricone ceiling (22).
Key: `blendVrbIds: ['morricone','herrmann','badalamenti']`.

---

### 3. Pitch-Field Journeys

All pitch-field scenarios require instrumental mode. Song-mode guard suppresses pitch-field spine in song mode.

**3.1 — Free to Structured**
Sections: `opening: ornette_coleman` · `development: coltrane` · `coda: messiaen`
Loose harmolodic field tightens into interval-cell patterns, then settles into static modal colour. Freedom to stasis.
Key: totalBars 48+.

**3.2 — Modal Rainbow**
Sections: `opening: messiaen` (M1 Floating) · `statement: coltrane` · `development: messiaen` (M7 Dense) · `coda: ornette_coleman`
Whole-tone openness → interval-cell density → dense 10-note field → harmolodic dissolution.
Key: `messiaenModeId: 1` opening, `messiaenModeId: 7` development.

**3.3 — Texture as Narrative**
Sections: `opening: messiaen` (M2 Shadowed) · `development: ligeti` · `coda: ornette_coleman`
Octatonic colour absorbed into chromatic micropolyphony, then freed into pitch fields.
Key: totalBars 64+.

**3.4 — Ascending Complexity Arc**
Sections: `opening: ornette_coleman` · `statement: coltrane` · `development: ligeti` · `coda: messiaen`
Interaction-driven looseness → pattern saturation → micropolyphony → static modal resolution.
Key: totalBars 64+.

**3.5 — Reverse Arc**
Sections: `opening: messiaen` (M2) · `development: coltrane` · `climax: ornette_coleman`
Ordered modal colour dissolves through pattern saturation into harmolodic freedom.
Key: instrumental only.

---

### 4. Messiaen Mode Explorations

| Mode | Label | Pitch Classes | PCs |
|------|-------|---------------|-----|
| M1 | Floating (Whole Tone) | 0,2,4,6,8,10 | 6 |
| M2 | Shadowed (Octatonic) | 0,1,3,4,6,7,9,10 | 8 |
| M3 | Luminous | 0,2,3,4,6,7,8,10,11 | 9 |
| M4 | Austere | 0,1,2,5,6,7,8,11 | 8 |
| M5 | Sparse | 0,1,5,6,7,11 | 6 |
| M6 | Veiled | 0,2,4,5,6,8,10,11 | 8 |
| M7 | Dense | 0,1,2,3,5,6,7,8,9,11 | 10 |

**4.1 — Colour Sequence (Light to Dark)**
Sections: M1 Floating → M2 Shadowed → M6 Veiled → M7 Dense
All sections use messiaen; different modeId per section. Journey of increasing harmonic saturation.

**4.2 — Symmetric Pair (ABA)**
Sections: M1 · M2 · M1
Whole-tone bookends the octatonic middle. pedalPolicy: bass-drone where available.

**4.3 — Sparse to Dense**
Sections: M5 Sparse → M3 Luminous → M7 Dense
Progressive densification. Feels like a slow harmonic awakening.
Key: totalBars 48+.

---

### 5. Temporal Extremes

**5.1 — Still vs Shattered**
Sections: `opening: arvo_part` (HR min 4 bars) · `development: bartok` (HR min 0)
Maximum harmonic rhythm contrast — sustained tintinnabuli chords collapse into rapid chromatic cluster changes.

**5.2 — Zimmer Drone vs Shostakovich Fracture**
Sections: `opening: zimmer` · `contrast: shostakovich`
Layered pad stasis gives way to metric instability.
Key: transitionBars 2.

**5.3 — Pärt Bookends with Ligeti Core**
Sections: `opening: arvo_part` · `development: ligeti` · `coda: arvo_part`
Tintinnabuli silence frames micropolyphonic texture. Cross-family hard cuts at both boundaries.
Key: totalBars 64+, Ligeti pitch-field active.

---

### 6. Jazz Lineage

**6.1 — Decades in Four Sections**
Sections: `opening: cole_porter` · `verse: gershwin` · `chorus: coltrane` · `coda: ornette_coleman`
Broadway cabaret → jazz-classical → modal interval cells (pitch-field) → harmolodic freedom. A century of jazz.
Key: song mode for porter/gershwin, instrumental for coltrane/ornette; bpm 120.

**6.2 — Swing Gradient**
Sections: `intro: cole_porter` (0.52) · `verse: gershwin` (0.65) · `chorus: turtle_island` (0.80)
Progressive swing intensification. Gap widens at slow tempos via tempo-adaptive curve.
Key: song mode, bpm 80.

**6.3 — Joni Mitchell Bridge**
Sections: `verse: cole_porter` · `bridge: joni_mitchell` · `chorus: gershwin`
Broadway sophistication flanks an open-tuning quartal bridge. σ: Porter 25, Joni 23, Gershwin 27.
Key: song mode.

---

### 7. Cinematic Arc

**7.1 — The Hero's Journey**
Sections: `opening: badalamenti` · `statement: morricone` · `development: goldsmith` · `climax: williams` · `coda: badalamenti`
Noir ambience → epic modal drama → Hollywood tension → orchestral sweep → noir return. σ: 21→22→24→26→21.
Key: totalBars 64+, boundary ramp active (cinematic family).

**7.2 — Suspense to Resolution**
Sections: `opening: herrmann` · `development: goldsmith` · `coda: williams`
Hitchcock unease → Hollywood tension → orchestral resolution. σ narrows as tension resolves: 36→24→26.

**7.3 — Zimmer Ostinato Arc**
Blend: `zimmer 0.6 + morricone 0.4`
Modern epic ostinato pads with modal drama undertow.
Key: `blendVrbIds: ['zimmer','morricone']`.

---

### 8. Modernist Cluster

**8.1 — The Modernist Arc**
Sections: `opening: shostakovich` · `development: bartok` · `contrast: ligeti` · `coda: webern`
Displaced downbeats → chromatic clusters → micropolyphony (pitch-field) → serial pointillism (σ=40).
Key: totalBars 64+, Ligeti pitch-field active.

**8.2 — Folk to Abstract**
Sections: `opening: bartok` · `development: ligeti` · `coda: webern`
Three stages of abstraction. Key: totalBars 48+.

**8.3 — Soviet Sandwich**
Sections: `opening: shostakovich` · `contrast: ligeti` · `reprise: shostakovich`
Same modernist family — boundary ramp smooths the transitions.

---

### 9. East-West Fusion

**9.1 — Three Shades of Modal**
Blend: `messiaen 0.4 + debussy 0.4 + ravel 0.2`
Symmetric modal colour + parallel planing + refined voice-leading. σ ~21. suppressFunctionalResolution hard-switches on.
Key: `blendVrbIds: ['messiaen','debussy','ravel']`, `messiaenModeId: 2`.

**9.2 — Sacred and Impressionist**
Sections: `opening: arvo_part` · `development: messiaen` (M3 Luminous) · `coda: arvo_part`
Tintinnabuli stillness frames Messiaen's luminous 9-note modal field.
Key: totalBars 48+.

**9.3 — Satie's Irony vs Messiaen's Devotion**
Sections: `opening: satie` · `development: messiaen` (M2 Shadowed) · `coda: satie`
Ironic parallel triads bookend octatonic modal devotion. σ: Satie 19, Messiaen 22.

---

### 10. Minimal vs Maximal

**10.1 — The Sigma Journey**
Sections: `opening: arvo_part` (σ=16) · `development: ligeti` (σ=32) · `climax: webern` (σ=40) · `coda: arvo_part` (σ=16)
Register begins at narrowest, doubles, reaches maximum, collapses back. Pure register drama.
Key: totalBars 64+, all cross-family hard cuts.

**10.2 — Glass vs Herrmann**
Sections: `opening: glass` (σ=18) · `contrast: herrmann` (σ=36) · `coda: glass` (σ=18)
Additive diatonic cells give way to Hitchcock chromatic clusters, then return.

**10.3 — Minimal Blend Pushed Wide**
Blend: `arvo_part 0.3 + webern 0.7`
Blend-capped σ ≈ 29. tintinnabuli hard-switches OFF (weight < 0.65). Wide-register serial feel with slight modal anchoring.

---

### 11. Solo Instrument Simulation

**11.1 — Sax and Bass Duo (Ornette Style)**
Format: Guitar/Bass duo · Composer: `ornette_coleman`
Guitar takes melody overlay (overlap 0.75), bass takes floating overlay (overlap 0.55). No chord roots.
Key: duo mode, Ornette pitch-field, democraticEnsemble true.

**11.2 — Coltrane Quartet Simulation**
Format: SQ mode · Composer: `coltrane`
Melody cycles interval-cell patterns (sheets of sound), inner voices share cell at 0.80 overlap, bass holds modal pedal.
Key: SQ mode, Coltrane pitch-field, densityDrive 0.8.

**11.3 — String Quartet Micropolyphony**
Format: String Quartet · Composer: `ligeti`
Four voices enter staggered, each moving stepwise within the chromatic cluster field.
Key: string quartet mode, Ligeti pitch-field, clusterWidth 8, motionBlur 0.70.

---

### 12. Swing Gradient

**12.1 — From Grid to Groove**
Sections: `opening: arvo_part` (grid) · `verse: cole_porter` (0.52) · `chorus: gershwin` (0.65) · `outro: turtle_island` (0.80)
Metronomic stillness to cabaret precision to jazz exuberance to loose group swing.
Key: song mode, bpm 80.

**12.2 — Late Night Slow Burn**
Sections: `intro: satie` · `verse: badalamenti` · `chorus: gershwin`
Dry ironic opening, Twin Peaks chromatic space, full Broadway swing.
Key: song mode, bpm 70.

**12.3 — Fast and Straight**
Sections: `opening: cole_porter` · `development: gershwin` · `coda: cole_porter`
At bpm 200 tempo-adaptive curve straightens swing — Porter drops toward 0.43, Gershwin toward 0.54. Gap ≥ 0.10 maintained.
Key: instrumental, bpm 200.
