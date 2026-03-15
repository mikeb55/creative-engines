# Ellington Orchestration Engine

Converts chord progressions into sectional orchestration plans for big band.

## What it generates

Orchestration **plans**, not full note-level scores. For each bar:

- Lead section (saxes, trumpets, trombones)
- Support section
- Density level (sparse → medium → dense → tutti)
- Brass/reed contrast mode
- Call/response behavior
- Background figure usage
- Tutti placements

## Inputs

- JSON progression: `[{ chord: "Dm7", bars: 2 }, ...]`
- MusicXML: via existing import (same approach as Wyble)

## Sections

- **Saxes:** Alto 1/2, Tenor 1/2, Baritone
- **Trumpets:** 1–4
- **Trombones:** 1–3, Bass
- **Rhythm:** Piano, Guitar, Bass, Drums

## Output

- Bar-by-bar plan with section roles, density map, contrast notes, background usage, tutti placements

## Output location

Desktop app outputs go to `apps/ellington-orchestration-desktop/outputs/ellington/` in timestamped run folders.

## Self-tests

Run `npm test` in this directory. Validates section-role conflict avoidance, density logic, brass/reed contrast, background figure logic, call/response, and orchestration variety. Target average score ≥ 9.0.
