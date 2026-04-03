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
