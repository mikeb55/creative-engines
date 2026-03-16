/**
 * Global timing standard for all notation engines.
 * Single source of truth — no per-engine duration hacks.
 */

export const DIVISIONS = 4;
export const BEATS_PER_MEASURE = 4;
export const MEASURE_DURATION = BEATS_PER_MEASURE * DIVISIONS; // 16 for 4/4

export const DURATION_MAP = {
  sixteenth: 1,
  eighth: 2,
  quarter: 4,
  half: 8,
  whole: 16,
} as const;

export function divisionsToType(divs: number): string {
  if (divs <= 1) return '16th';
  if (divs <= 2) return 'eighth';
  if (divs <= 4) return 'quarter';
  if (divs <= 8) return 'half';
  return 'whole';
}

export function beatsToDivisions(beats: number): number {
  return Math.round(beats * DIVISIONS);
}
