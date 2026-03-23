# Guitar-Bass Duo Engine (LOCK Refinement System v1.0)

## Core Function

A LOCK-driven refinement pipeline that converts existing compositions into recording-ready guitar-bass duos (GCE ≥ 9.5).

---

## System Definition

### 1. LOCK as a Production Constraint

- DCR enforced
- 5–7 internal design passes
- 1 commit only
- 1 refinement pass only
- no speculative regeneration
- no uncontrolled versioning

### 2. Bass = Co-Composer (Hard Requirement)

Must include:

- guide-tone targeting (3rd / 7th priority)
- target → approach → resolve
- motivic cell development
- rhythmic independence
- phrase contour

**Hard Gate:** Bass Harmonic Integrity Gate

### 3. Duo Interaction Model

Required behaviours:

- call-response
- overlap / interruption
- echo / variation
- density contrast

**Rule:** If interaction is not audible, it does not exist.

### 4. Identity Moment (9.5 Trigger)

Each piece must contain 1–2 high-impact gestures.

Examples:

- register break
- rhythmic displacement
- harmonic colour pivot
- silence-based tension

**Rule:** Without identity, cap at about 9.0.

### 5. Surgical Refinement Model

Targeted passes only:

- Bass Rewrite Pass
- Interaction Pass
- Rhythmic Feel / Micro Swing Pass
- Identity Moment Pass

### 6. Texture Discipline

**Guitar:**

- melody carrier
- sparse harmonic implication only

**Bass:**

- active melodic partner
- not root support

**Rule:** If both parts are dense, fail.

### 7. Lead Sheet Output Standard

Must include:

- Guitar + Acoustic Bass only
- clean chord symbols
- rehearsal marks
- clear form
- Sibelius-safe MusicXML

---

## Pipeline

1. Import source (melody locked)
2. Duo reduction (LOCK applied)
3. Initial validation (≥ 9.0 required)
4. Bass Integrity Pass
5. Interaction Pass
6. Micro Swing / Rhythm Pass
7. Identity Moment Pass
8. Final validation → export

---

## Quality Thresholds

- Initial commit ≥ 9.0
- Post refinement ≥ 9.3
- Final ≥ 9.5

---

## Non-Negotiable Rules

- melody is immutable
- no reharmonisation unless required for legality
- bass must imply harmony every bar
- interaction must be perceptible
- no version creep (max V3)
- stop when ≥ 9.5

---

## One-Line Definition

A LOCK-based refinement engine that elevates existing material into high-level guitar-bass duos by enforcing bass as a co-composer, interaction as a system, and surgical refinement to reach GCE ≥ 9.5.

---

## Local Naming Convention

| Asset type | Format |
|------------|--------|
| Prompt files | `prompt-[song]-[purpose]-vN.md` |
| MusicXML files | `Vn - Song Name.musicxml` |
| Reports | `report.md` |
| Max version | V3 |
