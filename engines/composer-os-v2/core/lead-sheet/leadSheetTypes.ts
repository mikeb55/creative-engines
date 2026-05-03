/**
 * Shared LeadSheet model for import + future realization handoff.
 * Intentionally narrow: single-line melody + chord/time/form essentials.
 */

import type { ImportedHarmonyTimeline } from './importedHarmonyTimeline';

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
  /** Original 1-based measure index in source MusicXML when repeat unrolling ran (debug). */
  sourceMeasure?: number;
}

/** Imported MusicXML articulations we preserve for the performance shaping pass. */
export type LeadSheetArticulationKind = 'staccato' | 'tenuto' | 'accent' | 'marcato';

export interface LeadSheetMelodyNoteEvent {
  bar: number;
  beat: number;
  /** Original 1-based measure index in source MusicXML when repeat unrolling ran (debug). */
  sourceMeasure?: number;
  durationBeats: number;
  midi: number;
  step: string;
  alter: number;
  octave: number;
  /** MusicXML `<velocity>` or last measure `<dynamics>` before this note (1–127). */
  velocityMidi?: number;
  /** Parsed `<notations><articulations>…` when present. */
  articulationKind?: LeadSheetArticulationKind;
  /** Parsed tie continuity from `<tie>` / `<notations><tied>`. */
  tieStart?: boolean;
  tieStop?: boolean;
  /** Parsed `<slur type="start|stop">` markers when present. */
  slurStart?: boolean;
  slurStop?: boolean;
  /** Parsed `<fermata/>` from note notations. */
  fermata?: boolean;
}

export type LeadSheetDynamicSpanKind = 'crescendo' | 'decrescendo';

export interface LeadSheetDynamicSpan {
  kind: LeadSheetDynamicSpanKind;
  startBar: number;
  startBeat: number;
  endBar: number;
  endBeat: number;
}

export type LeadSheetTempoDirectionKind = 'ritardando' | 'accelerando' | 'tempo_mark';

export interface LeadSheetTempoDirectionEvent {
  kind: LeadSheetTempoDirectionKind;
  bar: number;
  beat: number;
  /** Absolute BPM when provided by MusicXML `<sound tempo>` or metronome marking. */
  bpm?: number;
}

export type LeadSheetRepeatMarkerKind = 'repeat_start' | 'repeat_end' | 'ending_start' | 'ending_stop';

export interface LeadSheetRepeatMarker {
  bar: number;
  kind: LeadSheetRepeatMarkerKind;
  endingNumber?: string;
  /** Original 1-based measure index in source MusicXML when repeat unrolling ran (debug). */
  sourceMeasure?: number;
}

export interface LeadSheet {
  sourceFormat: 'musicxml';
  title?: string;
  composer?: string;
  tempoBpm?: number;
  timeSignature?: LeadSheetTimeSignature;
  keySignature?: LeadSheetKeySignature;
  /** Every `<key>` change in score order (first entry matches `keySignature` when present). */
  keyChanges?: Array<{ bar: number; fifths: number; mode?: string }>;
  totalBars: number;
  sections: LeadSheetSection[];
  chordEvents: LeadSheetChordEvent[];
  melodyEvents: LeadSheetMelodyNoteEvent[];
  repeatMarkers: LeadSheetRepeatMarker[];
  dynamicSpans?: LeadSheetDynamicSpan[];
  tempoDirections?: LeadSheetTempoDirectionEvent[];
  /** Stage 1 storage-only import data; not used by harmony generation yet. */
  importedHarmonyTimeline?: ImportedHarmonyTimeline;
}

export interface LeadSheetImportResult {
  ok: boolean;
  leadSheet?: LeadSheet;
  errors: string[];
  warnings: string[];
}

