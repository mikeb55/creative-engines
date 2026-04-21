# Song Mode Section Shape Diagnostics (Dev Notes)

## Where It Is Defined

- Core type + contract: `engines/composer-os-v2/core/song-mode/songModeSectionTypes.ts`
  - `SongModeSectionShapingDiagnosticsV1`
  - `SongModeSectionBehaviourDescriptor`
- Aggregation logic: `engines/composer-os-v2/core/song-mode/songModeSectionControl.ts`
  - `registerSongModeSectionBehaviour(...)`
  - `finalizeSongModeSectionShaping(...)`

## Diagnostics Object Structure

`songModeSectionShapingDiagnostics` (V1) includes:

- `version`
- `totalBars`
- `densityDeltaBMinusA`
- `colourDeltaBMinusA`
- `openingVsReturnDelta`
- `returnVariationSummary`
- `returnVariationType`
- `contributingSlices`

Related per-slice descriptors in `songModeSectionBehaviourDescriptors` include:

- `sliceId`
- `densityBiasByRole`
- `registerBiasByRole`
- `harmonicColourBiasByRole`
- `entryReturnGestures`
- `returnVariationType`

## Where It Is Called / Surfaced

- Song Mode manifest reader for eval tooling:
  - `engines/composer-os-v2/scripts/eval/songModeSectionShapingDiagnosticsReader.ts`
- Golden path run manifest wiring:
  - `engines/composer-os-v2/core/goldenPath/runGoldenPath.ts`
- App API wiring (result + manifest):
  - `engines/composer-os-v2/app-api/composerOsAppGeneration.ts`
  - `engines/composer-os-v2/app-api/generateComposition.ts`
  - `engines/composer-os-v2/app-api/writeOutputManifest.ts`

## First UI Slice: Most Useful Fields

- Global shaping deltas:
  - `densityDeltaBMinusA`, `colourDeltaBMinusA`, `openingVsReturnDelta`
- Return treatment:
  - `returnVariationType`, `returnVariationSummary`
- Section/role contribution context:
  - `contributingSlices`
  - role-biased values from `songModeSectionBehaviourDescriptors` (`densityBiasByRole`, `harmonicColourBiasByRole`, `registerBiasByRole`)

## Song Mode Profile / Rules Inspector (Next Slice)

Desktop Song Mode results now also surface `songModeProfileRuleDiagnostics` in:

- `Generate -> latest result card -> Song Mode Profile / Rules (dev)`

This block complements (but does not duplicate) Section Shape:

- **Section Shape (dev diagnostics)** focuses on per-section/per-role outcomes and deltas.
- **Song Mode Profile / Rules (dev)** focuses on *why* those outcomes happened:
  - active style profile and primary/secondary songwriter ids,
  - overlay ids (author/classical),
  - style fingerprint,
  - resolved rule ids,
  - keys-comp profile and Bacharach bundle id when present,
  - active behaviour source ids (slice ids).

## Section Sources / Slates Inspector (Dev)

Song Mode result cards now include:

- `Generate -> latest result card -> Section Sources / Slates (dev)`

This view is a compact per-section source/slate table:

- `Section` — role label (A/Opening, B/Bridge Lift, Return, Outro, Whole)
- `Sources` — contributing slice ids for that section role
- `Slate Tags` — compact shaping tags inferred from active descriptor fields (e.g. `density_bias`, `colour_bias`, `register_bias`, return-variation tag)

How it differs:

- **Section Shape** = measured deltas/bias magnitudes and return diagnostics.
- **Profile / Rules** = global profile/rule configuration that drove the run.
- **Section Sources / Slates** = per-role source attribution and concise shaping tags.

## Real-run verification (manual-style app path)

A fresh Song Mode run generated via app-path execution (`runAppGeneration` / desktop pipeline) now confirms non-empty payloads for all three blocks:

- `songModeSectionShapingDiagnostics`
- `songModeProfileRuleDiagnostics`
- `songModeSectionBehaviourDescriptors`

Manifest readability is also improved with compact summary fields:

- `songModeDiagnosticsSummary.profile`
- `songModeDiagnosticsSummary.rules`
- `songModeDiagnosticsSummary.sectionShape`
- `songModeDiagnosticsSummary.sectionSources`

These summaries are intended for quick eval/batch scans without opening raw nested diagnostics objects.

## In-app compare panel (dev)

The Generate page now includes `Compare recent Song Mode runs (dev)`:

- Stores the most recent Song Mode runs in memory (session-only; no database/history system).
- Lets you pick two runs and view side-by-side compact rows for:
  - summary line,
  - profile/rules,
  - section-shape deltas and return behavior,
  - section sources/slates cues.
- Adds deterministic review hints (e.g. stronger contrast, clearer return, broader source mix) to speed A/B judgement without opening raw manifests.
