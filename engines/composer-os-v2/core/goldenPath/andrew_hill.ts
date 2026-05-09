/**
 * Andrew Hill — golden-path barrel (hybrid cluster voicings / pitch fields).
 * Logic: `../song-mode/andrewHillSlice.ts` · legacy `andrewHillSlice.ts`.
 */
export {
  HILL_SLICE_PARAMETERS,
  precomputeAndrewHillEffectiveHarmonyBars,
  finalizeAndrewHillMetadata,
  createAndrewHillHarmonyAccumulator,
  accumulateAndrewHillHarmonyDiagnostics,
  isSongwriterAndrewHill,
  type HillMode,
} from '../song-mode/andrewHillSlice';
