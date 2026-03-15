# Jimmy Wyble Engine — Runtime Prototype

Two-line contrapuntal guitar material generator. Implements the design specification from **gml-composer-engines**.

## What the Wyble Runtime Does

Generates two independent melodic lines (upper and lower) with implied harmony. Output is suitable for solo guitar etudes in the spirit of Jimmy Wyble's two-line improvisation method. The pipeline:

1. **Motif or harmonic seed** — Establishes context from chord progression or motif
2. **Register partition** — Upper voice E4–C6, lower E2–B3
3. **Counterpoint motion** — Voice independence, contrary/oblique preference
4. **Dyad density** — Alternates line → dyad → line → dyad
5. **Parallel avoidance** — Avoids parallel fifths and octaves
6. **Implied harmony** — Infers chord profile from dyadic events

## Inputs

- **harmonicContext** — Chord progression (e.g. Dm7, G7, Cmaj7)
- **phraseLength** — Bars (default 8)
- **motifSeed** — Optional [upperPitch, lowerPitch] in MIDI
- **independenceBias**, **contraryMotionBias**, **dyadDensity**, etc.

## Outputs

- **upper_line** — VoiceLine (events, register)
- **lower_line** — VoiceLine (events, register)
- **implied_harmony** — Array of { chord, bar, beat, confidence }

## Example Usage

`runWybleExample.ts` generates a sample two-line contrapuntal guitar study from a simple ii–V–I progression (Dm7 → G7 → Cmaj7). Run with `npx ts-node runWybleExample.ts` (or equivalent). Output includes upper line, lower line, and implied harmony.

## Automatic Testing

`wybleAutoTest.ts` stress-tests the engine by generating many studies (~80 across four harmonic contexts) and validating musical constraints. It checks voice independence, parallel interval avoidance, register partition, dyad density balance, and playability. Each study receives a score 0–10; the report shows average, best, worst, and failure counts. Run with `npm run test` from the engine directory.

## Guitar Idiom Testing

`wybleGuitarTest.ts` measures idiomatic guitar behaviour to establish a baseline before modifying the generator. This test enables measurable improvements when adding guitar-specific constraints. It evaluates:

1. **Vertical span** — Interval between upper and lower notes: 10–17 semitones = ideal, 18–21 = warning, >21 = violation
2. **Position window** — Flags phrases exceeding 7 fret span per voice
3. **Dyad interval types** — Reports distribution of 3rds, 6ths, and 10ths (preferred in guitar counterpoint)
4. **String-set behaviour** — Flags dyads requiring unrealistic string jumps (>2 strings apart)

Each study receives a `GuitarIdiomScore` (0–10). Run with `npm run test:guitar` from the engine directory.

## Connection to Design Repo

Design spec: **gml-composer-engines** → `engines/guitar/jimmy_wyble_engine/`

This runtime implements the generation pipeline and parameters defined there. Primitives (voice_independence, contrary_motion, register_partition, etc.) are encoded in the generator logic.
