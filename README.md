# Creative Engines — Platform & Infrastructure

**Version 1.0**  
**Style-agnostic, instrumentation-agnostic**

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

## Guitar Polyphony Status

Composer OS currently supports:

- deterministic dual-voice guitar polyphony
- Sibelius-safe and GP8-safe export
- Voice-2 continuity across multiple bars
- initial internal motion within sustained spans
- sparse, non-chordal contrapuntal texture

## Phase 18.2B - Guitar Polyphony (COMPLETE)

- Voice-2 upgraded from local note logic → span-based continuity
- Now behaves as a directional inner line (not punctuation)
- Produces musically valid contrapuntal texture
- Export + Sibelius + GP8 fully stable

⚠️ Important:
Validation layer is now out of sync with generation.
Next phase will align validator with improved musical behaviour.

### Voice 2 Diagnostics (V9.0)

Composer OS now includes internal diagnostics for second-voice behaviour in Guitar/Bass Duo mode.

This system measures:
- how often Voice 2 appears
- how dense it is
- how continuous it is
- how it enters rhythmically

These diagnostics are used to guide controlled improvements to:
- rhythm footprint (Phase 18.2B.2)
- melodic behaviour and imitation (Phase 18.2B.3)

This is a read-only system and does not affect generation output.

---

## Next Phase: 18.2C - Validator Alignment

Goal:
Update Behaviour Validation Gates so they correctly evaluate:
- directional phrasing
- controlled leaps
- distributed identity (not single-bar peaks)

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

### MusicXML Export (Stability)

- **Sibelius-safe rhythm encoding** — Durations are emitted in a form that major notation importers tolerate reliably.
- **No dotted-beat duration tokens** — Values such as `1.5` or `0.75` as raw beat multipliers are avoided in the export path; rhythm is expressed via an **undotted decomposition** so measure math stays clear for hosts.
- **Clean multi-voice export** — Guitar/bass (and related) multi-voice layouts remain structurally consistent through export.

### Roadmap (V9.0)

- **#19 Unified Chord Semantics** — **DONE** (normalization, unified validation, stable progression-to-export behaviour).
- **#16 Chord Handling Robustness** — **Next phase** (deeper edge cases, UX messaging, and continued hardening on top of the V9.0 baseline).

**Guitar Polyphony (Phase 18.2)**

- **18.2A** — Polyphony export / Sibelius-safe proof — **COMPLETE**
- **18.2B** — Voice-2 continuity / directional inner line — **COMPLETE**
- **18.2C** — Validator alignment — **NEXT** (behaviour gates vs improved generation)
- **Current achieved state:** dual voices stable in Sibelius and GP8; span-based Voice-2 continuity; directional phrasing; export and notation hosts stable (see **Phase 18.2B - Guitar Polyphony (COMPLETE)** above).

### V9.0 Summary

- Core pipeline stable  
- Harmony and parsing stable  
- Export stable  
- System ready for robustness expansion (**#16**)

**Composer OS documentation (canonical):**

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
