# Engraving Rules

**Version 1.0**  
**Universal — applies to all styles, ensembles, projects**

---

## Score Readability Rule (Mandatory)

**All scores must contain:**

- **Chord symbols** — above appropriate staff; reflect actual harmony
- **Boxed rehearsal letters** — at section boundaries
- **Sectional boundaries** — clear structural transitions

---

## Engraving Quality (Mandatory)

**MusicXML must satisfy:**

- Correct measure durations
- Time signatures only when changed (not every bar)
- Chord symbols matching actual harmony
- Readable rhythmic groupings
- Consistent articulations

---

## MusicXML Output Standard

Every generated score must include:

- **Chord symbols** — above appropriate staff; reflect actual harmony
- **Boxed rehearsal letters** — at section boundaries
- **Sectional layout** — clear structural transitions
- **Playable ranges** — idiomatic for each instrument
- **Idiomatic articulation** — appropriate to instrument and style
- **Dynamic shaping** — support structural pacing
- **Structural pacing** — dynamics align with density arc

---

## Validation Checklist

Before export:

- [ ] Chord symbols use `<harmony>`; match actual harmony
- [ ] Rehearsal letters use `<rehearsal>`; boxed
- [ ] Time signature only in measure 1 and at meter changes
- [ ] Measure durations balance correctly
- [ ] No empty or meaningless staves
- [ ] Articulations consistent within parts

---

## Reject Conditions

- Chord symbols contradict actual harmony
- Rehearsal marks missing
- Time signature in every measure
- Measure duration errors
