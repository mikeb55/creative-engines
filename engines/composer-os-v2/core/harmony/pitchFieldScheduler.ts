/**
 * Pitch-field region scheduler — phrase-pressure driven regions.
 */

import type { PitchClass, PitchFieldRegion, PitchFieldTransition } from './pitchFieldSpineTypes';

const DEFAULT_MIN_REGION_BARS = 2;
const DEFAULT_MAX_REGION_BARS = 8;

function regionBoundsForVrb(vrbId: string): { min: number; max: number } {
  if (vrbId === 'coltrane') return { min: 4, max: 16 };
  if (vrbId === 'sq_vrb_messiaen') return { min: 1, max: 8 };
  if (vrbId === 'ligeti') return { min: 8, max: 32 };
  return { min: DEFAULT_MIN_REGION_BARS, max: DEFAULT_MAX_REGION_BARS };
}

function mutationStrengthRangeForVrb(vrbId: string): [number, number] {
  if (vrbId === 'coltrane') return [0.25, 0.55];
  if (vrbId === 'sq_vrb_messiaen') return [0.2, 0.45];
  if (vrbId === 'ligeti') return [0.1, 0.35];
  if (vrbId === 'ornette_coleman') return [0.35, 0.7];
  return [0.35, 0.7];
}

function rng01(seed: number, salt: number): number {
  let x = Math.imul(seed + salt * 7919, 1103515245);
  x = (x ^ (x >>> 13)) >>> 0;
  return (x % 100000) / 100000;
}

function pickCarryPcs(
  parent: PitchClass[],
  seed: number,
  regionIndex: number,
  vrbId?: string,
): PitchClass[] {
  const count =
    vrbId === 'ligeti'
      ? Math.min(parent.length, 5 + Math.floor(rng01(seed, regionIndex * 41 + 7) * 4))
      : 2 + Math.floor(rng01(seed, regionIndex * 41 + 7) * 3);
  const out: PitchClass[] = [];
  const pool = [...parent];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(rng01(seed, regionIndex * 13 + i * 3) * pool.length);
    out.push(pool.splice(idx, 1)[0]!);
  }
  return out;
}

function mutationStrengthForBoundary(seed: number, regionIndex: number, vrbId: string): number {
  const [lo, hi] = mutationStrengthRangeForVrb(vrbId);
  const u = rng01(seed, regionIndex * 97 + 11);
  return lo + u * (hi - lo);
}

function shouldAdvanceRegion(
  barInRegion: number,
  regionStart: number,
  tensionArc: number[],
  densityArc: number[],
  vrbId: string,
  maxRegionBars: number,
  minRegionBars: number,
  densityDrive?: number,
): boolean {
  if (barInRegion >= maxRegionBars) return true;
  if (barInRegion < minRegionBars) return false;
  if (vrbId === 'coltrane' && typeof densityDrive === 'number' && densityDrive > 0.8 && barInRegion >= 4) {
    return true;
  }
  if (vrbId === 'ligeti' && barInRegion >= 8) {
    const b = regionStart + barInRegion - 1;
    const t0 = tensionArc[b - 2] ?? tensionArc[b - 1] ?? 0;
    const t1 = tensionArc[b - 1] ?? 0;
    if (Math.abs(t1 - t0) > 0.22) return true;
  }
  const b = regionStart + barInRegion - 1;
  const t0 = tensionArc[b - 2] ?? tensionArc[b - 1] ?? 0;
  const t1 = tensionArc[b - 1] ?? 0;
  if (Math.abs(t1 - t0) > 0.3 && barInRegion >= 2) return true;
  const dPrev = densityArc[b - 2] ?? 0;
  const dCur = densityArc[b - 1] ?? 0;
  const dNext = densityArc[b] ?? dCur;
  if (dPrev > dCur + 0.25 && dCur < dNext + 0.05 && barInRegion >= 2) return true;
  return false;
}

export type ScheduleFieldRegionsParams = {
  totalBars: number;
  vrbId: string;
  tensionArc: number[];
  densityArc: number[];
  seed?: number;
  buildRegion: (
    regionIndex: number,
    startBar: number,
    endBar: number,
    transitionOut?: PitchFieldTransition,
  ) => Omit<PitchFieldRegion, 'startBar' | 'endBar' | 'transitionOut'> & {
    transitionOut?: PitchFieldTransition;
  };
};

/** Schedule contiguous regions (2–8 bars) covering [1, totalBars]. */
export function scheduleFieldRegions(params: ScheduleFieldRegionsParams): PitchFieldRegion[] {
  const { totalBars, vrbId, tensionArc, densityArc, buildRegion } = params;
  const seed = params.seed ?? vrbId.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const { min: minRegionBars, max: maxRegionBars } = regionBoundsForVrb(vrbId);
  const regions: PitchFieldRegion[] = [];
  let bar = 1;
  let regionIndex = 0;
  while (bar <= totalBars) {
    const startBar = bar;
    let endBar = startBar;
    let barInRegion = 1;
    const previewDensityDrive =
      vrbId === 'coltrane' ? 0.4 + rng01(seed, regionIndex * 23 + 5) * 0.6 : undefined;
    while (endBar < totalBars) {
      const advance = shouldAdvanceRegion(
        barInRegion,
        startBar,
        tensionArc,
        densityArc,
        vrbId,
        maxRegionBars,
        minRegionBars,
        previewDensityDrive,
      );
      if (advance && barInRegion >= minRegionBars) break;
      endBar++;
      barInRegion++;
      if (barInRegion > maxRegionBars) break;
    }
    const partial = buildRegion(regionIndex, startBar, endBar);
    const parent = partial.parentPcSet;
    const transitionOut: PitchFieldTransition | undefined =
      endBar < totalBars
        ? {
            carryPcs: pickCarryPcs(parent, seed, regionIndex, vrbId),
            mutationStrength: mutationStrengthForBoundary(seed, regionIndex, vrbId),
            pivotPcs: parent.slice(0, Math.min(3, parent.length)),
          }
        : undefined;
    regions.push({
      ...partial,
      startBar,
      endBar,
      transitionOut,
    });
    bar = endBar + 1;
    regionIndex++;
  }
  return regions;
}

export const MIN_REGION_BARS = DEFAULT_MIN_REGION_BARS;
export const MAX_REGION_BARS = DEFAULT_MAX_REGION_BARS;
export { DEFAULT_MIN_REGION_BARS, DEFAULT_MAX_REGION_BARS, regionBoundsForVrb };
