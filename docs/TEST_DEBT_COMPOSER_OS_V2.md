# Composer OS V2 — full harness test debt

Last updated: 2026-04-20 (stage-exit Big Band gate).

## Snapshot (this machine)

| Metric | Before this pass | After this pass |
|--------|------------------|-----------------|
| `npm --prefix engines/composer-os-v2 run test:full` | **637 passed / 34 failed** | **638 passed / 33 failed** |
| `npm --prefix engines/composer-os-v2 run test:fast` | Green | Green |

Full harness completes without OOM/hang (~18–35s locally).

## What we fixed this pass

1. **Pipeline truth “export” false negatives (`pipelineTruthGates.ts`)**  
   Rehearsal marks are exported as `<rehearsal enclosure="rectangle">`. The verifier used a regex that only matched `<rehearsal>` with no attributes, so bars 1/5 read as missing A/B even when XML was correct. Updated the regex to allow attributes.  
   **Impact:** Restored `runGoldenPath` success for builtin/custom duo where pipeline truth gates apply; removed a large cascade (generation, App API smoke, correctness gates that depended on golden-path success, etc.).

2. **Lead-sheet display vs MusicXML `kind/@text` (`engines/core/chordSymbolMusicXmlCore.ts`)**  
   `parseChordForMusicXmlHarmonyDisplay` used `literalKind: true`, leaving redundant `"major"` in `kind/@text`. Switched display parsing to `literalKind: false` so plain major strips like the formatter.

3. **Export regression test harness (`tests/export.test.ts`)**  
   Plain-major exporter test used `instrumentIdentity: 'guitar'`; harmony is only written for `clean_electric_guitar`. Updated the fixture part identity.

4. **Stale compiled test shadowing (`tests/appApi.test.js`)**  
   A checked-in `appApi.test.js` next to `appApi.test.ts` was resolved ahead of the TypeScript source, so API tests ran outdated expectations (e.g. `registeredPresets` length `6`). **Removed** the stray `.js` file.

5. **Release metadata drift TS vs JS (`app-api/releaseMetadata.js`)**  
   `releaseMetadata.js` was out of date (6 modes, wrong capabilities vs `.ts`). Synced with `releaseMetadata.ts` (7 modes including `wyble_etude`, `musicxml_generation` for Big Band / String Quartet).

6. **Hard-coded diagnostic counts (`tests/appApi.test.ts`, `tests/appShell.test.ts`)**  
   Replaced magic numbers with `COMPOSER_OS_V1_SUPPORTED_MODES.length` and `getPresets().length`.

7. **Mode exposure expectation (`tests/modeExposure.test.ts`)**  
   Assertions still expected `big_band` / `string_quartet` as `planning_only`; metadata now marks them `musicxml_generation`. Updated the test to match `releaseMetadata.ts`.

8. **Harness readability (`tests/runAllTests.ts`)**  
   When failures > 0: print **Failures by suite** (sorted by failure count) and a one-line note that exit 1 in full mode reflects known debt while fast remains the gate.

9. **Stage Exit Gates — Big Band part count (`tests/retro/stageExitGates.test.ts`)**  
   `testBigBandRealisationExportGatePasses` still required `score.parts.length === 4` after the real score model grew to **7** parts (alto/tenor, brass, piano, bass, drums). Aligned the gate with `bigBandRealisation.test.ts` (`=== 7`). Export was already valid; this was **harness expectation drift** only.

## Quarantine

None this pass.

## Highest-priority remaining debt (next triage)

Roughly grouped by recurring failures in `test:full`:

- **Multi-seed duo gates:** Duo polish V3.3, Duo LOCK quality, Duo identity V3.2, interaction V3.1, phrase authority, bass identity, GCE thresholds (LOCK seeds), correctness gates (strict bar math / harmony export assertions).
- **Single-line / Wyble duo:** Guitar–Bass Duo (Single-Line), Wyble voice 2 polyphony, long-form Wyble sparsity.
- **Key inference / XML:** Desktop/API duo custom key — fifths / golden path custom Bb XML (key receipt tests).
- **Chord progression semantics:** builtin vs custom harmony labelling (`harmonyMode builtin ignores chordProgressionText`, mixed slash progression).
- **Pipeline truth custom regression:** `Bm9…G#7alt` progression still fails export/score agreement (narrow investigation vs golden path options).
- **ECM:** Identity / shaping passes (BH-order leaps, Metheny vs Schneider heuristic).
- **Ensemble realisation / App boundary:** String Quartet realisation + export; `apiGenerate` big_band planning JSON path; riff generator bass part; occasional **ECM Chamber** XML substring check (`Emin9` / `Cmaj7`) if harmony varies by seed. (Big Band **Stage Exit** export gate fixed 2026-04-20; direct **Big Band realisation** suite was already green.)

## Maintenance note

Avoid committing stray `tests/**/*.test.js` beside `*.test.ts`; Node may resolve `.js` first and run stale assertions.
