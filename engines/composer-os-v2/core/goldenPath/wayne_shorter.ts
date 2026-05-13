/**
 * Wayne Shorter — golden-path barrel (chromatic mediant / chord-scale networks).
 * Logic: `../song-mode/wayneShorterSlice.ts` · legacy `wayneShorterSlice.ts`.
 */
export {
  SHORTER_SLICE_PARAMETERS,
  precomputeWayneShorterEffectiveHarmonyBars,
  finalizeWayneShorterMetadata,
  createWayneShorterHarmonyAccumulator,
  accumulateWayneShorterHarmonyDiagnostics,
  isSongwriterWayneShorter,
  applyWayneShorterHarmonicGrammarReceipts,
  applyWayneShorterMelodicGrammarReceipts,
  applyWayneShorterRhythmGrammarReceipts,
  applyWayneShorterFormGrammarReceipts,
  applyWayneShorterFingerprintReceipts,
  WAYNE_SHORTER_WS_HARM_FINGERPRINTS,
  WAYNE_SHORTER_WS_MEL_FINGERPRINTS,
  WAYNE_SHORTER_WS_RHYTHM_FINGERPRINTS,
  WAYNE_SHORTER_WS_FORM_FINGERPRINTS,
  WAYNE_SHORTER_WS_FP_FINGERPRINTS,
  type ShorterPhase,
} from '../song-mode/wayneShorterSlice';
