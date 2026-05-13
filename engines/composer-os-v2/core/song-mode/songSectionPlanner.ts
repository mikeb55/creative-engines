/**
 * Composer OS V2 — Section ordering for Song Mode (Prompt 3/7).
 */

import type { BeatlesFormTemplateId } from '../compositionContext';
import type { SongSectionPlan } from './songModeTypes';

export type { BeatlesFormTemplateId };

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

/**
 * BT_FORM_01 — primary Beatles macro-form **Verse–Verse–Bridge–Verse** (intro optional upstream).
 * Bar budget **32**: four sections × **8** bars (pool rows tiled to length).
 */
export function planBeatlesPrimaryVVbV(_totalBars: number = 32): SongSectionPlan[] {
  return [
    { order: 0, kind: 'verse' },
    { order: 1, kind: 'verse' },
    { order: 2, kind: 'bridge' },
    { order: 3, kind: 'verse' },
  ];
}

/**
 * BT_FORM_02 — secondary **Verse–Chorus** lineage: V–C–V–C–Bridge on **32** bars (8+8+8+4+4).
 */
export function planBeatlesSecondaryVerseChorus(_totalBars: number = 32): SongSectionPlan[] {
  return [
    { order: 0, kind: 'verse' },
    { order: 1, kind: 'chorus' },
    { order: 2, kind: 'verse' },
    { order: 3, kind: 'chorus' },
    { order: 4, kind: 'bridge' },
  ];
}

/** Per-section bar targets when expanding Beatle pool rows to macro-form lengths. */
export function beatlesSectionBarTargets(
  template: BeatlesFormTemplateId,
  totalBars: number,
  sectionCount: number
): number[] | undefined {
  if (template === 'legacy_vc') return undefined;
  if (template === 'vv_br_v' && sectionCount === 4) {
    const q = Math.floor(totalBars / 4);
    return [q, q, q, q];
  }
  if (template === 'verse_chorus' && sectionCount === 5 && totalBars === 32) {
    return [8, 8, 8, 4, 4];
  }
  if (template === 'verse_chorus' && sectionCount === 5) {
    const u = Math.floor(totalBars / 8);
    return [u * 2, u * 2, u * 2, u, u];
  }
  return undefined;
}

export type HarmonicRhythmProfile = 'fast' | 'medium' | 'slow' | 'variable';

/**
 * Per-section chord density preference for 4-bar Song Mode sections.
 * - fast: allows two internal changes (3 harmonic regions over 4 bars)
 * - slow: prefers one harmony for the full section
 * - medium/variable: keep existing per-bar behaviour
 */
export function chordSlotsForSectionHarmonicRhythm(
  harmonicRhythm: HarmonicRhythmProfile
): 1 | 3 | 4 {
  if (harmonicRhythm === 'fast') return 3;
  if (harmonicRhythm === 'slow') return 1;
  return 4;
}
