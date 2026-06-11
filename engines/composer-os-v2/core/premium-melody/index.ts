/**
 * Shared premium-melody engine - rhythm + expression enrichment.
 */

export type { PremiumMelodyProfile } from './premiumMelodyProfile';

export { mulberry32, deriveMelodyRhythmSeed } from './premiumMelodyPrng';

export {
  BEATS_PER_BAR,
  type PremiumMelodyCellFamily,
  type PremiumMelodyCellTemplate,
  type PremiumMelodyRhythmEnrichmentMeta,
  familyWeightForPhase,
  pickWeightedTemplate,
  selectRhythmCellForNote,
  interiorOnsetFromCellLibrary,
} from './premiumMelodyCellLibrary';

export { resolvePremiumMelodyOnsetCollisionsSmart } from './premiumMelodyCollision';

export {
  detectPhraseRoles,
  indexInPhrase,
  phraseLengthAt,
  isStructuralLandingIndex,
  isOffbeatOnset,
  isPremiumMelodyStrongBeat,
  structuralLandingOnset,
  type PremiumMelodyPhraseRoles,
} from './premiumMelodyPhrase';

export {
  onsetClassDominance,
  melodyIoiEntropy,
  durationTrigramDiversity,
  phraseDensityArcPresent,
  melodySyncopationScore,
  melodyOffbeatRatio,
  melodyStructuralLandingCount,
  distinctMelodyIoiBuckets,
} from './premiumMelodyMetrics';

export {
  enrichMelodyRhythm,
  assertPreservePitchSequence,
  PreservePitchSequenceError,
} from './enrichMelodyRhythm';

export {
  enrichMelodyExpression,
  assertPreserveMelodyTimingGrid,
  distinctArticulationTypes,
  phraseVelocitySpread,
  PreserveMelodyTimingGridError,
  type PremiumMelodyDurationAccentKind,
  type PremiumMelodyExpressiveNote,
  type PremiumMelodyExpressionEnrichmentMeta,
} from './enrichMelodyExpression';

export {
  pinPremiumMelodyExport,
  type PinPremiumMelodyExportOptions,
} from './premiumMelodyPin';

