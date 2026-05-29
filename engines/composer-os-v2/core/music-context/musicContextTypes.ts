/**
 * Shared Brain — MusicContext foundation (V90a).
 * Cross-engine snapshot: harmony, motif, modulation, receipts.
 */

import type { ModulationPlan } from '../modulation/modulationPlanTypes';

export interface MusicContextHarmony {
  bars: readonly string[];
  checksum: string;
  source: 'user' | 'locked' | 'generated' | 'martino_convert';
}

export interface MusicContextMotif {
  id: string;
  intervalPattern: number[];
  rhythmPattern: { startBeat: number; duration: number }[];
  contourPattern: number[];
  anchorMidi?: number;
  seedPitches?: number[];
  producer: 'riff' | 'song_mode' | 'martino' | 'user';
}

export interface MusicContextReceipt {
  engine: 'martino' | 'slonimsky' | 'wyble' | 'riff' | string;
  kind: string;
  payload: unknown;
}

export interface MusicContext {
  schemaVersion: '1.0';
  seed: number;
  presetId: string;
  key: { root: string; mode: 'major' | 'minor' };
  meter: { beats: number; beatType: number };
  bpm: number;
  totalBars: number;
  harmony: MusicContextHarmony;
  motif?: MusicContextMotif;
  modulation?: ModulationPlan;
  receipts: readonly MusicContextReceipt[];
  provenance?: {
    sourceEngineId: string;
    capturedAt: number;
    sourceRunId?: string;
  };
}
