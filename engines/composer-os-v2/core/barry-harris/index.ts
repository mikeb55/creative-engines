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
  runBarryHarrisChordMelodyPipeline,
  summarizeBarryHarrisNoteChoices,
} from './chordMelodyPipeline';
export type { BarryHarrisChordMelodyEvalReport } from './chordMelodyPipeline';