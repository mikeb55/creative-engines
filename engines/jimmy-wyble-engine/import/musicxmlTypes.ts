/**
 * MusicXML Import — Type definitions for V1
 */

export interface ChordProgressionSegment {
  chord: string;
  bars: number;
}

export type ChordProgression = ChordProgressionSegment[];

export interface MusicXMLParseResult {
  success: true;
  progression: ChordProgression;
  totalBars: number;
  timeSignature: { beats: number; beatType: number };
}

export interface MusicXMLParseError {
  success: false;
  error: string;
  code: 'NO_CHORD_SYMBOLS' | 'UNSUPPORTED_METER' | 'INVALID_XML' | 'REPEAT_DETECTED' | 'CODA_DETECTED' | 'UNSUPPORTED_STRUCTURE';
}

export type MusicXMLParseOutput = MusicXMLParseResult | MusicXMLParseError;
