# MusicXML Harmony Export (Composer OS)

## Overview

Composer OS exports jazz chord symbols using a hybrid strategy:

- Semantic encoding via:
  - `<kind>`
  - `<degree>`
- Display support via:
  - Sibelius-compatible chord vocabulary
  - Guitar Pro-friendly extensions

## Key Behaviour

### Guitar Pro 8

- Preserves most extensions and alterations
- May respell chords (e.g. add13, add9)
- Considered primary validation target

### Sibelius

- Rewrites chords to internal vocabulary
- Drops unsupported extensions (e.g. #11, alt)
- This is expected and cannot be overridden

## Supported Chord Types

- maj7, maj9, maj7#11
- 9, 11, 13, 13sus
- m7, m9, m11
- dominant alterations (b9, #9, #11, b13)
- alt (expanded internally)
- 6/9
- slash chords

## Limitations

- Sibelius will simplify:
  - alt chords
  - #11 on major chords
  - multiple alterations
- Exact jazz notation is only guaranteed in:
  - Guitar Pro
  - downstream engines (future)

## Design Decision

We prioritise:

1. Semantic correctness
2. Cross-tool stability
3. Best-effort display fidelity

---

# MusicXML Harmony Export — Status

## Current status

- Extended chord export is now stable
- Guitar Pro 8 is the primary fidelity target for complex jazz chord display
- Sibelius remains notation-safe but may simplify unsupported chord vocabulary

## Chord export behaviour

- Export uses semantic harmony encoding
- Slash chords are preserved
- Complex jazz chords are exported robustly
- Sibelius may rewrite unsupported spellings
- Guitar Pro preserves more detailed jazz chord meaning

## Known Sibelius limitation

Examples of expected simplification:

- maj7#11 may display as maj7
- alt chords may reduce to a simpler altered dominant
- 13sus may display as 13(sus4)

This is expected and is not considered an exporter bug.

## Register update

- Wyble Etude guitar output is now generated one octave lower by default
- This avoids manual transposition in Sibelius
- Bass register is unchanged

## Result

Composer OS is now considered stable for:

- Wyble Etude guitar register
- extended chord export
- slash chord preservation
