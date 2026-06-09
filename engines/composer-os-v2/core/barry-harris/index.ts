/**
 * V82b+c / V82d - Barry Harris chord-melody public surface.
 */

export type {
  BarryHarrisChordMelodyFoundation,
  BarryHarrisChordMelodySummary,
  BarryHarrisIdentityId,
  BarryHarrisSectionSpan,
  ChordMelodyBarAnchor,
  ChordMelodyChoice,
  ChordMelodyEventKind,
  ChordMelodyHarmonyEvent,
  ChordMelodyNoteChoice,
  IdentityAnnotation,
  MelodyNoteForChordMelody,
  PhrasingRole,
  ResolvedChordMelodyNote,
  ScaleOfChords,
  SixthDimPair,
  VoicingHint,
  VoicingVariant,
  BhFamily,
  LadderRung,
  RealizedVoicing,
  LadderTrack,
  HarmonizedEvent,
  LadderSource,
  VoicingShapeType,
} from './types';

export {
  buildHarmonyBarsFromSources,
  readHarmonyBarSymbol,
  reinterpretFakeBookSymbol,
  reinterpretHarmonyBars,
} from './reinterpret';

export {
  buildScaleOfChords,
  buildBhOrderedScale,
  dim7RootPcForSixthRoot,
  harmonyRootPcFromSymbol,
  isMinorTonicHarmonySymbol,
  pitchClassToSharpName,
  sixthDimPair,
  sixthDimPartnerSymbol,
} from './scaleOfChords';

export { resolveBarryHarrisSectionSpans } from './sectionResolver';

export {
  precomputeBarryHarrisChordMelodyFoundation,
  stashBarryHarrisChordMelodyFoundation,
} from './precomputeFoundation';

export { selectChordMelodyNoteChoice, selectChordMelodyNoteChoices } from './selector';
export { resolveBorrowedNoteChoice, classifyBorrowedTonePc } from './borrowed';
export { assignPhrasingRoles } from './phrasingRoles';
export {
  countEligibleStructuralSixths,
  insertPassingDiminishedEvents,
  passingDimReceiptForEvent,
} from './insertPassingDiminishedEvents';
export { scoreMelodyToImportMelody, type ScoreMelodyNote } from './scoreMelodyToImportMelody';
export { buildLadder, familyKey, findRungForMelodyPc, nearestRung } from './ladderBuilder';
export { realizeLadder, realizeRungAtMelody, singleNoteVoicing } from './ladderRealizer';
export {
  applyChordMelodyToScore,
  applyVoicingEngineToResolved,
  assertMelodyIsTopOfStack,
  buildBaseVoicing,
  chordMelodyVoiceLeadingScore,
  dim7ParticipationRate,
  harmonizePhrase,
  isDrop2Voicing,
  isDrop2InnerSpacing,
  ladderRungHitRate,
  maxConsecutiveIdenticalFingerprints,
  harmonySymbolForResolved,
} from './voicingEngine';
export type { VoicingEngineOptions, VoicingSpacingPreference } from './voicingEngine';
export {
  assessGuitarFeasibility,
  GUITAR_MAX_FRET_SPAN,
  GUITAR_OPEN_STRING_MIDIS,
  GUITAR_STRETCH_FRET_SPAN,
  isGuitarVoicingFeasible,
} from './guitarVoicingFeasibility';
export type { GuitarFeasibilityResult } from './guitarVoicingFeasibility';
export { assessBhVoicingFeasibility, isBhStackFeasible } from './bhVoicingFeasibility';
export type { BhVoicingFeasibilityResult } from './bhVoicingFeasibility';
export {
  assessBigBandFeasibility,
  assessBigBandFeasibilityFromVoices,
  BB_ALTO1_MAX,
  BB_ALTO1_MIN,
  BB_ALTO2_MAX,
  BB_ALTO2_MIN,
  BB_BARI_MAX,
  BB_BARI_MIN,
  BB_BARI_THICK_TEXTURE_MAX,
  BB_PREFERRED_SPAN_MAX,
  BB_PREFERRED_SPAN_MIN,
  BB_TENOR1_MAX,
  BB_TENOR1_MIN,
  BB_TENOR2_MAX,
  BB_TENOR2_MIN,
} from './assessBigBandFeasibility';
export type { BigBandFeasibilityResult } from './assessBigBandFeasibility';
export {
  applyBigBandDistribution,
  assessBbStackFeasibility,
  distributePassingDimBbVoices,
  expandToFiveVoiceSaxSoli,
  spreadBbDimVoicingBelowMelody,
} from './bigBandSaxSoliVoicing';
export type { BbVoiceMidis } from './bigBandSaxSoliVoicing';
export {
  assessStringQuartetFeasibility,
  assessStringQuartetFeasibilityFromVoices,
  SQ_CELLO_MAX,
  SQ_CELLO_MIN,
  SQ_CELLO_THICK_TEXTURE_MAX,
  SQ_PREFERRED_SPAN,
  SQ_VIOLA_MAX,
  SQ_VIOLA_MIN,
  SQ_VIOLIN1_MAX,
  SQ_VIOLIN1_MIN,
  SQ_VIOLIN2_MAX,
  SQ_VIOLIN2_MIN,
} from './assessStringQuartetFeasibility';
export type { StringQuartetFeasibilityResult } from './assessStringQuartetFeasibility';
export {
  applyStringQuartetDistribution,
  distributePassingDimSqVoices,
  distributeStackToSqVoices,
  spreadSqDimVoicingBelowMelody,
} from './stringQuartetVoicing';
export type { SqVoiceMidis } from './stringQuartetVoicing';
export {
  applyIdentitiesToNoteChoice,
  applyIdentitiesToNoteChoices,
  chordTonePcsForResolved,
  droppedTonePcForResolved,
} from './identities';
export {
  applyBarryHarrisBlockVoicingsToScore,
  blockMidisForResolved,
  closeBlockVoicingBelowMelody,
  drop2VoicingBelowMelody,
  ensembleVoicingHint,
} from './blockVoicings';
export {
  BARRY_HARRIS_EVAL_CHORDS_16,
  BARRY_HARRIS_EVAL_MELODY_16,
  buildBarryHarrisChordMelodyReceipts,
  harmonyBarsFromNoteChoices,
  harmonyBarsFromResolvedNotes,
  melodyNotesFromImport,
  resolveBarryHarrisNoteChoices,
  runBarryHarrisChordMelodyEvalCore,
  resolveChordMelodyMelodyNotes,
  runBarryHarrisChordMelodyPipeline,
  summarizeBarryHarrisNoteChoices,
} from './chordMelodyPipeline';
export type {
  BarryHarrisChordMelodyEvalReport,
  BarryHarrisChordMelodyPipelineOptions,
} from './chordMelodyPipeline';