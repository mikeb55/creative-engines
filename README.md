# Composer OS – Dual Guitar System (Indie Song Mode)

## Overview
This branch introduces a refined dual-guitar architecture for Composer OS Song Mode, focusing on musically valid chordal comping for guitar_2 while preserving engine stability and deterministic output.

Version: v1.0.48 (session 2026-04-28)
Branch: feat/chord-event-guitar2
Tip: `git log -1 --oneline` on this branch for the latest commit hash.

---

## Key Features

### 1. Guitar_2 ChordEvent System
- Enforces 2–4 note voicings only
- Removes duplicate pitch classes
- Prevents accidental 5-note stacks
- Uses a single deterministic ChordEvent pipeline

### 2. Voice Role Guard
- If a measure contains a chord event:
  - No additional weak-beat single notes are added
- Prevents clutter and preserves chord integrity

### 3. Offbeat Cleanup Pass
stripIndieGuitar2StrayV2OffbeatSingleNotes
- Runs after voice-role assignment
- Removes unwanted offbeat single notes (e.g., 0.5, 1.5)
- Preserves chord voicings and strong-beat notes

### 4. Voice-1 Density Thinning
thinGuitar2Voice1InChordMeasures
- In measures where guitar_2 voice-2 has a ChordEvent,
  thins guitar_2 voice-1 to max 2 NoteEvents
- Preserves strong-beat (1 & 3) and longer-duration notes first
- Reduces "two players on one staff" clutter

### 5. Stable Export Pipeline
- Downstream processes do not re-voice chords
- MusicXML output preserves voicings exactly
- Fully compatible with Sibelius and MuseScore

### 6. Phrase Engine (duo golden path) — Stages 2–4 (2026-04-28)
- **Stage 2:** 4-bar phrase-type sequencing and inter-phrase contrast (**`PhraseSequencingType`**) — guitar and bass share **`duoGoldenPathPhraseIntentAtBar`** / aligned **`PhraseIntent`**.
- **Stage 3:** Controlled anticipation — at most one voice-1 onset per bar may shift earlier by **one eighth-note**; skipped on cadence bars; Indie dual-electric route skips Stage 3 for stable chord-density metrics.
- **Stage 4:** Motif rhythm — **phrase 2** of each 4-bar cycle (**`b % 4 === 2`**) **compression** (half durations); **phrase 3** (**`b % 4 === 3`**) **augmentation** (double durations when feasible); **phrase 4 / cadence** (**`b % 4 === 0`**) **displacement** (+½ beat on all voice-1 onsets). Indie dual-electric skips Stage 4 (same gate as Stage 3).

### 7. Wayne Shorter — chorus / bridge motif transforms (2026-04-28)
- Seed-deterministic **one** transform per chorus or bridge section (onset shift, rhythmic augment, or leap nudge); merged into **`motifDevelopmentSummary`**.

### 8. Bar-4 phrase-end cadence (duo golden path)
- **Every** 4-bar boundary: phrase-end cadence lengthens voice 1 toward the bar/phrase end and snaps to a chord tone (runs with Song Mode hook path and standard golden-path duo).

### 9. Brian Wilson (Pet Sounds era) songwriter slice (2026-04-28)
- Primary **`brian_wilson`**: Pet Sounds–biased chord pools, melody profile (arch / syncopation / leaps), light guitar shaping + **`brianWilsonPetSoundsSliceReceipt`** / **`brianWilsonPetSoundsDiagnostics`** on **`GenerationMetadata`**. See **`docs/CHANGELOG.md`** and **`engines/composer-os-v2/core/goldenPath/brianWilsonPetSoundsSlice.ts`**.

### 10. Harness & product parity (session)
- Full test matrix: chunked **`runAllTests`** + heap on children; **`test:smoke`** gate unchanged.
- **Wyble parity:** B-category guards use **`isGuitarBassDuoFamily`** so **`song_mode`** / **`song_mode_*`** / single-line duo share intended duo-family rules where the engine meant “guitar + bass stack,” not only the literal **`guitar_bass_duo`** id.

**Detail:** see **`docs/CHANGELOG.md`** **[2026-04-28]** and **`docs/COMPOSER_OS_ROADMAP.md`** (T2.5–T2.11).

---

## Test Coverage

### Indie Guitar_2 Quality Tests
- All chord events contain 2–4 unique pitches
- No duplicated pitch classes
- Measures with chords contain no offbeat single notes
- 60% or more of chord events land on strong beats (1 & 3)
- indieGuitar2ThinVoice1Peak <= 2

### Build + Validation
- npm run test:smoke — PASS (34 passed / 0 failed) — includes **Brian Wilson (Pet Sounds)** songwriter slice smoke
- npm run desktop:build — PASS
- MusicXML exports verified valid

---

## Current Musical State

### Strengths
- Clean chordal comping
- Stable and predictable output
- Idiomatic register range
- No structural MusicXML errors
- Tuning labels above each staff in measure 1
- No bass part — two electrics confirmed

### Limitations
- Comping is still somewhat grid-aligned on **guitar_2** (phrase-engine work targets **lead/bass** duo paths first)
- Indie **guitar_2** interaction with **guitar_1** remains a listening/eval focus
- Strong **global** motif identity beyond pilot writers is still roadmap-tier

---

## Next Development Targets (GCE >= 9)

### 1. Motif System
- Extend recurrence/variation evidence beyond pilot Song Mode / duo slices
- Target similarity score >= 0.7 where product gates apply

### 2. Phrase Grammar
- Golden path now enforces **4-bar phrase intent**, **phrase-end cadence on bar 4 boundaries**, and **controlled anticipation** (see CHANGELOG **2026-04-28**); continue tightening **guitar_2** phrase grammar and interaction.

### 3. Guitar_2 Musical Comping
- Phrase-based comp patterns: beat-based, anticipatory, sparse, syncopated
- Interaction with guitar_1 density
- Introduce controlled silence (~20%)

### 4. Rhythmic Identity
- Layer **Stage 3 anticipation** metrics with **guitar_2** comp identity; limit repetitive rhythm loops on the comp staff

---

## Development Philosophy
- Deterministic generation over randomness
- Musical identity > note density
- Phrase-level logic > bar-level correctness
- Interaction > isolation
- Preserve asymmetry at all costs

---

## Status
Stable **Indie dual-guitar** export + chord-quality smoke; duo **golden path** shipped **Phrase Engine** stage 2/3, **bar-4 cadence**, **Wayne Shorter** chorus/bridge motif pass, chunked **runAllTests**, section-shaping eval tables, and **Wyble B-category** `isGuitarBassDuoFamily` parity (**2026-04-28** — see **`docs/CHANGELOG.md`**).
Next phase: deepen **guitar_2** phrasing vs **guitar_1** and motivic identity on the Indie stack.

---

## License
Internal / Development Use
