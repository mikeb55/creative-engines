# Composer OS — Testing (D1 self-test)

## What it is

A **small script** in the Composer OS v2 engine package that generates **four** MusicXML files and prints **three lines** comparing them. It validates **determinism**, **export sanity**, and that **groove vs space** intent produces **different** outputs when surprise is held constant.

## Command

From the **repository root**:

```bash
npm run d1:selftest --prefix engines/composer-os-v2
```

Or from `engines/composer-os-v2`:

```bash
npm run d1:selftest
```

Uses `ts-node` with `--transpile-only` (same as other engine scripts in that package).

## Output folder

Files are written to:

`outputs/d1-selftest/`

(relative to the **repo root** — `creative-engines/outputs/d1-selftest/`).

## Expected files

| File | Meaning |
|------|--------|
| `baseline.musicxml` | Song Mode–style run, **no** `intent` |
| `baseline2.musicxml` | Same settings as baseline (should match baseline byte-for-byte) |
| `groove.musicxml` | High groove, low space, fixed surprise |
| `space.musicxml` | Low groove, high space, same fixed surprise |

## Expected console summary

Three lines, for example:

```text
baseline vs baseline2: SAME
groove vs space: DIFFERENT
exports valid: YES
```

### Meaning

| Line | `SAME` | `DIFFERENT` / `NOT DIFFERENT` | `YES` / `NO` |
|------|--------|-------------------------------|--------------|
| **baseline vs baseline2** | Two no-intent runs match (determinism) | Something non-deterministic or broken | — |
| **groove vs space** | Groove and space runs produce identical XML | They differ (intent mapping effective) | — |
| **exports valid** | — | — | Non-empty MusicXML + strict bar math + all four files written |

## Troubleshooting

- **`exports valid: NO`** — Check that the engine run completed; inspect `errors` in code only if you are debugging (this doc stays minimal).
- **Script fails to compile** — The package uses `--transpile-only`; if TypeScript errors appear, fix or align with `engines/composer-os-v2` test scripts.
- **Wrong working directory** — Always run via `npm run` from the paths above so output lands under `outputs/d1-selftest/`.

For architecture context, see [COMPOSER_OS_ARCHITECTURE.md](./COMPOSER_OS_ARCHITECTURE.md).
