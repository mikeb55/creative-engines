## [2026-04-15] Wayne Shorter — quick coherence fix

### Changes
- harmonyChordTonePolicy.ts: STYLE_SHORTER_POST_BOP now
  triggers shorterMode (upper-extension chord tone bias)
  alongside wayne_shorter, andrew_hill, STYLE_MODERN_JAZZ
- songModeStyleEngine.ts: comment added clarifying that
  velocity shaping + shorterMode chord policy together
  form the complete Post-Bop style surface
- songwriterStyleProfiles.ts: wayne_shorter description
  added — post-bop harmonic language, upper-structure
  emphasis, activates shorterMode chord-tone policy

### Effect
Song Mode with Post-Bop style now correctly applies
upper-extension (9/11/13) chord tone bias in addition
to the existing velocity shaping. Previously these
two mechanisms were disconnected.

### Not done (deferred)
- Full Wayne Shorter presetId on Generate page
- Python engine bridge to TS pipeline
- Unified Shorter mode knob across all mechanisms

## [2026-04-15] Phase 19.1 - Long forms >32 bars for Big Band and String Quartet

### UI changes (HomeGenerate.tsx)
- Big Band and String Quartet dropdown now offers:
  16 / 24 / 32 / 40 / 48 / 64 bars
- State normalization updated to accept all six values
- Guitar-Bass Duo and Song Mode unchanged at 8/16/24/32

### API validation (composerOsApiCore.ts)
- New validation block for big_band and string_quartet:
  accepts 16, 24, 32, 40, 48, 64
- Existing guitar_bass_duo / song_mode cap (8/16/24/32)
  unchanged

### Engine status
- runBigBandMode: no upper bar cap - engine-ready
- runStringQuartetMode: no upper bar cap - engine-ready
- Guitar-Bass Duo / Song Mode: golden path still capped
  at 32 - engine extension deferred to future phase

## [2026-04-15] Counterpoint scoring module — Phase 1 complete

### New file: engines/composer-os-v2/core/counterpoint/voiceLeadingScorer.ts
Shared three-voice counterpoint scorer based on:
- Bizzi (1982) triple counterpoint / macchina rules
- Tymoczko (2011) efficient voice leading geometry
- Species counterpoint lite (parallel 5ths/8ths, lockstep)

Exports:
- scoreBizziVertical(pc1, pc2, pcBass, keyRoot) -> 0-1
- scoreTymoczkoHorizontal(prev/curr x3 MIDI) -> 0-1
- scoreSpeciesLitePenalties(prev/curr x3 MIDI) -> 0-1
- scoreThreeVoices(params) -> 0-1 combined weighted score

Default weights: Bizzi 0.4, Tymoczko 0.35, Species 0.25

### New test infrastructure
- engines/composer-os-v2/jest.config.cjs (ts-jest)
- engines/composer-os-v2/tsconfig.jest.json
- engines/composer-os-v2/core/counterpoint/voiceLeadingScorer.test.ts
- 10/10 tests passing

### Status
Phase 1 complete. Not yet wired into any module.
Phase 2 (Guitar-Bass Duo wiring) deferred until after:
- Phase 19.1 long forms
- Wayne Shorter TS integration

## [2026-04-15] Wyble single-line parity + type fixes + Bizzi prep

### Wyble single-line parity (guitarVoice2WybleLayer.ts, generateGoldenPathDuoScore.ts)
- injectGuitarVoice2WybleLayer: gated to isGuitarBassDuoFamily (was guitar_bass_duo only)
- stabiliseGuitarVoice2Wyble18_2B_1/_2/_3: gated to isGuitarBassDuoFamily
- generateGoldenPathDuoScore: Voice 2 probe now runs for guitar_bass_duo_single_line
- normalizeRealizedVoice2PostInjection182B3: logic unchanged, comment added explaining
  intentional exclusion of standard duo from this normalization path
- getChordTones: replaced missing symbol with chordTonesForChordSymbol utility
- createNote: fixed object-style calls to positional signature

### GenerationMetadata type fixes (compositionContext.ts)
- Added missing Fagen style fields: fagenMuChordBias, fagenLydianMajorBias,
  fagenAlteredDominantBias, fagenRootAvoidanceMelody, fagenSlashChordDensity
