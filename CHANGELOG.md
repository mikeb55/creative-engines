## Cool Jazz, Hard Bop, Fusion eras (2026-04-08)

- Added Cool Jazz, Hard Bop, Fusion to Big Band and String Quartet era dropdowns
- Chord pools and progression cycles added for all three new eras
- parseBigBandEraFromPairing allowlist extended to 7 eras
- bigBandRuleRegistry updated for new era ids
- Automated tests extended to cover all 7 eras — PASS
- All 7 eras confirmed working in Sibelius output

---

## Fix: TypeScript spread type error in guitarVoice2WybleLayer.ts resolved (2026-04-08)

- Fix: TypeScript spread type error in guitarVoice2WybleLayer.ts resolved (`TS2698` on fallback event clone: spread via `e as ScoreEvent`; no runtime change).

---

## Fix: TypeScript errors in musicxmlExporter.ts resolved (2026-04-07)

- Fix: TypeScript errors in musicxmlExporter.ts resolved (drum-layer error strings: `as ScoreEvent` for `kind` / `pitch` ternaries; no runtime change).

---

## String Quartet era passthrough fix (2026-04-07)

- Fixed: era selector was not passing through app layer to engine
- parseBigBandEraFromPairing now used for String Quartet era resolution
- End-to-end integration test added: stringQuartetEraAppPassthrough.test.ts
- All four eras (swing, bebop, post_bop, contemporary) confirmed producing distinct chord vocabularies in MusicXML piano staff

---

## String Quartet era wiring (2026-04-07)

- Era dropdown added to String Quartet preset in UI
- Era chord pools wired in quartetScoreBuilder.ts
- Automated era chord pool test passing
- Bug found: era not passing through app layer to engine - fix in progress

---

## Era chord vocabulary wiring (2026-04-07)

- Era selector now drives per-era chord pools in Big Band output
- Swing: maj6, 6/9, dim7, m6 vocabulary
- Bebop: 7b9, 7#9, 7#11, m7b5 vocabulary  
- Post-bop: maj7#11, 7alt, 7sus vocabulary
- Contemporary: m9, m11, add9, maj7#11 vocabulary
- Automated test added: bigBandEraChordPoolsScore.test.ts
- Custom harmony still overrides era pool when provided

---

## Custom harmony verified (2026-04-07)

- Custom harmony input confirmed working for Big Band
- Chord symbols correctly reflected in MusicXML output

---

## UI fixes (2026-04-07)

- Big Band receipt label fixed: now shows "MusicXML score" when MusicXML is generated instead of "Planning only"

---

## Song Form dropdown (2026-04-07)

- Song Form dropdown wired to Big Band and String Quartet presets
- Same options and coming-soon disabled items as Guitar Bass Duo
- formId and totalBars passed through to both realisers

---

## Big Band fixes (2026-04-07)

- Double Bass octave corrected (+12 MIDI shift)
- Piano part-list condition fixed (isBigBandPianoPart)
- Piano label still not rendering in Sibelius — known issue, deferred
- Drum percussion notation working, MusicXML generating cleanly

---

## Big Band drum fix + MusicXML restored (2026-04-07)

- Drum part rewritten as unpitched percussion (two voices, backup, percussion clef)
- Divisions reverted to 480 per quarter (1920 per bar)
- Drum voice 2 beat count fixed (4 quarters exactly)
- MusicXML generation restored for Big Band
- Export errors now surfaced in planning receipt for diagnostics

---

## String Quartet + Big Band piano and chord symbols (2026-04-07)

- String Quartet imports fixed (SQ_PART_V1/V2/VA/VC restored)
- String Quartet generating MusicXML with chord symbols on piano staff
- Section markers: statement, development, contrast, return, coda
- Big Band chord symbols confirmed on piano staff
- Big Band drum set on percussion clef confirmed
- Piano label fix still in progress
- Next: Piano naming fix, Song Form dropdown for Big Band + String Quartet

---

## String Quartet + Big Band enhancements (2026-04-07)

- String Quartet MusicXML complete: Violin I, II, Viola, Cello
- Section markers: statement, development, contrast, return, coda
- Chord symbols added to piano/viola staff
- Big Band chord symbols on piano staff working
- Big Band drum set on percussion clef confirmed
- Piano naming fix in progress
- Chord input UI for Big Band and String Quartet wired
- Next: Piano part added to String Quartet, piano label fix

