# WWH V7.2 portability report

V7.2 is a timing and portability repair of the V7.1 checkpoint. It is not a new musical engine.
Curated Black Aura V7.0 and V7.1 stay behind `--edition 7.0` and `--edition 7.1`.
V7.2 does not choose musical material from the composition title.

## What changed

- Generated durations are fractions of a quarter, scaled to the source divisions.
- Metre, key, clef, transpose, divisions, and tempo are restated when a generated bar follows a copied bar that differs.
- A dotted-quarter metronome mark stays on the dotted quarter. Sound tempo is quarter notes per minute.
- A chord tone with the same type and dots as its attack is written with the attack duration. The Mirror bar 39 stores 512 on two dotted-half chord tones; the copies write 768. The original file is not edited.
- When every typed note implies one divisions value, generated copies use that value. Meet Me at Hobo's states divisions 1 and stores eighths as duration 1; the copies write divisions 2. Durations, types, and dotted-quarter 108 / sound 162 stay. The original file is not edited.
- Development is not inserted after an unresolved tie, a repeat, or an ending.
- Performance and study files are labelled EXPERIMENTAL TECHNICAL SKETCHES.
- Missing album files are INCOMPLETE.

## Results

Compositions with all four outputs PASS: 9
- 01-Black-Aura-Duo-Leadsheet-V1.1.musicxml
- 09-After-Everything-Duo-Leadsheet-V1.0.musicxml
- 02-Palace-Gates-Duo-Leadsheet-V1.1.musicxml
- 07-Impossible-Metaphysics-Duo-Leadsheet-V1.1.musicxml
- 03-The-Mirror-Duo-Leadsheet-V1.0.musicxml
- 04-Meet-Me-at-Hobos-Duo-Leadsheet-V1.0.musicxml
- 05-Orbit-Duo-Leadsheet-V2.1.musicxml
- 06-Wrong-Turning-Duo-Leadsheet-V1.2.musicxml
- 08-Small-Testimony-Duo-Leadsheet-V1.0.musicxml

## Reproduce

```bash
npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/wwhPerformanceV72Timing.test.ts
npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/wwhPerformanceComposerV7.test.ts
npm run wwh:performance-v7 -- --batch --album-dir "/Users/user/Documents/DEVS/ECM-Album-Nov-2027" --output-dir "/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V7.2" --seed 7
```

Portable timing tests do not read the album. The album command reads the nine leadsheets and writes only under the V7.2 directory.