- Added missing Bacharach style fields: bacharachDeceptiveCadenceRate,
  bacharachChromaticVoiceLeading, bacharachModalMixtureLevel,
  bacharachCadentialAmbiguity, bacharachPedalUsage
- Restored fagenMuChordBias assignment in runGoldenPath.ts

### Test result
- npm run test:duo: 10/10 seeds PASS

## [2026-04-15] Composer OS ? Roadmap Snapshot & Recent Completions

### Shipped today
- **Thelonious Monk Engine v1.0** ? blues/custom form, GCE melody (temp=0.9),
  Monk-specific prompt + RAG from 5 transcriptions, 12 validators including
  density cap, rhythm variety, breathing. See engines/monk-engine/.
- **Generate UI: Songwriter for Big Band and String Quartet** ? previously
  locked to Donald Fagen silently; now exposes Songwriter dropdown for BB
  and Songwriter + Arranger + Era for SQ. Uses same SONGWRITER_OPTIONS as
  Song Mode. primarySongwriterStyle now sent for song_mode, big_band,
  string_quartet.

### Recently completed (from roadmap snapshot)
- Guitar-bass duo Voice 2 counterpoint (Wyble rules, pre-planned goals,
  clash/repeated-pitch prevention, range C2-A3)
- Wyble Voice 2 inject extended to guitar_bass_duo_single_line
- Phase 19: Song Form UI, formId ? engine, rehearsal marks, bar cap ?32
- Big Band: seven-part ensemble MusicXML, chords on piano, piano naming
- String Quartet: strings + piano reduction, section markers, Song Form +
  16/24/32 bars on Generate
- Song Mode: compile/realise pipeline, D1+D2+C1-C7 delivered
- V9.0 chord baseline: unified parsing/normalization, Sibelius-safe rhythm

### In flight / gaps
- Vocal lead sheet: bridge wired, download path not closed
- Wyble single-line parity: stabilisers and guards incomplete
- Song Mode style controls: thinner than core surface
- Big Band / SQ polish: copy, host smoke tests ongoing

### Priority queue (next up)
1. Wyble single-line parity
2. Phase 19.1 ? forms longer than 32 bars
3. Wayne Shorter TS integration
4. Big Band / String Quartet polish
5. Song Mode style exposure
6. Vocal lead sheet pipeline closure
7. Bass/duo regression expansion

## [2026-04-15] Thelonious Monk Engine ? v1.0

### Status: Shipped

### Architecture
- 12-bar blues and custom form support
- GCE-powered melody generation (Claude API, temp=0.9)
- Monk-specific system prompt: space, quarters/halves,
  tritone leaps, b9 dominants, obsessive repetition