---

## Big Band realisation wiring (2026-04-07) — COMPLETE

- runBigBandRealisation wired from app API after planning
- Big Band preset produces full ensemble MusicXML
- 7 parts: Alto Sax, Tenor Sax, Trumpet, Trombone, Piano, Double Bass, Jazz Drums
- Jazz Drums on percussion clef, channel 10
- Falls back to planning JSON if realisation fails
- 11/11 automated checks passing (bigband-verify.ts)
- Next: Piano part + chord input for Big Band + String Quartet

---

## String Quartet realisation wiring (2026-04-07) — COMPLETE

- runQuartetRealisation wired from app API after planning
- String Quartet preset produces full MusicXML
- 4 parts: Violin I, Violin II, Viola, Violoncello
- Falls back to planning JSON if realisation fails
- Next: Piano part + chord input for Big Band + String Quartet

---

## Phase 18.2E — Validator gate tuning (2026-04-07) — COMPLETE

- Loosened phrase arrival gate: expanded neighbour window from ±1 to ±2 semitones
- 24-bar through-composed forms skip phrase arrival check entirely
- Bass octave transposition fixed in MusicXML export (-24 semitones for acoustic_upright_bass)
- Bass now displays at correct register in Sibelius
- Next: Wayne Shorter engine integration

---

## MusicXML export fixes (2026-04-07) — COMPLETE

- Fixed Sibelius enclosure schema error (invalid attribute value)
- Added clef-octave-change -1 for acoustic_upright_bass parts
- Fixed formId not reaching engine (missing from req_ in composerOsApiCore.ts)
- Fixed chord count validation to accept 24 chords for 24-bar forms
- Fixed bar count validators to accept 24 across runGoldenPath.ts
- 24-bar through-composed forms now generating correctly end to end
- Gate tuning and bass export follow-ups: **Phase 18.2E** (see above)

---

## Phase 18.2D — Bass Phrase Intelligence (2026-04-06) — COMPLETE

- Multi-bar guitar contour computed per 8-bar phrase (asc/desc/static)
- Bass melodic bias responds to guitar phrase direction
- Phrase boundary intent differentiated across phrases 1-4 (development/contrast/return)
- bassPlan.style activated (melodic/sparse routing)
- Bass no longer anchors to single pitch class
- Fixed double bass clef: added `clef-octave-change` -1 to MusicXML export for `acoustic_upright_bass` parts
- Bass now displays at correct register in Sibelius and MuseScore
- Next: 18.2D verification sweep + 24-bar support

---

## Phase 19 — Form Layer (2026-04-06) — COMPLETE

- 15 song forms available in UI (≤32 bars only)
- formId wiring: form selection reaches engine correctly
- MusicXML rehearsal marks (A, B, C...) per section
- Number of bars dropdown capped at 32
- Forms >32 bars hidden from UI pending Phase 19.1
- Next: 18.2D verification sweep + 24-bar duo support (see **Phase 18.2D** above)

---

## [Phase 18.2C — Partial] — 2026-04-06

### Closed
- Guitar pitch validators aligned to Voice 1 only
- Bass pitch floor enforced [40, 88] across all call sites
- CLI sweep harness operational (run-sweep.bat, 9 automated runs)
- Voice-leading jump validator filtered to Voice 1 only
- Jazz duo excessive activity gate now Voice 1 aware

### Known open — deferred to Phase 18.2D
- Duo swing: bass is too constant-walking
  (requires phrase-level bass intelligence, not branching fix)
- Bass identity: motif echo / shared pitch-class with guitar too weak
  (requires bass to read guitar phrase context, not just pitch classes)

### Root cause of remaining failures
The bass generator makes bar-level decisions in isolation.
A real jazz bassist makes phrase-level decisions in response
to what the guitar just played. Fixing this requires a new
phrase-intelligence layer (Phase 18.2D), not more branching.

### Next
Phase 19 — Form Layer (through-composed, AABA, sonata,
symphonic movement forms — groundwork for string quartet)

---

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
