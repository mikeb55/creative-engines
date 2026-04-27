# Composer OS – Dual Guitar System (Indie Song Mode)

## Overview

This branch introduces a refined dual-guitar architecture for Composer OS Song Mode, focusing on musically valid chordal comping for `guitar_2` while preserving engine stability and deterministic output.

Version: v1.0.47  
Commit: b5f4cc7  
Branch: feat/chord-event-guitar2  

---

## Key Features

### 1. Guitar_2 ChordEvent System

- Enforces **2–4 note voicings only**
- Removes duplicate pitch classes
- Prevents accidental 5-note stacks
- Uses a single deterministic ChordEvent pipeline

### 2. Voice Role Guard

- If a measure contains a chord event:
  - No additional weak-beat single notes are added
- Prevents clutter and preserves chord integrity

### 3. Offbeat Cleanup Pass

`stripIndieGuitar2StrayV2OffbeatSingleNotes`

- Runs after voice-role assignment
- Removes unwanted offbeat single notes (e.g., 0.5, 1.5)
- Preserves:
  - chord voicings
  - strong-beat notes

### 4. Stable Export Pipeline

- Downstream processes DO NOT re-voice chords
- MusicXML output preserves voicings exactly
- Fully compatible with Sibelius / MuseScore

---

## Test Coverage

### Indie Guitar_2 Quality Tests

- All chord events contain **2–4 unique pitches**
- No duplicated pitch classes
- Measures with chords contain **no offbeat single notes**
- ≥60% of chord events land on strong beats (1 & 3)

### Build + Validation

- `npm run test:smoke` → PASS
- `npm run desktop:build` → PASS
- MusicXML exports verified valid

---

## Current Musical State

### Strengths

- Clean chordal comping
- Stable and predictable output
- Idiomatic register range
- No structural MusicXML errors

### Limitations

- Comping is **too grid-aligned**
- Limited rhythmic personality
- Weak interaction with guitar_1
- Melody lacks strong motif identity
- Phrase endings not clearly articulated

---

## Next Development Targets (GCE ≥ 9)

### 1. Motif System

- Introduce motif extraction (bars 1–2)
- Enforce recurrence and variation
- Target similarity score ≥ 0.7

### 2. Phrase Grammar

- 4-bar phrase structure:
  - Idea → continuation → variation → cadence
- Strong cadential resolution required

### 3. Guitar_2 Musical Comping

- Phrase-based comp patterns:
  - Beat-based, anticipatory, sparse, syncopated
- Interaction with guitar_1 density
- Introduce controlled silence (~20%)

### 4. Density Separation

- Reduce bass density when chord comping is active
- Improve perceptual clarity between layers

### 5. Rhythmic Identity

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

## Recommended Workflow

1. Commit stable checkpoints frequently
2. Isolate musical improvements from infrastructure changes
3. Use targeted tests for each musical rule
4. Validate in both:
   - Audio (listening)
   - Notation (Sibelius/MuseScore)

---

## Status

**Roadmap framing:** This version achieves structural correctness; the next iteration introduces musical memory (motif), phrasing grammar, and interaction.

Current state is a **stable musical baseline (~GCE 7.8–8.3)**  
Next phase targets **motivic identity, phrasing, and interaction**

---

## License

Internal / Development Use
