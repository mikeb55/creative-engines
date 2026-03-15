# WYBLE ENGINE GUITAR CONSTRAINTS IMPROVED

## Heuristics reused from repositories

No reusable source files were found in the searched repositories:
- `creative-engines/engines/shared/`
- `creative-engines/engines/monk-barry-engine/`
- `creative-engines/engines/andrew-hill-engine/`
- `gml-harmonic-engine`
- `generative-chamber-composer`
- `gml-workspace`

Guitar constraints were implemented from first principles based on guitar counterpoint idiom:

- **Voice distance:** Preferred 10–17 semitones between voices; discourage >18
- **String-set behaviour:** Prefer dyads on adjacent or one-string-apart strings (via register tightening)
- **Position window:** Narrowed register ranges (upper 64–76, lower 48–60) to keep ~5–7 fret span
- **Dyad types:** Prefer 3rds, 6ths, 10ths; avoid awkward compound intervals via `PREFERRED_DYAD_INTERVALS`
- **Revision pass:** `refinementPass()` adjusts notes after generation to fix violations while preserving melodic motion

## Test results (80 studies)

| Metric | Value |
|--------|-------|
| **Average score** | 9.01 |
| **Best score** | 9.30 |
| **Worst score** | 8.40 |

## Remaining violations

| Violation type | Count |
|----------------|-------|
| Parallel violations | 0 |
| Playability violations (interval > 24) | 0 |
| Large interval violations (> 18 semitones) | 0 |
| String jump violations (> 2 strings) | 0 |
| Register violations | 0 |

**All violations eliminated.** The guitar constraints and refinement pass successfully enforce idiomatic playability.

## Files modified

- `wybleGenerator.ts` — Added constraints, `pickLowerForDyad()`, `refinementPass()`
- `wybleAutoTest.ts` — Added large-interval and string-jump violation tracking
