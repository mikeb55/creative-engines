/**
 * Shared LeadSheet model for import + future realization handoff.
 * Intentionally narrow: single-line melody + chord/time/form essentials.
 */

export interface LeadSheetTimeSignature {
  beats: number;
  beatType: number;
}

export interface LeadSheetKeySignature {
  fifths: number;
  mode?: string;
}

export interface LeadSheetSection {
  label: string;
  startBar: number;
}

export interface LeadSheetChordEvent {
  bar: number;
  beat: number;
  symbol: string;
}

/** Imported MusicXML articulations we preserve for the performance shaping pass. */
export type LeadSheetArticulationKind = 'staccato' | 'tenuto' | 'accent' | 'marcato';

export interface LeadSheetMelodyNoteEvent {
  bar: number;
  beat: number;
  durationBeats: number;
  midi: number;
  step: string;
  alter: number;
  octave: number;
  /** MusicXML `<velocity>` or last measure `<dynamics>` before this note (1–127). */
  velocityMidi?: number;
  /** Parsed `<notations><articulations>…` when present. */
  articulationKind?: LeadSheetArticulationKind;
}

export type LeadSheetRepeatMarkerKind = 'repeat_start' | 'repeat_end' | 'ending_start' | 'ending_stop';

export interface LeadSheetRepeatMarker {
  bar: number;
  kind: LeadSheetRepeatMarkerKind;
  endingNumber?: string;
}

export interface LeadSheet {
  sourceFormat: 'musicxml';
  title?: string;
  composer?: string;
  tempoBpm?: number;
  timeSignature?: LeadSheetTimeSignature;
  keySignature?: LeadSheetKeySignature;
  totalBars: number;
  sections: LeadSheetSection[];
  chordEvents: LeadSheetChordEvent[];
  melodyEvents: LeadSheetMelodyNoteEvent[];
  repeatMarkers: LeadSheetRepeatMarker[];
}

export interface LeadSheetImportResult {
  ok: boolean;
  leadSheet?: LeadSheet;
  errors: string[];
  warnings: string[];
}

