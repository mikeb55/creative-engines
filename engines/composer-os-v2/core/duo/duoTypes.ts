/**
 * Duo export-truth types (V100a).
 */

export type DuoVoice = 'upper' | 'lower';

export interface DuoExportTruth {
  /** Normalised chord symbols (guitar / upper voice). */
  upperBars: string[];
  /** Normalised chord symbols (bass / lower voice). */
  lowerBars: string[];
  /** Checksum over normalised upper + lower bars (export LOCK). */
  checksum: string;
  capturedAt: number;
}
