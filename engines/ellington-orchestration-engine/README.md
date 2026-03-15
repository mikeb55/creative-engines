# Ellington Orchestration Engine

Converts chord progressions into sectional orchestration plans and voicings for big band.

## Phrase-Span Planning

Orchestration is planned in phrase units (2 or 4 bars) first, then distributed bar-by-bar:

- **phraseSpan** — 2 or 4 bars per phrase
- **phraseRolePlan** — lead, support, phraseType, density target per phrase
- **leadSectionPersistence** / **answerSectionPersistence** — anti-chaos, avoid bar-by-bar switching
- **Form-lite arc** — 8-bar span: bars 1–2 setup, 3–4 response, 5–6 intensification, 7–8 release

## Arrangement Mode Differentiation

- **classic** — Saxes lead full 2–4 bar spans, brass answers in short punctuations, moderate density arc
- **ballad** — Reeds/trombone pads persist longer, fewer section changes, sparse brass, more release bars
- **shout** — Brass persistence, stronger tutti, short setup + intensification, more background figures

## Preset Templates

ii_V_I_major, jazz_blues, rhythm_changes_A, beatrice_A, orbit_A

## Output Location

`apps/ellington-orchestration-desktop/outputs/ellington/`

## Real-World Test

`npm run realworld` — 150+ plans, phrase coherence, role persistence, mode authenticity scoring. Exports top 3 for beatrice_A and orbit_A.

## Self-tests

`npm test` — Full validation.
