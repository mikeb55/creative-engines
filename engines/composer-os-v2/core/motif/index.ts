/**
 * Motif subsystem — authority layer, pools, and Song Mode helpers.
 */

export type {
  ThemeGenome,
  MotifCell2,
  SectionRecallContract,
  MotifCell2HarmonicMask,
  MotifCell2TransformBudget,
} from './themeGenome';

export type { MotifSimilarityScore } from './motifSimilarityScorer';
export { scoreMotifSimilarity, meetsRecallThreshold } from './motifSimilarityScorer';

export { buildThemeGenome } from './themeGenomeBuilder';

export type {
  SectionRecallEntry,
  SectionMap,
  MotifAuthorityLayerResult,
} from './sectionRecallEnforcer';
export {
  enforceRecallContract,
  applyMotifAuthorityLayerToLeadMelody,
  buildSectionRecallMap,
  leadMelodyPlanToPartModel,
  mergePartPitchIntoLeadPlan,
  motifCell2FromPartRange,
} from './sectionRecallEnforcer';

export type {
  MotifAuthorityLevel,
  MotifDevelopmentSummary,
  MotifFingerprint,
  MotifAuthorityScoreBreakdown,
  MotifAuthorityPlan,
  MotifPhraseRange,
} from './motifAuthorityV1';
export {
  computeMotifAuthorityScore,
  defaultMotifAuthorityPlan,
  nudgeReturnPhraseTowardFingerprint,
} from './motifAuthorityV1';
