/**
 * Phase 7 - playable MIDI bounds for leadsheet quintet parts (import-layer only).
 */

import { CLEAN_ELECTRIC_GUITAR } from '../instrument-profiles/guitarProfile';
import { SQ_PART_V1, SQ_PART_V2, SQ_PART_VA, SQ_PART_VC } from '../string-quartet/stringQuartetTypes';
import { QUARTET_MIDI_BOUNDS } from '../voicing/voicingProfiles';

const STRING_PART_IDS = new Set<string>([SQ_PART_V1, SQ_PART_V2, SQ_PART_VA, SQ_PART_VC]);

export function isLeadSheetStringPartId(partId: string): boolean {
  return STRING_PART_IDS.has(partId);
}

export function getLeadSheetPartMidiBounds(partId: string): readonly [number, number] {
  if (partId === 'guitar') {
    const [lo, hi] = CLEAN_ELECTRIC_GUITAR.hardRange;
    return [lo, hi] as const;
  }
  const sq = QUARTET_MIDI_BOUNDS[partId];
  if (sq) return sq;
  return [36, 96] as const;
}

export function pitchInPartRange(pitch: number, partId: string): boolean {
  const [lo, hi] = getLeadSheetPartMidiBounds(partId);
  return pitch >= lo && pitch <= hi;
}

export function fitMelodyPitchesToPartRange(pitches: readonly number[], partId: string): number[] {
  if (pitches.length === 0) return [];
  const [lo, hi] = getLeadSheetPartMidiBounds(partId);
  for (const shift of [0, 12, -12, 24, -24, 36, -36]) {
    const shifted = pitches.map((p) => p + shift);
    if (shifted.every((p) => p >= lo && p <= hi)) return shifted;
  }
  return pitches.map((p) => {
    let out = p;
    while (out < lo) out += 12;
    while (out > hi) out -= 12;
    return Math.max(lo, Math.min(hi, out));
  });
}
