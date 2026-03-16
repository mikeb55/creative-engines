# Engine Acceptance Specs — Non-Negotiable

Deterministic test targets for Wyble, Contemporary Counterpoint, and Ellington.
Validation must pass before any launcher auto-open is re-enabled.

---

## A. WYBLE ETUDE

- **Output:** MusicXML
- **Output path:** `outputs/wyble/acceptance/wyble_acceptance.musicxml`
- **Measures:** 8 exactly
- **Time signature:** 4/4
- **Voices:** Exactly 2
- **Measure validation:** Every measure in each voice sums exactly to 4 beats
- **No Explorer launch**
- **No folder open**
- **Notation:** Simple and musically plausible
- **Staff:** Single staff if most stable; if two voices on one staff, voice durations must validate exactly

---

## B. CONTEMPORARY COUNTERPOINT

- **Output:** MusicXML
- **Output path:** `outputs/counterpoint/acceptance/counterpoint_acceptance.musicxml`
- **Measures:** 8 exactly
- **Time signature:** 4/4
- **Lines:** Exactly 2 contrapuntal lines
- **Measure validation:** Every measure sums exactly to 4 beats
- **No arbitrary rests** unless intentionally generated
- **No dump-into-one-measure logic**
- **No random forward/backup hacks** without strict validation

---

## C. ELLINGTON ORCHESTRATION

- **Output:** MusicXML
- **Output path:** `outputs/ellington/acceptance/ellington_acceptance.musicxml`
- **Measures:** 8 exactly
- **Time signature:** 4/4
- **Part list:** Correct
- **Instrument names:** Correct
- **Ranges:** All notes inside practical written ranges
- **No absurd octave placement**
- **Voicings:** Static-but-sane at minimum
- **Priority:** Correctness first, sophistication second
