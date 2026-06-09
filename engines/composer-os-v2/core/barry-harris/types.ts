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

export type ChordMelodyEventKind = 'structural' | 'passing_dim';

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
  /** V80k-fix — whether voicing stack uses 6th or partner dim7 chord tones. */
  voicingChordColour?: 'sixth' | 'dim7';
  ladderRungIndex?: number | null;
  ladderHit?: boolean;
  /** V81b+c — structural vs weak-beat passing dim row. */
  eventKind?: ChordMelodyEventKind;
  harmonyOnly?: boolean;
  syntheticMelodyMidi?: number;
  /** V81d — per-part MIDI when preset is string_quartet. violin1 null = sustain only (passing_dim). */
  sqVoiceMidis?: {
    violin1: number | null;
    violin1SustainMidi?: number;
    violin2: number;
    viola: number;
    cello: number;
  };
  sqFeasibilityWarnings?: string[];
  /** V81f — per-part MIDI when preset is big_band. alto1 null = sustain only (passing_dim). */
  bbVoiceMidis?: {
    alto1: number | null;
    alto1SustainMidi?: number;
    alto2: number;
    tenor1: number;
    tenor2: number;
    bari: number;
  };
  bbFeasibilityWarnings?: string[];
  /** V81d — export duration for passing_dim inner voices (beats). */
  exportDurationBeats?: number;
  /** V81f — bari sax duration on passing_dim (beats). */
  exportBariDurationBeats?: number;
  /** V81e — family-change entry exceeded 7st inner leap (warn receipt). */
  familyChangeLeapWarn?: boolean;
};

/** Post-phrasing harmony timeline row (V81b+c). */
export type ChordMelodyHarmonyEvent = ResolvedChordMelodyNote & {
  eventKind: ChordMelodyEventKind;
  harmonyOnly?: boolean;
  syntheticMelodyMidi?: number;
};

export type BhFamily = SixthDimPair;

export type LadderSource = '6' | 'dim';

export type LadderRung = {
  index: number;
  melodyPc: number;
  source: LadderSource;
  abstractClose: number[];
  family: BhFamily;
};

export type VoicingShapeType = 'close' | 'drop2' | 'shell' | 'dyad' | 'single';

export type RealizedVoicing = {
  rungIndex: number;
  source: LadderSource;
  shapeType: VoicingShapeType;
  pitches: number[];
  innerVoicingMidis: number[];
  voicingFingerprint: string;
  guitarFeasible: boolean;
  guitarFretSpan: number;
  laneSignature: string;
};

export type LadderTrack = {
  familyKey: string;
  rungIndex: number;
  realizationIndex: number;
  laneSignature: string;
};

export type HarmonizedEvent = {
  resolved: ResolvedChordMelodyNote;
  melodyMidi: number;
  ladderHit: boolean;
  rungIndex: number | null;
  source: LadderSource | 'borrowed' | 'approach' | 'single';
  track: LadderTrack | null;
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
  /** V80L — mean inner-voice step (semitones) across voiced events. */
  avgVoiceLeadingStep?: number;
  /** V80L — share of events with guitar-feasible voicings (0–1). */
  guitarFeasiblePct?: number;
  /** V80L — widest fret span among guitar-feasible stacks. */
  maxGuitarFretSpan?: number;
  /** V80L — formatted scale-of-chords pair lines per section label. */
  scaleOfChordsBySection?: Record<string, string>;
  /** V81b+c — weak-beat passing dim events inserted. */
  passingDimCount?: number;
  /** V81b+c — passingDimCount / eligible structural sixth count. */
  passingDimDensity?: number;
  structuralSixthCount?: number;
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
