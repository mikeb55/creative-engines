/**
 * Per-bar SQ VRB GCE adjustments + boundary-bar merge (max / OR).
 */

import type { CompositionContext } from '../compositionContext';
import { getSqVrbGceAdjustments } from '../counterpoint/vrbProfiles/sqVrbProfileRegistry';
import type { SqVrbGceScorerAdjustments } from '../counterpoint/vrbProfiles/sqVrbProfileTypes';
import { readSqToBbVrbWire, resolveVrbForBar } from '../counterpoint/vrbProfiles/vrbContextResolver';

export type SqGceBarResolution = {
  sqVrbId: string;
  adjustments?: SqVrbGceScorerAdjustments;
  isBoundaryBar: boolean;
};

const NUMERIC_MERGE_KEYS: (keyof SqVrbGceScorerAdjustments)[] = [
  'registerCohesionStdevCeilingSt',
  'registerCohesionSoftCeilingSt',
  'motifRecurrenceWeight',
  'intervalEconomyWeight',
  'registerCohesionWeight',
  'phraseCellBarsMin',
  'phraseCellBarsMax',
  'phrasePeriodBars',
  'cyclicMotifReturnBoost',
];

function mergeBoundaryAdjustments(
  a: SqVrbGceScorerAdjustments,
  b: SqVrbGceScorerAdjustments,
): SqVrbGceScorerAdjustments {
  const out: SqVrbGceScorerAdjustments = { ...a };
  for (const key of NUMERIC_MERGE_KEYS) {
    const av = a[key];
    const bv = b[key];
    if (typeof av === 'number' && typeof bv === 'number') {
      switch (key) {
        case 'registerCohesionStdevCeilingSt':
          out.registerCohesionStdevCeilingSt = Math.max(av, bv);
          break;
        case 'registerCohesionSoftCeilingSt':
          out.registerCohesionSoftCeilingSt = Math.max(av, bv);
          break;
        case 'motifRecurrenceWeight':
          out.motifRecurrenceWeight = Math.max(av, bv);
          break;
        case 'intervalEconomyWeight':
          out.intervalEconomyWeight = Math.max(av, bv);
          break;
        case 'registerCohesionWeight':
          out.registerCohesionWeight = Math.max(av, bv);
          break;
        case 'phraseCellBarsMin':
          out.phraseCellBarsMin = Math.max(av, bv);
          break;
        case 'phraseCellBarsMax':
          out.phraseCellBarsMax = Math.max(av, bv);
          break;
        case 'phrasePeriodBars':
          out.phrasePeriodBars = Math.max(av, bv);
          break;
        case 'cyclicMotifReturnBoost':
          out.cyclicMotifReturnBoost = Math.max(av, bv);
          break;
        default:
          break;
      }
    }
  }
  return out;
}

function isSectionSeamBar(
  bar: number,
  wire: ReturnType<typeof readSqToBbVrbWire>,
  globalFallback: string,
): boolean {
  if (bar <= 1) return false;
  const barCtx = resolveVrbForBar(bar, wire.contextMap, globalFallback, wire.sections);
  if (barCtx.isTransitionBar) return true;
  const prevCtx = resolveVrbForBar(bar - 1, wire.contextMap, globalFallback, wire.sections);
  return prevCtx.sectionId !== barCtx.sectionId && prevCtx.vrbId !== barCtx.vrbId;
}

export function resolveSqGceForBar(
  bar: number,
  context: CompositionContext,
  globalFallback: string,
): SqGceBarResolution {
  const wire = readSqToBbVrbWire(context);
  const barCtx = resolveVrbForBar(bar, wire.contextMap, globalFallback, wire.sections);
  const sqVrbId = barCtx.vrbId || globalFallback;
  const seamBar = isSectionSeamBar(bar, wire, globalFallback);
  if (!seamBar) {
    return { sqVrbId, adjustments: getSqVrbGceAdjustments(sqVrbId), isBoundaryBar: false };
  }
  const prevBar = Math.max(1, bar - 1);
  const prevCtx = resolveVrbForBar(prevBar, wire.contextMap, globalFallback, wire.sections);
  const a = getSqVrbGceAdjustments(prevCtx.vrbId);
  const b = getSqVrbGceAdjustments(sqVrbId);
  if (a && b) {
    return { sqVrbId, adjustments: mergeBoundaryAdjustments(a, b), isBoundaryBar: true };
  }
  return { sqVrbId, adjustments: a ?? b ?? getSqVrbGceAdjustments(sqVrbId), isBoundaryBar: true };
}

export function mergeBoundaryThreshold(a: number, b: number): number {
  return Math.max(a, b);
}
