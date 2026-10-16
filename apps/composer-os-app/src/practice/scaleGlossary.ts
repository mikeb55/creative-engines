/**
 * Computed pitch-class identity for the Scale Explorer.
 * Ian Ring's identifier is the existing mask (bit n = pitch class n).
 * Zeitler and Tonal.js number the same bits in reverse. Those integers are never stored as Ian Ring ids.
 * Names in named-scales.json come from Tonal.js (MIT). Ian Ring, Zeitler, and Pecot catalogues are not imported.
 */

import { canonicalPitchSet, mod12 } from '@composer-os/core/pentatonic/pitch';
import {
  intervalVector,
  invertPitchClassSet,
  normalForm,
  primeForm,
  transposePitchClassSet,
} from '@composer-os/core/hexatonic/setClass';
import forteTable from './data/forte-table.json';
import namedScales from './data/named-scales.json';

export const IAN_RING_SCALE_URL = 'https://ianring.com/musictheory/scales/';
export const ZEITLER_MAX_STEP = 4;

export type GlossaryNameKind = 'traditional' | 'theoretical' | 'systematic-coined' | 'composer-os';
export type GlossaryLicenceBasis = 'MIT' | 'BSD-3' | 'fact-with-citation' | 'permission-granted' | 'internal';

export interface ComputedForteClass {
  /** Forte number. Z is included when the class has a Z-relation. */
  number: string;
  z: boolean;
  inversion: 'A' | 'B' | null;
}

export interface IanRingReference {
  id: number;
  url: string;
}

export interface PitchClassSetMath {
  stepPattern: readonly number[] | null;
  intervalVector: readonly number[];
  modeMasks: readonly number[];
  tnClassMask: number;
  primeMaskRahn: number;
  primeMaskForte: number;
  computedForte: ComputedForteClass;
  zeitlerMaxStep4: boolean;
  ianRing: IanRingReference | null;
  /** Root-as-most-significant-bit integer used by Zeitler and by Tonal.js chroma. Not an Ian Ring id. */
  rootMsbNumber: number;
}

export interface GlossaryNameRecord {
  mask: number;
  intervals: readonly string[];
  pitchClasses: readonly number[];
  primaryName: string;
  aliases: readonly string[];
  kind: GlossaryNameKind;
  tradition: string | null;
  sourceId: string;
  sourceUrl: string;
  retrievedOn: string;
  licenceBasis: GlossaryLicenceBasis;
  corroboratedBy: readonly string[];
  conflicts: string | null;
}

interface ForteTableClass {
  prime: number[];
  number: string;
  z: boolean;
  music21TnI: string;
}

const FORTE_BY_PRIME = new Map<string, ForteTableClass>(
  (forteTable.classes as ForteTableClass[]).map((row) => [row.prime.join(','), row])
);

const GLOSSARY_RECORDS = namedScales.records as GlossaryNameRecord[];
const GLOSSARY_BY_MASK = new Map<number, GlossaryNameRecord[]>();
for (const record of GLOSSARY_RECORDS) {
  const group = GLOSSARY_BY_MASK.get(record.mask) ?? [];
  group.push(record);
  GLOSSARY_BY_MASK.set(record.mask, group);
}

export function glossaryNameRecords(): readonly GlossaryNameRecord[] {
  return GLOSSARY_RECORDS;
}

export function glossaryNamesForMask(mask: number): readonly GlossaryNameRecord[] {
  return GLOSSARY_BY_MASK.get(mask) ?? [];
}

export function normaliseScaleName(value: string): string {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

export function maskFromPitchClasses(pitchClasses: readonly number[]): number {
  let mask = 0;
  for (const pitchClass of canonicalPitchSet(pitchClasses)) mask |= 1 << pitchClass;
  return mask;
}

export function pitchClassesOfMask(mask: number): number[] {
  const pitchClasses: number[] = [];
  for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
    if ((mask & (1 << pitchClass)) !== 0) pitchClasses.push(pitchClass);
  }
  return pitchClasses;
}

/** Reverse the 12 pitch-class bits. Converts a Zeitler/Tonal integer into this mask, and the reverse. */
export function reversePitchClassBits(mask: number): number {
  let reversed = 0;
  for (let bit = 0; bit < 12; bit += 1) {
    if ((mask & (1 << bit)) !== 0) reversed |= 1 << (11 - bit);
  }
  return reversed;
}

export function transposeMask(mask: number, semitones: number): number {
  return maskFromPitchClasses(transposePitchClassSet(pitchClassesOfMask(mask), semitones));
}

export function stepPattern(pitchClasses: readonly number[]): number[] | null {
  if (pitchClasses.length === 0 || pitchClasses[0] !== 0) return null;
  const steps: number[] = [];
  for (let index = 0; index < pitchClasses.length; index += 1) {
    const current = pitchClasses[index]!;
    const next = pitchClasses[(index + 1) % pitchClasses.length]!;
    let step = mod12(next - current);
    if (step === 0) step = 12;
    steps.push(step);
  }
  return steps;
}

