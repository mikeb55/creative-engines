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

## Tritonic

### What is Tritonic?

Tritonic is Composer OS’s **three-note colour engine** — small pitch-class cells (always three notes) that move by smooth voice-leading, in the harmonic world of **Wayne Shorter**: chords that **suggest** colour and tension rather than spell every function in block voicings. Your chart (or a generated progression) stays the **anchor**; tritonic cells **float above** it or spin out a **singable line** from the same material. No jazz-engine jargon required: think “upper-structure drift” or “melodic implication,” not “replace my changes.”

**Cell families:** `quartal` · `cluster` · `suspended` · `shorter_floating` · `bergonzi`

**Realisation modes:** `bb` (dense, energetic) · `sq` (smooth quartet) · `ecm` (sustained, delayed release)

---

### Two modes

| Mode | What you hear | Best when |
|------|---------------|-----------|
| **Harmonic Float** | Three-note cells colour your chord sequence from above; harmony bars stay your anchors (Vault / iReal / paste). | Big band shout, ECM wash, comping over a locked chart |
| **Melodic Trace** | Same cell chain, but the export emphasises a **singer-safe motif** — a line you can hum or put on a lead sheet. | Ballads, vocal demos, Wayne-style floating heads |

Both modes share the same cell dictionary and the **nine behaviour dials** below (0–1 sliders; **0.5 = neutral**).

---

### The nine dials (0–1, default 0.5)

Each dial is a **float**, not an on/off switch. At **0.5** the engine behaves as shipped; nudge up or down to steer without replacing generative logic.

#### tension

**Musically:** Favours **darker, sharper cells** (cluster, bergonzi) vs smoother quartal/suspended choices.

