## [2026-04-15] Thelonious Monk Engine ó v1.0

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

## [2026-04-14] Thelonious Monk Engine ó Initial Build

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
  entries ù fixing consonance AND increasing syncopation
  simultaneously.
- Every third bar (bar_index % 3 == 0): pitch-nudge fallback
  retained for variety.

### Result
- Dissonance reduced from 31.7% to 24.1% (previous build)
- Syncopation expected to recover above 45%
- Zero regressions on previously-measured problem bars

## [2026-04-14] Charlie Parker Engine ù Best Build

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
* Ensured 2◊20 min breaks and 1◊ lunch per day

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
* Case studies upgraded to V4 (400ñ500 words, decision-focused)
* ACE framework embedded

---