function sameForm(left: readonly number[], right: readonly number[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function forteInversion(pitchClasses: readonly number[]): 'A' | 'B' | null {
  const direct = normalForm(pitchClasses);
  const inverted = normalForm(invertPitchClassSet(pitchClasses));
  if (sameForm(direct, inverted)) return null;
  return sameForm(direct, primeForm(pitchClasses)) ? 'A' : 'B';
}

function modeMasks(pitchClasses: readonly number[]): number[] {
  if (pitchClasses.length === 0 || pitchClasses[0] !== 0) return [];
  return pitchClasses.map((pitchClass) => transposeMask(maskFromPitchClasses(pitchClasses), -pitchClass));
}

export function computePitchClassSetMath(mask: number): PitchClassSetMath {
  const pitchClasses = pitchClassesOfMask(mask);
  const steps = stepPattern(pitchClasses);
  const tonicFixed = (mask & 1) === 1;
  const prime = primeForm(pitchClasses);
  const table = FORTE_BY_PRIME.get(prime.join(','));
  if (!table) throw new Error(`missing Forte class for prime ${prime.join(' ')}`);
  let tnClassMask = mask;
  let primeMaskRahn = mask;
  const invertedMask = maskFromPitchClasses(invertPitchClassSet(pitchClasses));
  for (let semitones = 0; semitones < 12; semitones += 1) {
    tnClassMask = Math.min(tnClassMask, transposeMask(mask, semitones));
    primeMaskRahn = Math.min(primeMaskRahn, transposeMask(mask, semitones), transposeMask(invertedMask, semitones));
  }
  return {
    stepPattern: steps,
    intervalVector: intervalVector(pitchClasses),
    modeMasks: modeMasks(pitchClasses),
    tnClassMask,
    primeMaskRahn,
    primeMaskForte: maskFromPitchClasses(prime),
    computedForte: {
      number: table.number,
      z: table.z,
      inversion: forteInversion(pitchClasses),
    },
    zeitlerMaxStep4: Boolean(tonicFixed && steps && steps.every((step) => step <= ZEITLER_MAX_STEP)),
    ianRing: tonicFixed ? { id: mask, url: `${IAN_RING_SCALE_URL}${mask}` } : null,
    rootMsbNumber: reversePitchClassBits(mask),
  };
}

export type ScaleSearch =
  | { kind: 'text'; needle: string }
  | { kind: 'mask'; mask: number; convention: 'ian-ring' | 'zeitler' | 'hex' }
  | { kind: 'exact'; body: string }
  | { kind: 'none' };

function parseHexMask(body: string): number | null {
  const text = body.trim().toLowerCase();
  const hex = text.startsWith('0x') ? text.slice(2) : text;
  if (!/^[0-9a-f]+$/.test(hex)) return null;
  const mask = Number.parseInt(hex, 16);
  if (!Number.isInteger(mask) || mask < 0 || mask > 4095) return null;
  return mask;
}

function parseDecimalMask(body: string): number | null {
  if (!/^\d+$/.test(body.trim())) return null;
  const mask = Number(body.trim());
  if (mask < 0 || mask > 4095) return null;
  return mask;
}

/** Prefixes select one numbering convention. A bare integer remains the Ian Ring mask. */
export function parseScaleSearch(query: string): ScaleSearch {
  const trimmed = query.trim();
  if (!trimmed) return { kind: 'text', needle: '' };
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('ir:')) {
    const mask = parseDecimalMask(trimmed.slice(3));
    return mask === null ? { kind: 'none' } : { kind: 'mask', mask, convention: 'ian-ring' };
  }
  if (lower.startsWith('zeitler:')) {
    const zeitler = parseDecimalMask(trimmed.slice(8));
    return zeitler === null
      ? { kind: 'none' }
      : { kind: 'mask', mask: reversePitchClassBits(zeitler), convention: 'zeitler' };
  }
  if (lower.startsWith('hex:')) {
    const mask = parseHexMask(trimmed.slice(4));
    return mask === null ? { kind: 'none' } : { kind: 'mask', mask, convention: 'hex' };
  }
  if (trimmed.startsWith('=')) return { kind: 'exact', body: trimmed.slice(1).trim() };
  return { kind: 'text', needle: normaliseScaleName(trimmed) };
}

export function glossaryNameMatches(mask: number, needle: string): boolean {
  if (!needle) return false;
  const names = glossaryNamesForMask(mask);
  return names.some((record) => {
    const labels = [record.primaryName, ...record.aliases];
    return labels.some((label) => normaliseScaleName(label).includes(needle));
  });
}

export function assertGlossaryLicence(): void {
  for (const record of GLOSSARY_RECORDS) {
    if ((record.mask & 1) !== 1) throw new Error(`glossary name is not tonic-fixed: ${record.primaryName}`);
    if (!record.sourceUrl || !record.retrievedOn) throw new Error(`glossary name lacks a source: ${record.primaryName}`);
    if (record.kind === 'systematic-coined' && record.licenceBasis !== 'permission-granted') {
      throw new Error(`coined name lacks permission: ${record.primaryName}`);
    }
    if (record.licenceBasis !== 'MIT') throw new Error(`unexpected glossary licence: ${record.primaryName}`);
  }
}
