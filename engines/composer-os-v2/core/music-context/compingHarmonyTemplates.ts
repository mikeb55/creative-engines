/**
 * Shared harmony bar templates for MusicContext comping producers (V104p6).
 */

import type { PitchClass } from '../harmony/pitchFieldSpineTypes';

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

export type HarmonyBarTemplate = { readonly offset: number; readonly suffix: string };

export function rootNameFromPc(keyPc: PitchClass, semitoneOffset: number): string {
  const pc = (((keyPc + semitoneOffset) % 12) + 12) % 12;
  return PC_ROOT_NAMES[pc]!;
}

export function barsFromHarmonyTemplate(
  key: PitchClass,
  template: readonly HarmonyBarTemplate[],
): string[] {
  return template.map(({ offset, suffix }) => `${rootNameFromPc(key, offset)}${suffix}`);
}
