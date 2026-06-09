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
} from './types';

export {
  buildHarmonyBarsFromSources,
  readHarmonyBarSymbol,
  reinterpretFakeBookSymbol,
  reinterpretHarmonyBars,
} from './reinterpret';

export {
  buildScaleOfChords,
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
  applyChordMelodyToScore,
  applyVoicingEngineToResolved,
  assertMelodyIsTopOfStack,
  buildBaseVoicing,
} from './voicingEngine';
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