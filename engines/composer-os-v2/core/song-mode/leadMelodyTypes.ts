/**
 * Lead melody planning — metadata + sparse note-level plan (not full engraving).
 */

export type MelodyContourKind = 'arch' | 'ascending' | 'descending' | 'wave';

export type MelodyRepetitionTag = 'statement' | 'variation' | 'hook_return';

export interface MelodyNoteEvent {
  measure: number;
  beat: number;
  duration: number;
  midi: number;
}

export interface MelodyPhrasePlanEntry {
  phraseId: string;
  sectionOrder: number;
  sectionKind: string;
  startMeasure: number;
  endMeasure: number;
  cadenceMeasure: number;
  contour: MelodyContourKind;
  repetitionTag: MelodyRepetitionTag;
  phraseLengthBars: number;
}

export type LeadMelodyContourArc = 'rising' | 'falling' | 'balanced';

export interface LeadMelodyPlan {
  phrases: MelodyPhrasePlanEntry[];
  notes: MelodyNoteEvent[];
  contourArc: LeadMelodyContourArc;
  /** Bar where hook material is slated to return (chorus entry). */
  hookReturnMeasure?: number;
  /** Cadence-heavy bars (phrase endings). */
  cadenceMeasures: number[];
}
