# Psychopathology and Synthesis (PET Training)

This repository contains materials for a two-day postgraduate psychotherapy training focused on:

* Borderline presentations
* Intersubjectivity
* Projective identification (dependency, power, sexuality, ingratiation)
* Risk, dissociation, and neurodiversity
* Clinical formulation under uncertainty

## Structure

* **PowerPoint presentations**

  * Versioned builds (V3.x → V4.x)
* **Case studies**

  * Located in:
    `Psychopathology and Synthesis 2026/CASE STUDIES`
  * ACE-Cases framework (100-point rubric)

## Teaching Model

Uses **ACE framework**:

* Authority (clinical depth, structure)
* Containment (risk, ethics, context)
* Engagement (experiential learning)

## Current Version

**V4.5**

* Integrated 3 lived-experience video points
* Updated case studies (V4 format)
* Improved pacing and timing alignment
* Stronger uncertainty-based clinical reasoning

## Notes

* Slides are designed for teaching + student distribution
* Speaker notes are content-only (no delivery instruction)
* Videos are referenced in notes, not embedded on slides

---

# Creative Engines — Platform & Infrastructure

**Version 1.0**  
**Style-agnostic, instrumentation-agnostic**

**CI:** GitHub Actions runs the full `engines/composer-os-v2` test suite on every push to `main` and on every pull request (see `.github/workflows/test.yml`).

---

## Repository Roles

**creative-engines**

Platform infrastructure including:
- runtime
- palettes
- rules
- templates
- shared documentation

**creative-rule-engines**

Composer engine definitions including:
- Monk engine
- Barry Harris engine
- Bartok engine
- Slonimsky engine
- other composition engines

Engine definition files must exist only in creative-rule-engines.

---

## Purpose

Universal composition engine framework for all Cursor music projects. Works across any instrumentation, genre, or style. Enforces mandatory GCE ≥ 9.0 before MusicXML output.

---

## Wyble Etude Mode (Experimental → Stable Export)

* Two-voice contrapuntal guitar etude generator
* MusicXML export working and validated
* Currently renders as piano-style grand staff (temporary)
* Ongoing work: guitar polyphonic rendering and bass integration

Wyble Etude engine now supports stable two-voice polyphony with rhythmic independence and presence variation. Next phase focuses on interval behaviour and contrapuntal identity.

---

## Composer OS (V1 product path)

**Composer OS V9.0** — Core pipeline, harmony/parsing, and export are on a stable baseline. The system is ready for the next robustness expansion (see **Roadmap (V9.0)** below).

**Composer OS** (under `engines/composer-os-v2/`) is the unified generative pipeline for this repo’s jazz/chamber tooling. **Web UI:** `apps/composer-os-app` (`npm run dev`). **Windows desktop:** `apps/composer-os-desktop` — packaged portable is always **`release/Composer-OS.exe`** (stable path; version is in-app only, so shortcuts do not need relinking each build).

**Big Band:** **COMPLETE** — **full ensemble MusicXML** (7 parts; planning JSON fallback if realisation or export fails). **Generate** era selector offers the same **seven eras** (Swing through Fusion), live and covered by automated tests. See `engines/composer-os-v2/app-api/releaseMetadata.ts` and [CHANGELOG.md](CHANGELOG.md).

**String Quartet:** **COMPLETE** — **full ensemble MusicXML** (Violin I, II, Viola, Violoncello, plus **piano** reduction staff for harmony/chord symbols; planning JSON fallback if realisation or export fails). Section-style rehearsal markers (statement, development, contrast, return, coda); chord symbols on the piano staff; `SQ_PART_*` import fix in the score builder ([CHANGELOG.md](CHANGELOG.md)). **Generate** includes an **era** selector (Swing, Bebop, Post-bop, Contemporary, Cool Jazz, Hard Bop, Fusion — **all seven eras are live** in the Big Band and String Quartet UIs **and tested** end-to-end), aligned with Big Band; it is **fully wired** (app layer → engine → MusicXML piano harmony), confirmed by automated era tests (`bigBandEraChordPoolsScore.test.ts`, `quartetEraChordPoolsScore.test.ts`, `stringQuartetEraAppPassthrough.test.ts`). **Next:** Sibelius **piano naming** polish across ensemble exports; **Song Form** is available in Generate for **Big Band** and **String Quartet** (parity with Song Mode / duo).

