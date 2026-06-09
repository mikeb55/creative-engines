/**
 * V82b+c / V82d / V82e / V80j - Barry Harris chord-melody types.
 */

import type { BarRange } from '../section-architecture/sectionArchitectureTypes';
import type { MosaicModeSectionPlanEntry } from '../mosaic-mode/precomputeMosaicEffectiveHarmonyBars';

export type { BarRange, MosaicModeSectionPlanEntry };

export type SixthDimPair = {
  sixthRootPc: number;
  sixthQuality: '6' | 'm6';
  dim7RootPc: number;
};

export type ScaleOfChords = {
  sectionTonicPc: number;
  pairs: SixthDimPair[];
};

export type ChordMelodyBarAnchor = {
  bar: number;
  sectionLabel: string;
  fakeBookSymbol: string;
  anchor: SixthDimPair;
  scalePairIndex?: number;
  melodyPitchClasses?: number[];
};

/** Precompute bar anchor alias (V82b+c). */
export type ChordMelodyChoice = ChordMelodyBarAnchor;

export type ChordMelodyChoiceBase = {
  bar: number;
  onsetBeat: number;
  sectionLabel: string;
  fakeBookSymbol: string;
  anchor: SixthDimPair;
  scalePairIndex: number;
  melodyPc: number;
};

export type ChordMelodyNoteChoice =
  | (ChordMelodyChoiceBase & { kind: 'sixth'; chordSymbol: string; droppedTonePc: number })
  | (ChordMelodyChoiceBase & { kind: 'dim7'; chordSymbol: string; droppedTonePc: number })
  | (ChordMelodyChoiceBase & {
      kind: 'borrowed';
      activeSymbol: string;
      partnerSymbol: string;
      borrowedFrom: 'sixth' | 'dim7';
      borrowedTonePc: number;
    });

export type BarryHarrisIdentityId =
  | 'm6_on_flat2_dom7alt'
  | 'six_on_five_maj9'
  | 'm6_m7b5'
  | 'dim7_dom7_enharmonic';

export type IdentityAnnotation = {
  id: BarryHarrisIdentityId;
  label: string;
  equivalentSymbol: string;
};

export type VoicingHint =
  | 'guitar-sixth-block-close'
  | 'guitar-dim7-block-close'
  | 'guitar-borrowed-sixth-block'
  | 'bb-sax-soli-drop2'
  | 'bb-dim7-passing'
  | 'sq-drop2-block';

export type PhrasingRole = 'full' | 'dyad' | 'single';

export type VoicingVariant = 'sixth-block' | 'borrowed-replacement' | 'dyad' | 'single';

export type ResolvedChordMelodyNote = ChordMelodyNoteChoice & {
  exportSymbol: string;
  identityAnnotations: IdentityAnnotation[];
  voicingHint: VoicingHint;
  phrasingRole: PhrasingRole;
  voicingVariant: VoicingVariant;
  exportStackMidis: number[];
  innerVoicingMidis: number[];
  borrowedReplacementPc?: number;
  voicingFingerprint: string;
  voiceLeadingCost?: number | null;
  guitarFretSpan?: number | null;
  guitarFeasible?: boolean | null;
  blockVoicingMidis?: number[];
};

export type BarryHarrisSectionSpan = {
  sectionLabel: string;
  startBar: number;
  endBar: number;
};

export type BarryHarrisChordMelodyFoundation = {
  sectionSpans: BarryHarrisSectionSpan[];
  scalesBySection: Record<string, ScaleOfChords>;
  choices: ChordMelodyBarAnchor[];
};

export type BarryHarrisChordMelodySummary = {
  noteCount: number;
  sixthCount: number;
  dim7Count: number;
  borrowedCount: number;
  borrowedDensity: number;
  identityAnnotationCount?: number;
  /** V82f — per-note bh:cm:* observability receipts from chord-melody pipeline. */
  cmReceipts?: string[];
};

export type MelodyNoteForChordMelody = {
  bar: number;
  onsetBeat: number;
  melodyPc: number;
  durationBeats?: number;
};

export type MelodyNoteWithDuration = {
  bar: number;
  onsetBeat: number;
  durationBeats: number;
  melodyPc: number;
  midiPitch: number;
};
