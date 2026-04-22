# LeadSheet -> Song Mode (Donald Fagen only) experimental Phase 1

Date: 2026-04-22

## Scope

This slice intentionally supports one path only:

- `presetId === "song_mode"`
- `primarySongwriterStyle === "donald_fagen"`
- optional input `songModeLeadSheetMusicXml`

No other Song Mode writer, preset, or ensemble route is included in this phase.

## Implemented

1. Request + Song Mode plumbing

- Added `songModeLeadSheetMusicXml?: string` to `GenerateRequest`.
- Added `leadSheet?: LeadSheet` to `SongModeRunInput` for bounded input threading.

2. LeadSheet adapter for Song Mode

- Added `core/song-mode/songModeLeadSheetAdapter.ts`.
- Deterministic transforms:
  - LeadSheet chord events -> per-bar locked chord bars
  - LeadSheet melody events -> compact bar-level melody anchors
- Safety behavior:
  - no-crash parse failures
  - warnings for truncation/carry-forward cases
  - fallback to baseline Song Mode when unsupported/invalid

3. Donald Fagen route integration

- In `runSongStructure()`, when the exact route and XML input are present:
  - parse/import LeadSheet via existing importer
  - apply LeadSheet-derived locked harmony as the primary harmonic input
  - pass compact melody anchors into Song Mode golden-path options
- Melody guidance is intentionally bounded to a deterministic melody-start anchor application.

4. Inspectability

- Added run-manifest booleans for this route:
  - `songModeLeadSheetInputApplied`
  - `songModeLeadSheetAnchorStartApplied`

5. Tests

- Added `tests/songModeLeadSheetInput.test.ts` with deterministic checks:
  - Donald Fagen + LeadSheet input applies locked harmony
  - Donald Fagen + LeadSheet input applies melody-anchor guidance
  - Donald Fagen without LeadSheet remains baseline
  - non-target writer ignores this LeadSheet slice

## Explicitly deferred

- Big Band realization from LeadSheet
- ECM integration from LeadSheet
- Other Song Mode writer integrations
- Universal LeadSheet input rollout

## Notes

- This phase does not alter Motif Phase 1 gating/logic.
- No architecture rewrite; changes stay in existing Song Mode and golden-path insertion points.