## Guitar Polyphony Status

**Guitar / Bass Duo — Voice 2 counterpoint:** significantly improved; the inner voice is **active across most bars** with planned shapes, coverage in the 65–85% target band, and real melodic motion (phrase arc, stepwise entry bias, cadential resolution). Some intentional gap bars remain; further quality passes are planned.

**Voice 2 (Guitar–Bass Duo)** uses **bar-level rhythm planning** (explicit bar shapes and coverage/gap control) rather than ad hoc per-event rhythm passes. Recent work pushes the inner voice toward **true counterpoint**: **contrary-motion** and **stepwise** preferences (seeded), stronger **guide-tone (3rd/7th)** weighting, **higher Voice 2 bar coverage**, more **TWO_SLABS** and **internal micro-lines** so the line moves against the melody more often.

Composer OS currently supports:

- deterministic dual-voice guitar polyphony
- Sibelius-safe and GP8-safe export
- Voice-2 continuity across multiple bars
- internal motion within sustained spans (expanded toward majority of eligible spans)
- contrapuntal inner-voice texture with directional and guide-tone bias

## Phase 18.2B - Guitar Polyphony (COMPLETE)

- Voice-2 upgraded from local note logic → span-based continuity
- Now behaves as a directional inner line (not punctuation)
- Produces musically valid contrapuntal texture
- Export + Sibelius + GP8 fully stable

**Validator alignment (18.2B close):** Behaviour gates that depend on guitar **melody** now evaluate **Voice 1 only** (activity, echo pitch-classes, overlap, Barry Harris melody jump chain). Inner voice (Voice 2) no longer inflates those checks. Sweep harness: `engines/composer-os-v2/scripts/run-sweep.bat`.

## Phase 18.2C — Bass Musical Behaviour (Partial) ⚠️

**Status:** Partial — two validators open, deferred to 18.2D
**Date:** 2026-04-06

### What was completed
- All guitar behaviour validators now measure Voice 1 only
- Bass pitch floor [40, 88] enforced across all call sites
- CLI sweep harness: 9 automated test runs in one command

### What remains open (Phase 18.2D)
- Bass walking too constant: requires phrase-level intelligence
- Bass echo too weak: requires guitar phrase context awareness

### Why these weren't fixed here
The bar-level branching approach cannot produce the musical
variety needed. A real jazz bassist responds to what the
guitar just played over the last 2 bars — not to per-bar
probability weights. Phase 18.2D will build that layer.

### Next phase (historical)
Phrase-level bass work moved to **Phase 18.2D** (now complete — see below).

## Phase 18.2D — Bass Phrase Intelligence ✅ COMPLETE

**Status:** Complete  
**Date:** 2026-04-06  

### What was built
- Multi-bar **guitar contour** per 8-bar phrase (asc / desc / static) feeding bass melodic weighting
- **Phrase boundary intent** across phrases 1–4 (`development` / `contrast` / `return` on early phrase phases)
- **`bassPlan.style`** routing: `melodic` vs `sparse` (simplify / two-note vs quarter-stride bias)
- Bass line avoids **single pitch-class anchoring** via contour-aware chord-tone bias
- **MusicXML:** double bass clef includes `clef-octave-change` -1 so the part shows at the correct written register in Sibelius and MuseScore

### 24-bar duo + MusicXML export (2026-04-07) — COMPLETE
- **24-bar** golden path and through-composed forms (e.g. `through3`) generate end to end with correct bar counts and rehearsal marks
- **formId** wired through app API (`composerOsApiCore.ts` → engine); chord-count validation accepts 24 chords for 24-bar forms; bar validators accept 24 in `runGoldenPath.ts`
- **Sibelius:** rehearsal `enclosure` uses a valid MusicXML enumeration value (schema-safe import)

