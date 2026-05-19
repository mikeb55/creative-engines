/**
 * Pitch-field region scheduler — phrase-pressure driven regions.
 */

import type { PitchClass, PitchFieldRegion, PitchFieldTransition } from './pitchFieldSpineTypes';

const MIN_REGION_BARS = 2;
const MAX_REGION_BARS = 8;

function rng01(seed: number, salt: number): number {
  let x = Math.imul(seed + salt * 7919, 1103515245);
  x = (x ^ (x >>> 13)) >>> 0;
  return (x % 100000) / 100000;
}

function pickCarryPcs(parent: PitchClass[], seed: number, regionIndex: number): PitchClass[] {
  const count = 2 + Math.floor(rng01(seed, regionIndex * 41 + 7) * 3);
  const out: PitchClass[] = [];
  const pool = [...parent];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(rng01(seed, regionIndex * 13 + i * 3) * pool.length);
    out.push(pool.splice(idx, 1)[0]!);
  }
  return out;
}

function mutationStrengthForBoundary(seed: number, regionIndex: number): number {
  const u = rng01(seed, regionIndex * 97 + 11);
  return 0.35 + u * 0.35;
}

function shouldAdvanceRegion(
  barInRegion: number,
  regionStart: number,
  tensionArc: number[],
  densityArc: number[],
): boolean {
  if (barInRegion >= MAX_REGION_BARS) return true;
  if (barInRegion < MIN_REGION_BARS) return false;
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
  const regions: PitchFieldRegion[] = [];
  let bar = 1;
  let regionIndex = 0;
  while (bar <= totalBars) {
    const startBar = bar;
    let endBar = startBar;
    let barInRegion = 1;
    while (endBar < totalBars) {
      const advance = shouldAdvanceRegion(barInRegion, startBar, tensionArc, densityArc);
      if (advance && barInRegion >= MIN_REGION_BARS) break;
      endBar++;
      barInRegion++;
      if (barInRegion > MAX_REGION_BARS) break;
    }
    const partial = buildRegion(regionIndex, startBar, endBar);
    const parent = partial.parentPcSet;
    const transitionOut: PitchFieldTransition | undefined =
      endBar < totalBars
        ? {
            carryPcs: pickCarryPcs(parent, seed, regionIndex),
            mutationStrength: mutationStrengthForBoundary(seed, regionIndex),
            pivotPcs: parent.slice(0, Math.min(2, parent.length)),
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

export { MIN_REGION_BARS, MAX_REGION_BARS };
