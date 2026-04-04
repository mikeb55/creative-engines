## V9.x – Phase 18.2B Polyphony Stabilization

### Added

- Dual-voice guitar polyphony (Voice 1 + Voice 2)
- Voice-2 continuity across phrases
- Internal motion within sustained inner-voice spans

### Fixed

- Sibelius MusicXML import error (element scope issue)
- note ordering and serialization consistency

### Improved

- Guide-tone targeting (3rd/7th priority)
- Overlap behaviour between voices
- Phrase-level sustain instead of fragmented Voice 2

### Notes

- Voice 2 is now structurally stable and musically present
- Further work will focus on phrase intention and directional shaping

---

## [V9.x] - Phase 18.2 milestone (Guitar Polyphony)

### Summary
- Guitar Voice 2 continuity model added (phrase-level behaviour).
- ENTER / CONTINUE / RESOLVE state behaviour introduced for the inner voice.
- Sustained overlap improved; dual-voice perceptual clarity improved.
- Export layer unchanged and locked.
- Remaining work is musical refinement (target-driven phrase continuity / direction), not export stability.

---

## [V9.x] - Phase 18.2B.3 Voice-2 Continuity Layer

### Added
- Phrase-level continuity model for Guitar Voice 2 (ENTER → CONTINUE → RESOLVE)
- Multi-bar persistence logic (2–4 bar continuity windows)
- State-based Voice-2 behaviour (no longer purely local decisions)

### Improved
- Sustained overlap between voices
- Perceptual clarity of inner contrapuntal line
- Reduction of isolated Voice-2 events

### Fixed
- Voice-2 fragmentation across bars
- Over-localised decision making in polyphony layer

### Notes
- Export layer remains unchanged and locked
- No MusicXML or serialization modifications in this phase
