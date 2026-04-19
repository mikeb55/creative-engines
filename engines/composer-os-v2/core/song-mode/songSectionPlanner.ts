/**
 * Composer OS V2 — Section ordering for Song Mode (Prompt 3/7).
 */

import type { SongSectionPlan } from './songModeTypes';

const DEFAULT_32_BAR_VC: SongSectionPlan[] = [
  { order: 0, kind: 'verse' },
  { order: 1, kind: 'chorus' },
  { order: 2, kind: 'verse' },
  { order: 3, kind: 'chorus' },
  { order: 4, kind: 'verse' },
  { order: 5, kind: 'chorus' },
  { order: 6, kind: 'verse' },
  { order: 7, kind: 'chorus' },
];

/**
 * Default structure: verse–chorus cycles in 4-bar sections (`totalBars / 4` sections).
 * For **≤32** bars this returns the legacy 8-section × 4 bar scaffold (32 chord symbols).
 * For **48** bars → 12 sections; **64** bars → 16 sections (proportionally extended).
 */
export function planDefaultVerseChorusStructure(totalBars: number = 32): SongSectionPlan[] {
  if (totalBars <= 32) return DEFAULT_32_BAR_VC;
  const sectionCount = Math.floor(totalBars / 4);
  const pattern = ['verse', 'chorus'] as const;
  return Array.from({ length: sectionCount }, (_, i) => ({
    order: i,
    kind: pattern[i % 2]!,
  }));
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
