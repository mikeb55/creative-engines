/**
 * Composer OS V2 — Songwriting Engine (Phase 1) — request/result contracts only.
 */

export type SongRequest = {
  bars: number;
  chordProgression: string;
  key?: string;
  tempo?: number;
  seed?: number;
  dryRun?: boolean;
  /** Swingometer rhythm pass 0–5; default 2 when omitted. */
  swingLevel?: number;
};

export type SongResult = {
  success: boolean;
  filePath: string;
  bars: number;
  chordBars: string[];
  seed: number;
  timestamp: string;
  errors?: string[];
};
