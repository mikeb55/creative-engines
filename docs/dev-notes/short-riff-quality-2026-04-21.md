## Short riff quality slice (2026-04-21)

Goal: improve musical quality of 2-4 bar riffs as reusable building blocks.

### Symbolic inspection snapshot (fixed seeds)

Manual seeded inspection across 2-bar and 4-bar outputs (`neutral`, `scofield`, `funk`) showed:
- closure and call/response were active,
- but short-riff style feel was still often generic,
- `neutral` and `scofield` could produce near-identical onset fingerprints for the same seed/grid.

### Chosen direction

**Choice: B) Style feel for Scofield/Funk/Neutral.**

Why this is highest ROI now:
- 2-4 bar units already have structure (identity + closure), but style identity at short length is weaker.
- Stronger style separation gives immediate musical payoff without extending phrase length.

### Success criteria

- For fixed seeds, offbeat attack behavior should separate by style in short riffs:
  - `neutral` <= `scofield` <= `funk` on offbeat attack count.
- Works for both 2-bar and 4-bar generation while preserving existing closure and call/response checks.

### Implementation note

`riffRhythm.ts` now applies a short-riff style rhythm bias:
- `neutral`: slightly straighter profile (more on-beat anchoring),
- `scofield`: moderate offbeat articulation,
- `funk`: strongest offbeat/anticipation bias.

Validation is added in `tests/riffGenerator.test.ts` with seeded symbolic checks for 2-bar and 4-bar outputs.
