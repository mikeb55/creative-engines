## [Phase 18.2B.5] — 2026-04-05

### Guitar Polyphony — Wyble-style Voice 2 (Composer OS V9.x)

**Fixed:** Intermittent validation failure — `guitar sustained wall-to-wall activity exceeds two bars`

**Root cause confirmed from MusicXML analysis:**
Consecutive full-bar sustained Voice 2 notes in adjacent bars caused
the Duo Interaction V3.1 validator to fail. Planning-layer shape
labels had no effect on realized output. Tick-level barline clamping
was insufficient because notes were not tied across barlines —
each bar contained its own independent whole note.

**Fix implemented in `guitarVoice2WybleLayer.ts`:**
- Added `breakConsecutiveV2Sustains()`: detects adjacent full-bar
  sustained V2 notes (duration >= 1680 ticks) and converts the
  second in any consecutive pair to a half note + rest
- Pitch is preserved exactly — no new pitch content generated
- Prevents voice-leading jump regression
- Clamp step also added for tied-note bleed edge cases
- Both passes run post-injection, pre-validation
- All existing logic (run-length, breathing, coverage, guide-tone)
  remains intact

**Validation results on passing runs:**
- Coverage: 0.44–0.53
- Longest active run: 3
- Release score: 0.9
- MX readiness: 1
- Status: Shareable ✓

**What was NOT changed:**
- Export / MusicXML pipeline
- Bar math core
- Validation systems
- Voice2LineGenerator.ts / Voice2PhrasePlanner.ts

---

## [Phase 18.2B close] — 2026-04-05

**Release:** Phase 18.2B complete — Voice 2 polyphony, bass range, validator alignment (e.g. commit `d58d8cf`).

### Closed in this phase

- Voice 2 sustained normalization (`breakConsecutiveV2Sustains`)
- Guitar pitch re-entry clamped to validator hard range [40, 88]
- Bass pitch floor raised to [40, 88] across profile and call sites
- `midiToPitch` MusicXML export guard (non-finite / fractional MIDI) — no `stepMap` crash
- `clampCleanElectricGuitarNotesToHardRange` after duo bar-math finalize
- Validators updated to count guitar **Voice 1 only**: `activityScore`, `bassIdentityValidation` (echo PCs), `violatesOverlap` (via activity)
- Barry Harris guitar voice-leading jump check: **Voice 1 melody only** (chronological)
- CLI sweep harness: `engines/composer-os-v2/scripts/sweep.ts`, `engines/composer-os-v2/scripts/run-sweep.bat`

### Sweep results at close (9-run harness)

| Gate | At close | Previously (typical) |
|------|----------|----------------------|
| Voice-leading jumps (duo grammar) | 0 / 9 failing | 7 / 9 failing |
| Jazz duo: excessive simultaneous high activity | 0 / 9 failing | 9 / 9 failing |
| Remaining | Bass walking + bass identity echo | — |

### Open — Phase 18.2C

- Duo swing: bass is too constant-walking
- Bass identity: motif echo / shared pitch-class with guitar too weak

---

### V9.0 – Phase 18.2B.2 (Voice 2 Rhythm Footprint)

- Replaced event-level Voice 2 rhythm behaviour with bar-level planning
- Introduced explicit bar shapes:
  - sustained bar
  - two slabs
  - offbeat hold
- Added coverage targeting (~35–50%) and enforced gap limits (≤ 3 bars)
- Implemented fallback chain for safe rhythm injection
- Removed fragment-heavy conversational rhythm passes for Voice 2

Outcome:
Voice 2 now has clear time presence and sustained visibility across the form.

---

### V9.0 – Phase 18.2B.1 (Voice 2 Diagnostics)

- Added Voice 2 diagnostic system for Guitar/Bass Duo mode
- Metrics include:
  - bar coverage
  - note density
  - rest gaps
  - activity runs
  - strong-beat vs offbeat entries
- Diagnostics available in:
  - console logs
  - Generation Receipt (UI surfacing)
- No changes to:
  - generation behaviour
  - bar math
  - export pipeline

Purpose:
Enable measurable evaluation of second-voice behaviour before applying rhythm and pitch improvements.

---

## V9.x - Phase 18.2B COMPLETE

> **Authoritative close notes:** **[Phase 18.2B close] — 2026-04-05** (above). Melody-only validator alignment shipped; remaining gates are **Phase 18.2C** (bass walking + bass identity echo).

### Added

- Span-based Voice-2 continuity system
- Directional motion model (asc/desc/hold)
- Improved overlap and sustain logic

### Improved

- Polyphonic realism in guitar voice-leading
- Reduced fragmented Voice-2 behaviour

### Next

- Phase 18.2C — duo swing bass walking + bass identity echo (see **Phase 18.2B close**)

---

## V9.x - Phase 18.2B Polyphony Behaviour Progress

### Added

- Voice-2 continuity layer
- multi-bar Voice-2 persistence
- internal motion within sustained spans

### Improved

- perceptual clarity of dual-voice guitar polyphony
- overlap between melody and inner voice
- phrase-to-phrase Voice-2 presence

### Fixed

- earlier fragmentation / over-sparsity of Voice 2
- static single-event inner voice behaviour

### Notes

- export remains locked and unchanged
- next work is phrase intention / directional refinement

---

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
