/**
 * Composer OS V2 — Section ordering for Song Mode (Prompt 3/7).
 */

import type { SongSectionPlan } from './songModeTypes';

/** Default structure: verse → chorus → verse → chorus. */
export function planDefaultVerseChorusStructure(): SongSectionPlan[] {
  return [
    { order: 0, kind: 'verse' },
    { order: 1, kind: 'chorus' },
    { order: 2, kind: 'verse' },
    { order: 3, kind: 'chorus' },
  ];
}

/**
 * Extended pop structure: V / PC / C / V / PC / C / Br / C
 * Chorus is the primary hook-return section (hook-first).
 */
export function planExtendedPopStructure(): SongSectionPlan[] {
  return [
    { order: 0, kind: 'verse' },
    { order: 1, kind: 'pre_chorus' },
    { order: 2, kind: 'chorus' },
    { order: 3, kind: 'verse' },
    { order: 4, kind: 'pre_chorus' },
    { order: 5, kind: 'chorus' },
    { order: 6, kind: 'bridge' },
    { order: 7, kind: 'chorus' },
  ];
}
