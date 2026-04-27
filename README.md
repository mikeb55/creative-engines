# Composer OS – Dual Guitar System (Indie Song Mode)

## Overview
This branch introduces a refined dual-guitar architecture for Composer OS Song Mode, focusing on musically valid chordal comping for guitar_2 while preserving engine stability and deterministic output.

Version: v1.0.47
Commit: b5f4cc7
Branch: feat/chord-event-guitar2

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

---

## Test Coverage

### Indie Guitar_2 Quality Tests
- All chord events contain 2–4 unique pitches
- No duplicated pitch classes
- Measures with chords contain no offbeat single notes
- 60% or more of chord events land on strong beats (1 & 3)
- indieGuitar2ThinVoice1Peak <= 2

### Build + Validation
- npm run test:smoke — PASS (33 passed / 0 failed)
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
- Comping is too grid-aligned
- Limited rhythmic personality
- Weak interaction with guitar_1
- Melody lacks strong motif identity
- Phrase endings not clearly articulated

---

## Next Development Targets (GCE >= 9)

### 1. Motif System
- Introduce motif extraction (bars 1–2)
- Enforce recurrence and variation
- Target similarity score >= 0.7

### 2. Phrase Grammar
- 4-bar phrase structure: Idea, continuation, variation, cadence
- Strong cadential resolution required

### 3. Guitar_2 Musical Comping
- Phrase-based comp patterns: beat-based, anticipatory, sparse, syncopated
- Interaction with guitar_1 density
- Introduce controlled silence (~20%)

### 4. Rhythmic Identity
- Introduce controlled asymmetry
- Limit repetitive rhythm loops
- Allow constrained anticipations

---

## Development Philosophy
- Deterministic generation over randomness
- Musical identity > note density
- Phrase-level logic > bar-level correctness
- Interaction > isolation
- Preserve asymmetry at all costs

---

## Status
Current state is a stable musical baseline (~GCE 7.8–8.3)
Next phase targets motivic identity, phrasing, and interaction

---

## License
Internal / Development Use
