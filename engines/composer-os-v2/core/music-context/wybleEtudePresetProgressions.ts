/**
 * Resolve chord bars for Wyble etude presets (V95).
 * Templates are defined from tonic; transposed by preset.key (PitchClass).
 */

import type { PitchClass } from '../harmony/pitchFieldSpineTypes';
import type { WybleEtudeDifficulty, WybleEtudePreset } from './wybleEtudePresetTypes';

const PC_ROOT_NAMES: readonly string[] = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];

type BarSpec = { readonly offset: number; readonly quality: string };

function rootNameFromPc(keyPc: PitchClass, semitoneOffset: number): string {
  const pc = (((keyPc + semitoneOffset) % 12) + 12) % 12;
  return PC_ROOT_NAMES[pc]!;
}

function barsFromSpecs(keyPc: PitchClass, specs: readonly BarSpec[]): string[] {
  return specs.map(({ offset, quality }) => `${rootNameFromPc(keyPc, offset)}${quality}`);
}

const PENTATONIC: Record<WybleEtudeDifficulty, readonly BarSpec[]> = {
  easy: [
    { offset: 0, quality: 'maj7' },
    { offset: 5, quality: 'maj7' },
    { offset: 7, quality: '7' },
    { offset: 0, quality: 'maj7' },
  ],
  medium: [
    { offset: 2, quality: 'm7' },
    { offset: 7, quality: '7' },
    { offset: 0, quality: 'maj7' },
    { offset: 9, quality: 'm7' },
    { offset: 2, quality: 'm7' },
    { offset: 7, quality: '7' },
    { offset: 0, quality: 'maj7' },
    { offset: 0, quality: 'maj7' },
  ],
  hard: [
    { offset: 2, quality: 'm9' },
    { offset: 7, quality: '13' },
    { offset: 0, quality: 'maj9' },
    { offset: 5, quality: 'maj7' },
    { offset: 9, quality: 'm7' },
    { offset: 2, quality: 'm7' },
    { offset: 7, quality: '7alt' },
    { offset: 0, quality: 'maj7' },
    { offset: 4, quality: 'm7' },
    { offset: 9, quality: '7' },
    { offset: 2, quality: 'm7' },
    { offset: 0, quality: 'maj7' },
  ],
};

const CHROMATIC: Record<WybleEtudeDifficulty, readonly BarSpec[]> = {
  easy: [
    { offset: 0, quality: 'maj7' },
    { offset: 3, quality: 'maj7' },
    { offset: 5, quality: '7' },
    { offset: 0, quality: 'maj7' },
  ],
  medium: [
    { offset: 0, quality: 'maj7' },
    { offset: 1, quality: '7' },
    { offset: 2, quality: 'm7' },
    { offset: 5, quality: 'maj7' },
    { offset: 6, quality: '7' },
    { offset: 7, quality: '7' },
    { offset: 0, quality: 'maj7' },
    { offset: 11, quality: '7' },
  ],
  hard: [
    { offset: 0, quality: 'maj7#11' },
    { offset: 1, quality: '7b9' },
    { offset: 3, quality: 'maj7' },
    { offset: 4, quality: 'm7b5' },
    { offset: 6, quality: '7alt' },
    { offset: 7, quality: '7' },
    { offset: 8, quality: 'm7' },
    { offset: 10, quality: '7' },
    { offset: 11, quality: '7b9' },
    { offset: 0, quality: 'maj9' },
    { offset: 1, quality: '7alt' },
    { offset: 0, quality: 'maj7' },
  ],
};

const WHOLE_TONE: Record<WybleEtudeDifficulty, readonly BarSpec[]> = {
  easy: [
    { offset: 0, quality: 'aug' },
    { offset: 2, quality: 'aug' },
    { offset: 4, quality: 'aug' },
    { offset: 6, quality: 'aug' },
  ],
  medium: [
    { offset: 0, quality: 'maj7#5' },
    { offset: 2, quality: '7#5' },
    { offset: 4, quality: 'maj7#5' },
    { offset: 6, quality: '7#5' },
    { offset: 8, quality: 'maj7#5' },
    { offset: 10, quality: '7#5' },
    { offset: 0, quality: 'maj7#5' },
    { offset: 2, quality: '7#5' },
  ],
  hard: [
    { offset: 0, quality: 'maj7#5' },
    { offset: 2, quality: '7#5' },
    { offset: 4, quality: 'maj7#11' },
    { offset: 6, quality: '7alt' },
    { offset: 8, quality: 'maj7#5' },
    { offset: 10, quality: '7#5' },
    { offset: 0, quality: 'maj7#5' },
    { offset: 2, quality: '7#5' },
    { offset: 4, quality: 'maj7#11' },
    { offset: 6, quality: '7alt' },
    { offset: 8, quality: 'maj7#5' },
    { offset: 10, quality: '7#5' },
  ],
};

const PATTERN_TABLE: Record<
  string,
  Record<WybleEtudeDifficulty, readonly BarSpec[]> | undefined
> = {
  pentatonic: PENTATONIC,
  chromatic: CHROMATIC,
  whole_tone: WHOLE_TONE,
};

/** Pitch-class root label for a Wyble etude preset key. */
export function wybleEtudeKeyRootName(key: PitchClass): string {
  return PC_ROOT_NAMES[key]!;
}

/** Raw chord symbols (one per bar) before MusicContext normalisation. */
export function resolveWybleEtudePresetChordBars(preset: WybleEtudePreset): string[] {
  const patternKey = String(preset.patternType || 'pentatonic').trim().toLowerCase();
  const table = PATTERN_TABLE[patternKey] ?? PENTATONIC;
  const specs = table[preset.difficulty] ?? table.easy;
  return barsFromSpecs(preset.key, specs);
}
