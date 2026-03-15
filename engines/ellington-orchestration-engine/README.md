# Ellington Orchestration Engine

Converts chord progressions into sectional orchestration plans and voicings for big band.

## Preset Templates

- ii_V_I_major, jazz_blues, rhythm_changes_A, beatrice_A, orbit_A

See `templates/templateLibrary.ts` and `templates/README.md`.

## Arrangement Modes

- **classic** — Saxes often lead, brass answers, moderate density
- **ballad** — Reeds/pads favored, sparse brass, lower density
- **shout** — Brass-forward, stronger tutti, higher density

## Output Location

`apps/ellington-orchestration-desktop/outputs/ellington/`

Timestamped run folders with ranked exports (top 3), run_summary.md.

## Real-World Test

`npx ts-node ellingtonRealWorldTest.ts`

Generates 120+ plans across 5 templates × 3 modes. Evaluates section-role clarity, density contour, brass/reed contrast, background support, orchestration variety, mode differentiation, plausibility. Exports top 3 for beatrice_A and orbit_A.

## Self-tests

`npm test` — Full validation (engine load, generation, MusicXML, desktop integration).
