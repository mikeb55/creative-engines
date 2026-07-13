/**
 * Jim Hall — golden-path barrel (interval-first guitar / duo shell harmony).
 * Logic: `../song-mode/jimHallSlice.ts`.
 */
export {
  JIM_HALL_SLICE_PARAMETERS,
  precomputeJimHallEffectiveHarmonyBars,
  finalizeJimHallMetadata,
  createJimHallHarmonyAccumulator,
  accumulateJimHallHarmonyDiagnostics,
  isSongwriterJimHall,
  isJimHallHarmonicPath,
  type JimHallMode,
} from '../song-mode/jimHallSlice';
