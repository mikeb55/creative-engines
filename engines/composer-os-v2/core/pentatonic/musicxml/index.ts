/**
 * Pentatonic MusicXML boundary.
 * Headless. No filesystem access. No second MusicContext.
 * Implementation sits beside the Dev 2 path types and only adapts a MusicXML string into those events.
 */
export { analyzePentatonicScore, formatPentatonicScoreMap } from '../analyzeScore';
export { PENTATONIC_SCORE_ORDER_POLICY, importPentatonicScoreFromMusicXml } from '../musicXmlScore';
export type { PentatonicScoreAnalysis, PentatonicScoreRegion } from '../analyzeScore';
export type {
  PentatonicHarmonyEvidence,
  PentatonicPitchPolicy,
  PentatonicScoreEvent,
  PentatonicScoreImport,
  PentatonicScorePart,
} from '../musicXmlScore';