**Cookbook example:** [Scenario 3 — Big Band Blues Shout in F](TRITONIC_BB_COOKBOOK.md#scenario-3--big-band-blues-shout-in-f) — high oddity and cluster peaks on the V bar.

**Sweet spots:** **BB** 0.55–0.75 · **ECM** 0.45–0.60 · **Quartet** 0.50–0.70 · **Vocal** 0.30–0.50 (keep lyric line uncluttered)

#### resolutionDelay

**Musically:** **Postpones settling** on low-tension / cadential cells — the harmony keeps “asking” instead of answering.

**Cookbook example:** [Scenario 2 — Minor Blues in C (ECM Sparse)](TRITONIC_BB_COOKBOOK.md#scenario-2--minor-blues-in-c-ecm-sparse) — ECM mode forces delayed resolution; the minor blues never fully cadences.

**Sweet spots:** **ECM** 0.65–0.85 · **BB** 0.35–0.55 · **Quartet** 0.60–0.80 · **Vocal** 0.50–0.70 (ballad float)

#### density

**Musically:** **More events per bar** vs longer spans — how busy the timeline feels under the cells.

**Cookbook example:** [Scenario 3 — Big Band Blues Shout in F](TRITONIC_BB_COOKBOOK.md#scenario-3--big-band-blues-shout-in-f) — dense all-beats comping vs sparse ECM scenarios.

**Sweet spots:** **BB** 0.65–0.85 · **ECM** 0.25–0.45 · **Quartet** 0.35–0.55 · **Vocal** 0.30–0.50

#### registralSpread

**Musically:** **Wide vertical spacing** vs tight inner-voice motion — orchestral openness vs close jazz voicings.

**Cookbook example:** [Scenario 22 — Maria Schneider (Orchestral Swell)](TRITONIC_BB_COOKBOOK.md#scenario-22--maria-schneider-orchestral-swell) — open voicing and slow swell across bar lines.

**Sweet spots:** **ECM** 0.60–0.80 · **BB** 0.55–0.75 · **Quartet** 0.40–0.60 · **Vocal** 0.45–0.65

#### contourBias

**Musically:** Steers **stepwise, singable motion** vs **leaps and registral jumps** in the projected line.

**Cookbook example:** [Scenario 40 — Cinema Noir (Descending Chromatic)](TRITONIC_BB_COOKBOOK.md#scenario-40--cinema-noir-descending-chromatic) — chromatic descent drives contour; dial down for stepwise ECM lines.

**Sweet spots:** **ECM** 0.55–0.70 (lyrical step) · **BB** 0.40–0.55 · **Quartet** 0.50–0.65 · **Vocal** 0.65–0.85

#### cadenceAvoidance

**Musically:** **Resists obvious V→I / ii→V release** — modal hover and Shorter-style perpetual float.

**Cookbook example:** [Scenario 8 — Nefertiti-Style (No Resolution)](TRITONIC_BB_COOKBOOK.md#scenario-8--nefertiti-style-no-resolution) — suspended cells, no cadential release.

**Sweet spots:** **ECM** 0.75–0.95 · **Quartet (Wayne)** 0.80–0.95 · **BB** 0.40–0.60 · **Vocal / tonal** 0.15–0.35

#### rhythmicDisplacement

**Musically:** Nudges cell onsets **off the downbeat** — syncopated float vs locked punch.

**Cookbook example:** [Scenario 37 — Samba Jazz (Bossa Offbeats)](TRITONIC_BB_COOKBOOK.md#scenario-37--samba-jazz-bossa-offbeats) — offbeat comping against straight harmonic rhythm.

**Sweet spots:** **BB / funk** 0.55–0.75 · **ECM** 0.45–0.55 · **Quartet** 0.50–0.65 · **Vocal** 0.40–0.55

#### anchorAdhesion

**Musically:** How tightly cells **honour your chart’s chord tones** vs drifting into outside colour.

**Cookbook example:** [Scenario 4 — Simple ii–V–I in C Major](TRITONIC_BB_COOKBOOK.md) — smooth SQ voice-leading through canonical changes (high adhesion). Contrast [Scenario 10 — ECM Floating (No Tonal Centre)](TRITONIC_BB_COOKBOOK.md) for low adhesion.

**Sweet spots:** **Tonal / vocal** 0.65–0.85 · **Quartet** 0.45–0.65 · **ECM** 0.30–0.50 · **BB** 0.40–0.60

#### motifSingability

**Musically:** Prioritises **smooth, narrow-range, hummable** melodic trace vs angular upper-structure lines.

**Cookbook example:** [Scenario 9 — Infant Eyes Ballad](TRITONIC_BB_COOKBOOK.md#scenario-9--infant-eyes-ballad) — slow ballad, shorter_floating cells, lead-sheet-first intent.

**Sweet spots:** **Vocal** 0.70–0.90 · **ECM ballad** 0.60–0.80 · **Quartet** 0.50–0.70 · **BB** 0.35–0.55

---

### Quick-start presets

Unlisted dials default to **0.5**. Paste into `behaviourBiases` on `TritonicRealisationContext` (API) or match in UI when sliders ship.

| Preset | tension | resolutionDelay | density | registralSpread | contourBias | cadenceAvoidance | rhythmicDisplacement | anchorAdhesion | motifSingability |
|--------|---------|-----------------|---------|-----------------|-------------|------------------|----------------------|----------------|------------------|
| **ECM / chamber** | 0.5 | 0.7 | 0.3 | 0.5 | 0.5 | 0.8 | 0.5 | 0.5 | 0.5 |
| **Big Band** | 0.6 | 0.4 | 0.7 | 0.7 | 0.5 | 0.5 | 0.6 | 0.5 | 0.5 |
| **Wayne Shorter quartet** | 0.8 | 0.8 | 0.4 | 0.5 | 0.5 | 0.9 | 0.5 | 0.4 | 0.5 |
| **Safe / tonal** | 0.3 | 0.2 | 0.5 | 0.5 | 0.5 | 0.2 | 0.5 | 0.5 | 0.8 |

**Mode pairing:** ECM preset → `ecm` · Big Band → `bb` · Wayne quartet → `sq` or `ecm` · Safe/tonal → `sq` with Harmonic Float over a diatonic chart.

---

### Where to go deeper

**[TRITONIC_BB_COOKBOOK.md](TRITONIC_BB_COOKBOOK.md)** — **60 worked scenarios** (bar-by-bar progressions + engine/behaviour notes): blues, ii–V–I, Shorter, Messiaen, cinematic, minimalist, and more. Do not duplicate those recipes here; use them as musical targets and map dials + mode to match.

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

---

# Martino Linear Expressions — Creative Scenarios Guide
## 20 Wildly Different Uses for Composer OS v1.1.0

---

## Introduction

Martino Linear Expressions is not a bebop line generator. It is a rule-based melodic architecture engine that reduces every chord to its minor centre, applies canonical templates (A1–A8), scores the result across 8 dimensions, and rejects anything that doesn't pass the GCE gate. The result is a highly disciplined, deeply idiomatic guitar voice that sounds like Pat Martino thought about it.

The 20 scenarios below push the engine into radically different creative territories — from teaching tools to film scoring to avant-garde composition. Each includes exact settings.

---

## Scenario 1 — The Bebop Vocabulary Builder (Teaching)

**Concept:** Use the engine as a daily practice tool. Generate a new linear phrase over a ii–V–I each day, print it, and play it in 12 keys.

**Settings:**
- Tune name: `Daily Line [date]`
- Chords: `Dm7 G7 Cmaj7 Cmaj7`
- Choruses: 1
- Primary activity: A1 — Opening Line
- Secondary: A2 — Diagonal Bridge
- Dominant tension: Low
- Mode: Teaching
- Explain mode: ON

**Why it works:** Teaching mode surfaces the reduction logic bar by bar. The student sees why each note was chosen — minor centre, template, role — rather than just copying a lick.

---

## Scenario 2 — The Ballad Study (Lyrical Phrasing)

**Concept:** Generate a long-form melodic study over a slow ballad form. Focus on wide interval spans and lyrical contour.

**Settings:**
- Preset: Beatrice (16 bars)
- Choruses: 2
- Primary activity: A7 — Long Span
- Secondary: A2 — Diagonal Bridge
- Dominant tension: Low
- LFV: min 5, max 9
- Mode: Teaching

**Why it works:** A7 (Long Span) produces wide ascending gestures over 2 bars. Over Beatrice's modal ii–V changes this creates an Evans-like lyrical quality rather than eighth-note bebop density.

---

## Scenario 3 — The Modal Drone Study (ECM Aesthetic)

**Concept:** Generate linear phrases over static modal changes. Wire ECM Chamber mode to push toward open, spacious contour.

**Settings:**
- Chords: `Fmaj7 Fmaj7 Fmaj7 Fmaj7 Ebmaj7 Ebmaj7 Ebmaj7 Ebmaj7`
- Choruses: 1
- Primary activity: A1 — Opening Line
- Secondary: A2 — Diagonal Bridge
- Dominant tension: Low
- ECM mode: ECM_METHENY_QUARTET
- Mode: Performance

**Why it works:** ECM_METHENY_QUARTET hints push the tension map toward low, producing floating lines that sit above the harmony rather than cutting through it.

---

## Scenario 4 — The Rhythm Changes Burner (High Energy)

**Concept:** Full-speed rhythm changes, maximum chromatic tension on dominants, A4 Anchor Arp for propulsive drive.

**Settings:**
- Chords: `Bbmaj7 G7 Cm7 F7 Dm7 G7 Cm7 F7 Bb7 Eb7 Bb7 F7 Fm7 Bb7 Ebmaj7 Edim7 Bb7 G7 Cm7 F7 Bbmaj7 G7 Cm7 F7 Dm7 G7 Cm7 F7 Bb7 Eb7 Bb7 Bbmaj7`
- Choruses: 2
- Primary activity: A4 — Anchor Arp
- Secondary: A1, A3
- Dominant tension: High
- LFV: min 3, max 9
- Mode: Performance

**Why it works:** High dominant tension on G7, F7, Bb7 pushes chromatic enclosures. A4 Anchor Arp on the tonic bars creates contrast. Two choruses with DCR variation seed ensures chorus 2 differs from chorus 1.

---

## Scenario 5 — The Blues Archetype (12-Bar Deep Funk)

**Concept:** Use the Blues genre profile over a slow blues with maximum tension and Anchor Arp as primary.

**Settings:**
- Preset: Blues genre profile
- Chords: `F7 F7 F7 F7 Bb7 Bb7 F7 F7 C7 Bb7 F7 C7`
- Choruses: 3
- Primary activity: A4 — Anchor Arp
- Secondary: A3 — Pivot Cell
- Dominant tension: High
- LFV: min 3, max 10

**Why it works:** Anchor Arp on dominant 7ths creates the call-and-response feel of blues guitar. Three choruses with per-chorus DCR variation builds a narrative arc — each chorus escalates.

---

## Scenario 6 — The Enclosure Study (Barry Harris Crossover)

**Concept:** Activate Barry Harris crossover mode with enclosure_heavy profile over a bebop head.

**Settings:**
- Chords: `Cmaj7 A7 Dm7 G7 Em7 A7 Dm7 G7 Cmaj7 Fm7 Bb7 Ebmaj7 Am7 D7 Dm7 G7`
- Choruses: 2
- Primary activity: A6 — Enclosure Cell
- Secondary: A1, A5
- Barry Harris mode: ON (profile: enclosure_heavy)
- Dominant tension: Medium
- Mode: Teaching
- Explain mode: ON

**Why it works:** A6 Enclosure Cell + Barry Harris enclosure_heavy profile doubles down on chromatic approach tones from above and below the minor centre. The explain panel shows every enclosure move bar by bar.

---

## Scenario 7 — The Orbit Chromatic Journey (Post-Bop)

**Concept:** Orbit's symmetrical chord sequence — descending major 7ths in tritone pairs — tests the reduction engine at its limits.

**Settings:**
- Preset: Orbit
- Choruses: 1
- Primary activity: A1 — Opening Line
- Secondary: A2 — Diagonal Bridge
- Slonimsky macro: tritone_progression
- Dominant tension: Low
- LFV: min 5, max 9

**Why it works:** The Slonimsky tritone_progression hint aligns the interval vocabulary with Orbit's tritone-substitution harmonic logic. The engine's minor centre reductions track through Fmaj7#11 → Ebmaj7#5 → Dbmaj7 → Bmaj7 as a single continuous linear descent.

---

## Scenario 8 — The Scalar Embellishment Study (Barry Harris Scalar)

**Concept:** Use Barry Harris scalar_embellish profile over a standard 32-bar AABA to generate stepwise embellishments.

**Settings:**
- Chords: `Fmaj7 Em7b5 A7 Dm7 Dm7 Cm7 F7 Bbmaj7 Bbm7 Eb7 Fmaj7 D7 Gm7 C7 Fmaj7 C7` (A section × 2 + bridge + A)
- Choruses: 2
- Primary activity: A7 — Long Span
- Secondary: A3 — Pivot Cell
- Barry Harris mode: ON (profile: scalar_embellish)
- Dominant tension: Low

**Why it works:** Scalar embellishment + Long Span creates smooth stepwise lines that connect chord tones without arpeggiation — the hallmark of Barry Harris's flowing scalar approach.

---

## Scenario 9 — The Intervallic Mirror (Slonimsky Avant-Garde)

**Concept:** Push the engine into intervallic mirror territory using Slonimsky macro and high chromatic tension.

**Settings:**
- Chords: `Dm7 Ab7 Dbmaj7 G7 Cmaj7 F#7 Bmaj7 E7`
- Choruses: 2
- Primary activity: A8 — Rhythmic Displacement
- Secondary: A6 — Enclosure Cell
- Slonimsky macro: intervallic_mirror_permutations
- Dominant tension: High
- LFV: min 4, max 10

**Why it works:** Intervallic mirror Slonimsky hints combined with A8 Rhythmic Displacement and high tension produces angular, syncopated lines that would be at home in a Zappa or Holdsworth context.

---

## Scenario 10 — The ECM Schneider Chamber Texture

**Concept:** Generate a chamber-like guitar line using ECM Schneider mode, long spans, low activity.

**Settings:**
- Chords: `Dbmaj7 Dbmaj7 Gbmaj7 Gbmaj7 Abmaj7 Abmaj7 Dbmaj7 Dbmaj7`
- Choruses: 1
- Primary activity: A7 — Long Span
- Secondary: A2 — Diagonal Bridge
- ECM mode: ECM_SCHNEIDER_CHAMBER
- Dominant tension: Low
- Mode: Performance

**Why it works:** ECM_SCHNEIDER_CHAMBER pushes tension high but A7 Long Span keeps the line lyrical. The result sounds like Maria Schneider's chamber writing — dense harmonically but never cluttered melodically.

---

## Scenario 11 — The Performance Mode Showcase (No Training Wheels)

**Concept:** Performance mode removes teaching annotations and generates the cleanest possible output for direct use in a session or recording.

**Settings:**
- Tune name: `Session Line A`
- Chords: `Am7 D7 Gmaj7 Gmaj7 Cm7 F7 Bbmaj7 Bbmaj7`
- Choruses: 1
- Primary activity: A1 — Opening Line
- Secondary: A2, A5
- Dominant tension: Medium
- Mode: Performance
- Explain mode: OFF

**Why it works:** Performance mode produces a clean MusicXML file ready for Sibelius. No provenance annotations, no teaching metadata — just the line.

---

## Scenario 12 — The Multi-Chorus Narrative Arc (3-Chorus Study)

**Concept:** Use 3 choruses with DCR per-chorus variation to build a complete melodic narrative — introduction, development, climax.

**Settings:**
- Chords: `Dm7 G7 Cmaj7 A7 Dm7 G7 Cmaj7 Cmaj7`
- Choruses: 3
- Primary activity: A1 — Opening Line
- Secondary: A2, A3, A4
- Dominant tension: Medium (chorus 1), escalating via DCR seed
- LFV: min 5, max 9
- Mode: Teaching
- Explain mode: ON

**Why it works:** Chorus 1 starts with carry_key=None (default opening). Chorus 2 seeds from pivot, chorus 3 from anchor — creating a natural arc from lyrical to rhythmic to grounded.

---

## Scenario 13 — The Pentatonic Slonimsky Overlay

**Concept:** Use pentatonic Slonimsky macro over a blues-adjacent progression to blend Martino's linear approach with pentatonic vocabulary.

**Settings:**
- Chords: `Am7 Am7 D7 D7 Am7 Am7 E7 D7`
- Choruses: 2
- Primary activity: A3 — Pivot Cell
- Secondary: A4 — Anchor Arp
- Slonimsky macro: pentatonic_scales
- Dominant tension: Medium

**Why it works:** Pentatonic Slonimsky hints steer the interval vocabulary toward minor pentatonic patterns while the Martino reduction engine keeps everything grounded in the minor centre. The result blends Wes Montgomery pentatonics with Martino's discipline.

---

## Scenario 14 — The Heptatonic Modal Study

**Concept:** Modal jazz changes with heptatonic Slonimsky macro for a Shorter/Metheny flavour.

**Settings:**
- Chords: `Dm7 Dm7 Ebmaj7 Ebmaj7 Dm7 Dm7 Ebmaj7 Fmaj7`
- Choruses: 2
- Primary activity: A2 — Diagonal Bridge
- Secondary: A7 — Long Span
- Slonimsky macro: heptatonic_scales
- Dominant tension: Low
- ECM mode: ECM_METHENY_QUARTET

**Why it works:** Heptatonic scales + Metheny ECM + Diagonal Bridge = a modal sound that floats across the changes without resolving. Pure ECM atmosphere.

---

## Scenario 15 — The Rhythm Displacement Etude (A8 Focus)

**Concept:** Make A8 Rhythmic Displacement the primary activity to generate a syncopated, off-beat study.

**Settings:**
- Chords: `Fm7 Bb7 Ebmaj7 Ebmaj7 Abm7 Db7 Gbmaj7 Gbmaj7`
- Choruses: 2
- Primary activity: A8 — Rhythmic Displacement
- Secondary: A3 — Pivot Cell
- Dominant tension: Medium
- LFV: min 5, max 9
- Mode: Teaching
- Explain mode: ON

**Why it works:** A8's beat_position offsets (+0.125) create syncopation against the bar grid. The explain panel shows where each off-beat lands relative to the minor centre — a powerful rhythmic ear-training tool.

---

## Scenario 16 — The Standard Repertoire Generator (32-Bar AABA)

**Concept:** Use the Standard genre profile to generate idiomatic lines over a classic 32-bar AABA form.

**Settings:**
- Preset: Standard genre profile
- Chords: `Fmaj7 Dm7 Gm7 C7 Am7 D7 Gm7 C7 Am7 D7 Gm7 C7 Fmaj7 D7 Gm7 C7` (A section ×2 + bridge + A)
- Choruses: 2
- Primary activity: A1 — Opening Line
- Secondary: A2, A3
- Dominant tension: Medium

**Why it works:** The Standard profile sets medium tension on dominants and a balanced activity mix — exactly the vocabulary needed for playing standards with a modern jazz approach.

---

## Scenario 17 — The Cadential Resolution Study (A5 Focus)

**Concept:** Make A5 Cadential Cell the primary activity to study how Martino approaches endings and resolutions.

**Settings:**
- Chords: `Am7 D7 Gmaj7 Gmaj7`
- Choruses: 4
- Primary activity: A5 — Cadential Cell
- Secondary: A1, A2
- Dominant tension: Low
- Mode: Teaching
- Explain mode: ON

**Why it works:** Four choruses of A5 primary with explain mode reveals the pattern of cadential approaches — how the engine resolves to the tonic minor centre across multiple harmonic contexts.

---

## Scenario 18 — The Bebop Enclosure + Approach (A6 + A5)

**Concept:** Chain enclosure approaches (A6) with cadential resolution (A5) to study the full bebop approach-to-target vocabulary.

**Settings:**
- Chords: `Dm7 G7 Cmaj7 A7 Dm7 G7 Em7 A7 Dm7 G7 Cmaj7 Cmaj7`
- Choruses: 2
- Primary activity: A6 — Enclosure Cell
- Secondary: A5 — Cadential Cell, A1
- Barry Harris mode: ON (profile: bebop_step)
- Dominant tension: High
- Mode: Teaching

**Why it works:** A6 targets the minor centre from above and below; A5 closes the phrase to the tonic. Barry Harris bebop_step profile adds passing motion between chord tones. The result is a complete bebop phrase architecture.

---

## Scenario 19 — The Film Score Sketch (Atmospheric, Non-Functional)

**Concept:** Use static non-functional harmony with ECM Schneider mode to generate atmospheric guitar lines for film scoring.

**Settings:**
- Chords: `Abmaj7 Abmaj7 Dbmaj7 Dbmaj7 Gbmaj7 Gbmaj7 Abmaj7 Abmaj7`
- Choruses: 1
- Primary activity: A7 — Long Span
- Secondary: A2 — Diagonal Bridge
- ECM mode: ECM_SCHNEIDER_CHAMBER
- Dominant tension: Low
- LFV: min 7, max 12
- Mode: Performance

**Why it works:** High LFV range (7–12) pushes the line into the upper register. ECM Schneider chamber texture + Long Span creates sustained, atmospheric melodic gestures suitable for underscore or sound design.

---

## Scenario 20 — The Complete Martino System Test (All 8 Activities)

**Concept:** Push all 8 activities (A1–A8) into a single generation to test the full vocabulary of the engine.

**Settings:**
- Chords: `Fmaj7 Gbmaj7 Fmaj7 Ebmaj7 Dm7 Ebmaj7 Dm7 Bbm7 Am7 Bbmaj7 Dm7 Fmaj7 Gbmaj7 Fmaj7 Ebmaj7 Fmaj7`
- Choruses: 2
- Primary activity: A1 — Opening Line
- Secondary: A2, A3, A4, A5, A6, A7, A8 (all)
- Dominant tension: Medium
- Slonimsky macro: heptatonic_scales
- ECM mode: ECM_METHENY_QUARTET
- Barry Harris mode: ON (profile: bebop_step)
- LFV: min 5, max 9
- Mode: Teaching
- Explain mode: ON

**Why it works:** With all 8 activities in the secondary pool, the DCR scoring engine selects the strongest variant per phrase span. The explain panel becomes a complete map of the Martino vocabulary — which activities the engine chose, why, and what the GCE said about each decision.

---

## GCE Dimension Reference

| Dimension | What it scores | Target |
|---|---|---|
| reduction_integrity | Correct minor centre reduction per 5 rules | > 0.8 |
| spatial_continuity | Coherent fret zone, no wild position jumps | > 0.85 |
| directional_persistence | Consistent contour arc | > 0.8 |
| inversion_coherence | Voice leading consistency | > 0.75 |
| activity_architecture | Structural activity variety | > 0.8 |
| anti_bebop_drift | Avoiding bebop clichés | > 0.7 |
| lfv_integrity | All notes within LFV window | > 0.9 |
| interval_dna_continuity | Martino interval signature maintained | > 0.85 |

Overall gate threshold: **7.5 / 10**. Anti-bebop drift hard floor: **0.15**.

---

## Activity Quick Reference

| ID | Name | Character | Best used for |
|---|---|---|---|
| A1 | Opening Line | Stepwise ascending, primary Martino voice | All contexts |
| A2 | Diagonal Bridge | Descending melodic bridge | Connecting phrases, ballads |
| A3 | Pivot Cell | Short pivot figure | Transitions, variety |
| A4 | Anchor Arp | Arpeggiated strong tones | Blues, funk, propulsive lines |
| A5 | Cadential Cell | Closing resolution figure | Phrase endings, ii-V-I |
| A6 | Enclosure Cell | Chromatic approach above and below | Bebop, Barry Harris |
| A7 | Long Span | Wide ascending, 2-bar gesture | Ballads, film, ECM |
| A8 | Rhythmic Displacement | Syncopated A1 variant | Rhythm studies, funk |

---

*Composer OS v1.1.0 · Martino Linear Expressions · Tagged v1.1.0-martino-stable*
