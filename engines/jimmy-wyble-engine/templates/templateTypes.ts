/**
 * Wyble Practice Template — Type definitions
 */

export interface ProgressionSegment {
  chord: string;
  bars: number;
}

export interface PracticeTemplate {
  id: string;
  name: string;
  description?: string;
  progression: ProgressionSegment[];
}
