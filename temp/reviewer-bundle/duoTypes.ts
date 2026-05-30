/**
 * Duo export-truth types (V100a) + LOCK types (V100b).
 */

/** Normalised per-voice harmony timeline at LOCK time. */
export interface DuoVoice {
  bars: string[];
}

export type DuoVoiceRole = 'upper' | 'lower';

export interface DuoLock {
  upper: DuoVoice;
  lower: DuoVoice;
  lockedAt: number;
  checksum: string;
}

export interface DuoExportTruth {
  /** Normalised chord symbols (guitar / upper voice). */
  upperBars: string[];
  /** Normalised chord symbols (bass / lower voice). */
  lowerBars: string[];
  /** Checksum over normalised upper + lower bars (export LOCK). */
  checksum: string;
  capturedAt: number;
}