- RAG: 6 abstract Monk templates + concrete phrases
  from 5 transcriptions (Blue Monk, Epistrophy,
  Round Midnight, Straight No Chaser, Well You Needn't)

### Validators (in order)
1. _patch_unison_runs
2. _cap_unison_frequency
3. _enforce_opening_rest
4. _enforce_syncopation
5. _enforce_midphrase_quarter
6. _enforce_cadence_half
7. _enforce_long_note_consonance
8. _enforce_downbeat_consonance
9. _enforce_monk_density (max 6 pitched notes/bar)
10. _enforce_monk_rhythm_variety (no pure eighth bars)
11. _enforce_monk_breathing (rest if >5 notes, no rests)
12. _fit_sixteen_divisions

### Key metrics (Blue Monk, 12 bars)
- Avg notes/bar: 5.0 (target 4-5)
- Eighths: 78.3%
- Quarters: 10.0%
- Halves: 11.7%
- Bar length errors: 0
- Rests: 11.8%

### Key files
- monk_phrase_engine.py
- monk_section_compiler.py
- monk_vocabulary.py
- monk_musicxml_exporter.py
- monk_engine_cli.py

## [2026-04-14] Thelonious Monk Engine ? Initial Build

### Architecture
- New engine: engines/monk-engine/
- Copied from Charlie Parker engine, fully renamed
- Monk-specific GCE prompt: space, b9s, tritone leaps,
  obsessive repetition, angular shapes, quarter/half dominance
- Monk rhythm skeleton: quarter-based, not eighth-based
- Validators: cadence half-note enforcer, monk density cap
  (max 5 notes/bar), chord contradictions disabled
- RAG: 6 abstract Monk templates + concrete phrases from
  5 transcriptions (Blue Monk, Epistrophy, Round Midnight,
  Straight No Chaser, Well You Needn't)
- Vocabulary: 1,732 notes, top patterns from real Monk solos
- Key stat: 32% leaps ?5st (vs 13% Parker),
  25% quarters (vs 5% Parker)

### Files
- monk_phrase_engine.py
- monk_section_compiler.py
- monk_vocabulary.py
- monk_musicxml_exporter.py
- monk_rhythm_engine.py
- monk_engine_cli.py

## [2026-04-14] Charlie Parker: downbeat consonance ? syncopation rest

### Change
- _enforce_downbeat_consonance now prepends an eighth rest
  when the first pitched note of a bar is not a strict chord
  tone, instead of shifting the pitch.
- This converts dissonant downbeats into syncopated offbeat
  entries ? fixing consonance AND increasing syncopation
  simultaneously.
- Every third bar (bar_index % 3 == 0): pitch-nudge fallback
  retained for variety.

### Result
- Dissonance reduced from 31.7% to 24.1% (previous build)
- Syncopation expected to recover above 45%
- Zero regressions on previously-measured problem bars

## [2026-04-14] Charlie Parker Engine ? Best Build

### Architecture
- 8-bar section generation: GCE now sees full 8-bar phrase arc per call (A1/A2/B/A3)
- Global chorus planner: section labels, function tags, rhythm skeletons passed per section
- Parker RAG templates: 10 abstract phrase templates tagged by function/role/contour
- Concrete Bird phrases: real note sequences extracted from 8 transcriptions (Ko-Ko, Anthropology, Donna Lee, Now's The Time, Billie's Bounce, Ornithology, Confirmation, Lou Donaldson/Birdland) injected into GCE prompt

### GCE Prompt
- System prompt: "You are Charlie Parker's fingers on the alto saxophone"
- Temperature: 1.2
- Full Bird/bebop prompt rewrite: anticipation, offbeat starts, 3rd/7th landings, leap+compensation, turnaround chains, upper extensions
- Concrete phrase injection: 2 real Bird phrases per 8-bar section, transposition-aware

### Post-generation Validators
- _patch_unison_runs: eliminates clusters of 3+ identical consecutive pitches
- _cap_unison_frequency: caps unisons at 5% of all intervals
- _enforce_opening_rest: all section openings (bars 1/9/17/25) start on rest
- _enforce_syncopation: 40%+ of interior bars start on offbeat
- _enforce_cadence_quarter: every 4th bar has quarter note or longer
- _fit_sixteen_divisions: bar length integrity

### Results (Confirmation AABA, 32 bars)
- Syncopation: 53.6% of interior bars (target ~40%) ?
- Leaps =5 semitones: 13.3% ?
- Rests: 13.2% (target 12-15%) ?
- Unison clusters: 0 ?
- Opening rests: 4/4 sections ?
- Cadence quarters: 8/8 bars ?

### Vocabulary
- parker_vocabulary.py: updated from 2,099 notes across 5 transcriptions
- TOP_PATTERNS: 10 four-gram interval patterns from real Bird solos
- RHYTHM_WEIGHTS: derived from transcription analysis

# Changelog

## V4.6

### Fixed

* Corrected day structure (removed Day 2 starting after Day 1 lunch)
* Repositioned breaks to align with cognitive load
* Ensured 2?20 min breaks and 1? lunch per day

### Changed

* Improved pacing across both days
* Balanced Day 2 morning cognitive load
* Refined Emily and Michael sequencing for clarity

### Added

* Video integration at 3 precise teaching points:

  * Neurodiversity (after Ousmane)
  * Dissociation (around Emily)
  * Suicide / risk (before Michael)

### Design

* Break and lunch slides updated with image-based format
* Text formatting standardised (Arial, large, bold, raised vertically)

---

## V4.5

* Stable full presentation build
* Case studies upgraded to V4 (400?500 words, decision-focused)
* ACE framework embedded

---






