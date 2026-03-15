/**
 * Big Band Score Skeleton — Type definitions for MusicXML export
 */

export interface StaffDefinition {
  id: string;
  partId: string;
  instrumentName: string;
  group: 'saxes' | 'trumpets' | 'trombones' | 'rhythm';
}

export interface RehearsalMark {
  bar: number;
  label: string;
}

export interface SectionLabel {
  bar: number;
  text: string;
}

export interface CueAnnotation {
  bar: number;
  staffGroup?: string;
  text: string;
}

export interface PhraseSpan {
  startBar: number;
  endBar: number;
  label?: string;
}

export interface ChordSymbol {
  bar: number;
  chord: string;
}

export interface ScoreSkeletonData {
  totalBars: number;
  timeSignature: { beats: number; beatType: number };
  keySignature?: string;
  rehearsalMarks: RehearsalMark[];
  sectionLabels: SectionLabel[];
  cueAnnotations: CueAnnotation[];
  phraseSpans: PhraseSpan[];
  chordSymbols: ChordSymbol[];
}
