/**
 * Stable Piano V1.1 filenames. Different requests do not share a file.
 */

import { createHash } from 'node:crypto';

export const PIANO_V11_OUTPUT_FOLDER = 'Solo Piano V1.1';
export const PIANO_V11_ALGORITHM = 'piano-v1.1-b';

export function pianoV11Fingerprint(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16);
}

export function pianoV11FileBase(input: {
  seed: number;
  tempo: number;
  bars: number;
  tonalCentre: string;
  payload: unknown;
}): string {
  return `piano-v11b-s${input.seed}-q${input.tempo}-b${input.bars}-${input.tonalCentre}-${pianoV11Fingerprint(input.payload)}`;
}
