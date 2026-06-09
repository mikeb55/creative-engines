/**
 * V82b+c - Barry Harris scale-of-chords from section tonic.
 */

import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { dim7ChordTones, sixthChordTones } from './chordTones';
import type { ScaleOfChords, SixthDimPair } from './types';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

/** dim7 root = 6th-chord root - 1 semitone. */
export function dim7RootPcForSixthRoot(sixthRootPc: number): number {
  return ((sixthRootPc - 1) + 12) % 12;
}

export function sixthDimPair(sixthRootPc: number, sixthQuality: '6' | 'm6'): SixthDimPair {
  return {
    sixthRootPc: ((sixthRootPc % 12) + 12) % 12,
    sixthQuality,
    dim7RootPc: dim7RootPcForSixthRoot(sixthRootPc),
  };
}

const MAJOR_SIXTH_OFFSETS: readonly number[] = [0, 2, 4, 5, 7, 9, 11];
const MAJOR_SIXTH_QUALITIES: readonly ('6' | 'm6')[] = ['6', 'm6', 'm6', '6', '6', 'm6', 'm6'];
const MINOR_SIXTH_OFFSETS: readonly number[] = [0, 2, 3, 5, 7, 8, 10];
const MINOR_SIXTH_QUALITIES: readonly ('6' | 'm6')[] = ['m6', 'm6', '6', 'm6', '6', 'm6', 'm6'];

export function isMinorTonicHarmonySymbol(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1].length);
  if (/^m6\b|^m(?!aj)/.test(rest)) return true;
  if (/\bm7\b|min7|min9|m9\b|m11|m13|ø|dim/.test(hp)) return true;
  if (/\bminor\b/.test(hp)) return true;
  return false;
}

function buildPairsFromOffsets(
  sectionTonicPc: number,
  offsets: readonly number[],
  qualities: readonly ('6' | 'm6')[]
): SixthDimPair[] {
  const tonic = ((sectionTonicPc % 12) + 12) % 12;
  return offsets.map((offset, i) => sixthDimPair((tonic + offset) % 12, qualities[i] ?? '6'));
}

export function buildScaleOfChords(sectionTonicPc: number, minorKey = false): ScaleOfChords {
  const tonic = ((sectionTonicPc % 12) + 12) % 12;
  const pairs = minorKey
    ? buildPairsFromOffsets(tonic, MINOR_SIXTH_OFFSETS, MINOR_SIXTH_QUALITIES)
    : buildPairsFromOffsets(tonic, MAJOR_SIXTH_OFFSETS, MAJOR_SIXTH_QUALITIES);
  return { sectionTonicPc: tonic, pairs };
}

/** Eight-note BH scale (union of 6th + partner dim7) ordered from sixth root ascending. */
export function buildBhOrderedScale(pair: SixthDimPair): number[] {
  const sixth = sixthChordTones(pair.sixthRootPc, pair.sixthQuality);
  const dim = dim7ChordTones(pair.dim7RootPc);
  const union = [...new Set([...sixth, ...dim])];
  const root = ((pair.sixthRootPc % 12) + 12) % 12;
  return union.sort((a, b) => ((a - root + 12) % 12) - ((b - root + 12) % 12));
}

export function pitchClassToSharpName(pc: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
  return names[((pc % 12) + 12) % 12]!;
}

export function harmonyRootPcFromSymbol(symbol: string): number | undefined {
  const h = parseChordSymbol(symbol).harmonyPart;
  const m = h.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

export function sixthDimPartnerSymbol(sixthRootPc: number, sixthQuality: '6' | 'm6'): {
  sixthSymbol: string;
  dim7Symbol: string;
} {
  const pair = sixthDimPair(sixthRootPc, sixthQuality);
  const rootName = pitchClassToSharpName(pair.sixthRootPc);
  const dimName = pitchClassToSharpName(pair.dim7RootPc);
  return {
    sixthSymbol: sixthQuality === 'm6' ? `${rootName}m6` : `${rootName}6`,
    dim7Symbol: `${dimName}dim7`,
  };
}

/** Musician-facing scale-of-chords strip: `C6 ↔ Bdim7 | F6 ↔ Edim7 | …`. */
export function formatScaleOfChordsPairsLine(scale: ScaleOfChords): string {
  return scale.pairs
    .map((pair) => {
      const { sixthSymbol, dim7Symbol } = sixthDimPartnerSymbol(pair.sixthRootPc, pair.sixthQuality);
      return `${sixthSymbol} ↔ ${dim7Symbol}`;
    })
    .join(' | ');
}