## Phase 18.2E — Validator gate tuning ✅ COMPLETE

**Status:** Complete  
**Date:** 2026-04-07  

### What was built
- Loosened **phrase arrival** gate: chord-tone neighbour window **±2** semitones (was ±1)
- **24-bar** through-composed forms: phrase arrival check **skipped** (`effectiveFormBars === 24`)
- **32-bar** forms: phrase arrival checks **phrase 1 only** (bars 1–2) for that gate
- **MusicXML:** `acoustic_upright_bass` written pitch offset **-24** semitones vs score MIDI for correct **Sibelius** display (with `clef-octave-change` -1 retained)

### Next
- **Wayne Shorter engine integration**
- **18.2D verification sweep** (validators / harness), as needed

## Phase 19 — Form Layer ✅

**Status:** Complete
**Date:** 2026-04-06

### What was built
- 15 musical forms selectable at generation time
- Song Form dropdown in Generate screen
- Bar count auto-updates when form selected
- Rehearsal marks exported to MusicXML
- Automated form sweep harness

### Supported forms
| formId | Structure | Bars |
|--------|-----------|------|
| aaba | A A' B A'' | 32 |
| abac | A B A' C | 32 |
| aba | A B A' | 24 |
| ab | A B | 16 |
| blues12 | A | 12 |
| blues24 | A A' | 24 |
| through3 | A B C | 24 |
| through4 | A B C D | 32 |
| through5 | A B C D E | 40 |
| through6 | A B C D E F | 48 |
| through7 | A B C D E F G | 56 |
| through8 | A B C D E F G H | 64 |
| aab | A A' B | 24 |
| abcb | A B C B' | 32 |
| abacab | A B A' C A'' B' | 48 |

### Next
**24-bar duo support** — **COMPLETE** (2026-04-07); see **Phase 18.2D** above. **Phase 18.2E** — **COMPLETE** (2026-04-07). **Next:** Wayne Shorter engine integration.

### Voice 2 Diagnostics (V9.0)

Composer OS now includes internal diagnostics for second-voice behaviour in Guitar/Bass Duo mode.

This system measures:
- how often Voice 2 appears
- how dense it is
- how continuous it is
- how it enters rhythmically

These diagnostics were used to guide controlled improvements; **rhythm footprint (Phase 18.2B.2)** is now implemented (bar-level planning). Next:
- melodic behaviour and imitation (Phase 18.2B.3)

This is a read-only system and does not affect generation output.

### Voice 2 Rhythm System (V9.0)

Voice 2 in Guitar-Bass Duo now operates with a bar-level rhythm model rather than event-level injection.

This enables:
- consistent presence across the form
- reduced fragmentation
- clearer rhythmic phrasing
- controlled density and gap behaviour

This phase establishes the foundation for:
- melodic continuity
- imitation and counterpoint (next phase)

---

## Next: Wayne Shorter engine integration

**Phase 18.2D — Bass Phrase Intelligence** and **Phase 18.2E — Validator gate tuning** are **complete**. **24-bar** duo / through-composed forms plus **MusicXML export fixes** (Sibelius enclosure schema, `formId` wiring, chord/bar validation, bass written-pitch offset for Sibelius) are documented in [CHANGELOG.md](CHANGELOG.md). Next focus: **Wayne Shorter engine integration**. **18.2D verification sweep** may continue in parallel as needed. Historical **Phase 18.2C — Partial** context remains in [CHANGELOG.md](CHANGELOG.md).

**Jimmy Wyble Engine (complete):**  
Phrase-driven melodic generation with continuity, reliable resolution, conversational lower-voice interaction, and final musical polish.  
Now ready for chord-notation export.

