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
