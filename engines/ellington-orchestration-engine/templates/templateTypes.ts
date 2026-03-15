/**
 * Ellington Template Library — Type definitions
 */

export interface ChordSegment {
  chord: string;
  bars: number;
}

export interface ProgressionTemplate {
  id: string;
  name: string;
  description?: string;
  segments: ChordSegment[];
}
