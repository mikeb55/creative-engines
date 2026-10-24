# WWH dual-part MusicXML transformation CLI

Portable Composer OS tool: ingest a guitar + upright-bass MusicXML duo, lock motif bars, emit up to three distinct arrangements.

## Profiles

| Profile | Behaviour |
| --- | --- |
| `harmonic` | BHL guitar recolour + rewritten bass counterpoint + radical chord symbols |
| `contrapuntal` | Motif-preserving inversion, register reflection, guitar/bass exchange |
| `rhythmic` | Onset displacement, bass offbeat agency, phrase accents |

Source file is never modified.

## Run

From `creative-engines`:

```bash
npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/wwhDualPartTransformCli.ts \
  --source /path/to/duo.musicxml \
  --out /path/to/out-dir \
  --profiles harmonic,contrapuntal,rhythmic \
  --motif-bars 1,2 \
  --title "Piece Name"
```

Optional: `--expected-sha <hex>`, `--seed`, `--bhl-world`, form windows (`--exchange-bars 9-24`, etc.).

Mirror V2.0 convenience wrapper (still requires explicit paths):

```bash
npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/runMirrorV20DualPartTransform.ts \
  --source /path/to/03-The-Mirror-Duo-Leadsheet-V2.0.musicxml \
  --out /path/to/out-dir
```

## Library

`engines/composer-os-v2/core/duo/wwhDualPartTransform.ts` — `runDualPartTransform`, profile transforms, validation, motif check.

## Tests

```bash
npx jest --config engines/composer-os-v2/jest.config.cjs \
  engines/composer-os-v2/tests/wwhDualPartTransform.test.ts --no-coverage
```

Fixture: `engines/composer-os-v2/resources/test-fixtures/wwh-dual-part/duo-8bar-fixture.musicxml`.