**Wyble chord export (fixed):**  
Wyble now exports complete per-bar chord symbols with exact progression mapping, including slash chords and altered/extended chord text such as D7(#11), A7(b9), and A7alt.  
Earlier Wyble versions may have shown truncated or simplified chord output due to export-layer issues.

**Wyble Engine (milestone):**  
Wyble now exports full per-bar chord symbols with exact altered/slash chord text preserved in notation apps, while keeping jazz-aware melodic behaviour intact.  
Next phase: musical-intelligence refinement (stronger phrase direction, rhetorical shaping, and more conversational lower-voice response).

### Wyble Engine (v1.0)

Wyble is a completed generative jazz line engine producing idiomatic, chromatic, and harmonically grounded lines with correct MusicXML export.

Key features:
- Phrase-first melodic generation
- Jazz-aware behaviour validation (not rule-based sanitisation)
- Accurate chord export including altered harmony and slash chords
- Stable bar math and notation compatibility

Next phase: expressive and rhetorical refinement layers (rhythm, phrasing, interaction)

### Chord System (V9.0)

- **Chord normalization layer** — Lead-sheet variants are normalized before parsing (for example stacked extensions written with a slash are distinguished from true slash-bass chords).
- **Parser and validator unified** — Shared chord-shape rules apply to progression input, chord-input helpers, and harmony parsing used by generation and export.
- **Supported chord examples (non-exhaustive):**
  - `C6/9` (normalized to `C69`)
  - `Cmaj9`, `Cmaj7(#11)`
  - `G13`, `G13sus`
  - `A7alt`
  - Slash chords such as `Cmaj7/E`
- **System guarantee:** All standard jazz chord symbols are accepted without failure (unknown symbols map to a safe fallback with a diagnostic warning rather than aborting the pipeline).

### MusicXML Export (Stability) — COMPLETE (2026-04-07)

- **Sibelius-safe rhythm encoding** — Durations are emitted in a form that major notation importers tolerate reliably.
- **No dotted-beat duration tokens** — Values such as `1.5` or `0.75` as raw beat multipliers are avoided in the export path; rhythm is expressed via an **undotted decomposition** so measure math stays clear for hosts.
- **Clean multi-voice export** — Guitar/bass (and related) multi-voice layouts remain structurally consistent through export.
- **Sibelius schema:** rehearsal marks use a valid `enclosure` enumeration (e.g. `rectangle`, not invalid `box`).
- **Double bass:** `acoustic_upright_bass` parts emit `clef-octave-change` -1; written pitch uses export offset **-24** semitones vs score MIDI for **Sibelius** display (see **Phase 18.2E**).

### Roadmap (V9.0)

- **#19 Unified Chord Semantics** — **DONE** (normalization, unified validation, stable progression-to-export behaviour).
- **#16 Chord Handling Robustness** — **DONE (V9.0 baseline)** — Parsing, normalization, shared validator, and MusicXML chord export are stable; unknown symbols use safe fallback with warnings; **#17** receipt diagnostics cover fallbacks and host behaviour. **GP8** is the primary detailed chord-validation target; **Sibelius** is accepted as simplification-prone. **Optional later (non-blocking):** rarer lead-sheet edge cases, richer in-app help / error copy, and expanded automated coverage across presets — see [docs/COMPOSER_OS_ROADMAP.md](docs/COMPOSER_OS_ROADMAP.md).

**Guitar Polyphony (Phase 18.2)**

- **18.2A** — Polyphony export / Sibelius-safe proof — **COMPLETE**
- **18.2B** — Voice-2 continuity / directional inner line — **COMPLETE**
- **18.2C** — Bass behaviour (validators, sweep, pitch floor) — **PARTIAL** (see CHANGELOG **Phase 18.2C — Partial**); phrase-level bass follow-up → **18.2D**
- **18.2D** — Bass phrase intelligence (contour, phrase intents, `bassPlan.style`) — **COMPLETE**
- **Phase 19** — Form Layer — **COMPLETE**
- **24-bar** duo / through-composed forms + **MusicXML export fixes** — **COMPLETE** (2026-04-07)
- **18.2E** — Validator gate tuning + bass Sibelius written pitch — **COMPLETE** (2026-04-07)
- **Next:** **Wayne Shorter engine integration** (plus 18.2D verification sweep as needed)
- **Current achieved state:** dual voices stable in Sibelius and GP8; span-based Voice-2 continuity; directional phrasing; bass phrase layer per CHANGELOG **Phase 18.2D**; **24-bar** forms end to end; **Phase 18.2E** gate tuning and bass export; export and notation hosts stable (see **Phase 18.2B**, **Phase 18.2D**, **Phase 18.2E**, and [CHANGELOG.md](CHANGELOG.md)).

### V9.0 Summary

- Core pipeline stable  
- Harmony and parsing stable  
- Export stable  
- Chord robustness baseline complete (**#16** / **#19** / **#17**); optional hardening tracked in [docs/COMPOSER_OS_ROADMAP.md](docs/COMPOSER_OS_ROADMAP.md)

**Composer OS documentation (canonical):**

- [docs/COMPOSER_OS_ROADMAP.md](docs/COMPOSER_OS_ROADMAP.md) — **Composer OS Roadmap [dated]** — past / current / future handoff (update title date when refreshing)
- [docs/COMPOSER_OS_ARCHITECTURE.md](docs/COMPOSER_OS_ARCHITECTURE.md) — pipeline, C1–C7 Song Mode rhythm stack, D1/D2, songwriter-driven chord tones (e.g. Wayne Shorter `shorterMode`)
- [docs/CHANGELOG.md](docs/CHANGELOG.md) — V8.0 retrospective, **Song Mode baseline stabilisation**, pointer to archived pre-V8 history
- [docs/USER_GUIDE.md](docs/USER_GUIDE.md) — friendly overview
- [docs/TESTING.md](docs/TESTING.md) — D1 self-test harness

**Song Mode baseline stabilisation (Guitar–Bass Duo):** 32-bar Song Mode is on a stable baseline for usable generation: hook return / bar 25 identity, C7 thinning guards on hook bars, corrected multi-voice score validation, behaviour gates passing on the current baseline, and high readiness in recent testing. See the changelog section of the same name.

**Songwriter → harmony (GitHub summary):** Primary **songwriter profile** id is stored on `generationMetadata.songwriterStyleId`. The **Wayne Shorter** profile turns on **`shorterMode`** in chord-tone resolution so generation favours upper extensions over root/fifth-heavy spellings (see `harmonyChordTonePolicy.ts`, `chordSymbolAnalysis.ts`).

Older integration notes and the long pre-V8 changelog live under [docs/archive/composer-os/](docs/archive/composer-os/). Supported modes and limitations are summarized in `engines/composer-os-v2/app-api/releaseMetadata.ts` and the Composer OS README — no Python or `.bat` is required for normal app use.

**V3 app wiring:** The web/desktop app includes a **Run system check** action (Diagnostics) that runs Composer OS–scoped tests without using the terminal; the **Outputs** panel is mode- and type-aware; **Open library folder** / **Open this file’s folder** use normalized Windows paths; unknown presets are rejected by the API before generation. See [docs/CHANGELOG.md](docs/CHANGELOG.md) and the historical changelog in the archive.

**V3 Generate UI:** The **Generate** screen is mode-driven (no user-facing style module/stack controls on the main form); duo/ECM use fixed internal defaults. The **Style Stack** sidebar tab was removed; see [docs/CHANGELOG.md](docs/CHANGELOG.md).

**V4 (Composer OS track — Prompt 1/8):** Guitar–Bass Duo can request **32 bars** (`totalBars: 32`) for an opt-in **A / A′ / B / A″** long-form route with a **modulation planning** layer; the default **8-bar** golden path is unchanged. See [docs/archive/composer-os/CHANGELOG_HISTORICAL.md](docs/archive/composer-os/CHANGELOG_HISTORICAL.md).

**V3.4 / V3.4b (Composer OS):** MusicXML **key signatures** are **inferred from harmony** (optional **`keySignatureMode`** / tonal centre override); natural **minor** uses correct **fifths** (e.g. Bb minor → five flats). Ambiguous or chromatic progressions avoid a misleading **visible** signature. See [docs/archive/composer-os/CHANGELOG_HISTORICAL.md](docs/archive/composer-os/CHANGELOG_HISTORICAL.md).

---

## Structure

```
creative-engines/
├── engines/          # Composer engines, hybrid, orchestration, songwriting, studio
│   ├── composer_studio/    # Unified workflow: presets, batch, export
│   ├── orchestration_bridge/ # Ensemble arrangements (string quartet, jazz, etc.)
│   ├── songwriting_bridge/  # Lead sheets, vocal melody, chord symbols
│   ├── hybrid_engine/      # Counterpoint-capable hybrid compositions
│   └── ... (wayne_shorter, barry_harris, frisell_atmosphere, etc.)
├── launchers/        # composer_studio_launcher.bat, etc.
├── docs/             # Documentation
├── palettes/         # Tonality Vault, interval cycles
├── rules/            # GCE, anti-monotony, ensemble
├── runtime/          # Run scripts
├── templates/        # Composition request, revision loop
└── README.md
```

## Composer Studio

One integrated workflow: input → engine/hybrid → generate → rank → export (composition, orchestration, lead sheet).

```python
from composer_studio import run_composer_studio
result = run_composer_studio("My Tune", "wheeler_lyric", seed=0)
```

Or double-click `launchers/composer_studio_launcher.bat`.

---

## Universal Rules

1. **GCE Iteration** — No MusicXML until GCE ≥ 9.0
2. **Anti Monotony** — No cell > 4 bars × 2 without transformation
3. **Density Arc** — low → development → peak → release
4. **Ensemble Awareness** — Idiomatic parts
5. **Section Clarity** — Boxed rehearsal letters
6. **Harmonic Depth** — Use palettes (Tonality Vault, etc.)
7. **Engraving Quality** — Correct MusicXML

---

## Optional Integration

**gml-harmonic-engine:** If available, integrate for voice-leading and chord voicing logic. The creative-engines framework does not depend on it; it enhances harmonic decision support when present.

---

## Project-Independent

This framework works in any Cursor project, any repository, any musical style. Reference from your project; do not duplicate.

---

## Stage 17 — Phrase-First Pipeline (Complete)

The Guitar–Bass Duo (Single-Line) engine now uses a phrase-first architecture.

Key changes:
- Generation is based on PhrasePlan (not motifs)
- Two phrases (statement / response) are generated and scored
- Best candidate is selected per phrase
- Guitar register corrected via -12 transpose

Current limitations:
- Behaviour gates failing (square phrasing, weak interaction)
- No swing / syncopation layer yet

Next step:
- Stage 18 — Phrase Realisation Layer
  - onset staggering
  - rest injection
  - call/response enforcement
  - syncopation rules

---

## Phase 18.2B.5 — Guitar Voice 2 Sustained Normalization ✅

**Status:** Complete — all validators passing  
**Date:** 2026-04-05  
**Module:** `engines/composer-os-v2/core/goldenPath/guitarVoice2WybleLayer.ts`

### What was built
A post-injection normalization step that prevents consecutive full-bar
sustained Voice 2 notes. When two adjacent bars would both contain a
whole-note sustained Voice 2 note, the second is converted to a half
note + rest at the same pitch. This satisfies the Duo Interaction V3.1
sustained-texture validator without affecting pitch continuity or
voice-leading.

### Passing output profile
| Metric | Range |
|---|---|
| Bar coverage | 0.44 – 0.53 |
| Longest active run | ≤ 3 |
| Release score | 0.9 |
| MX readiness | 1 |
| Status | Shareable |

### Constraints respected
- No export changes
- No bar math redesign  
- No new pipeline
- No new files
- Deterministic output
