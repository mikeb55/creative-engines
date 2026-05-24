/**
 * Frank Zappa GCE structural fingerprint — generation wiring (Song Mode / duo).
 * Applies declarative fingerprint params to section planning + barMeterMap + register policy.
 */

import type { CompositionContext } from '../compositionContext';
import type { FormMap } from '../compositionContext';
import type { BarMeterMap } from '../rhythm/barMeterTypes';
import { seededUnit } from '../goldenPath/guitarBassDuoHarmony';
import type { MacroFormPlan, MacroSectionGoals } from '../form/macroFormPlanner';
import { resolveZappaStyleMode } from '../song-mode/frankZappaSlice';
import {
  FRANK_ZAPPA_STRUCTURAL_FINGERPRINT,
  ZAPPA_GCE_METER_SPLICE,
  isFrankZappaSongwriterId,
} from './frankZappaStructuralFingerprint';

/** Absurdist section surface kinds — adjacent pairs may deliberately clash. */
export const ZAPPA_SECTION_STYLE_KINDS = [
  'march',
  'ballad',
  'fusion_groove',
  'doo_wop',
  'avant_garde',
  'country_twang',
] as const;

export type ZappaSectionStyleKind = (typeof ZAPPA_SECTION_STYLE_KINDS)[number];

const INCOMPATIBLE_SECTION_PAIRS: ReadonlyArray<readonly [ZappaSectionStyleKind, ZappaSectionStyleKind]> = [
  ['march', 'ballad'],
  ['doo_wop', 'avant_garde'],
  ['country_twang', 'fusion_groove'],
  ['march', 'avant_garde'],
  ['ballad', 'fusion_groove'],
];

function isIncompatiblePair(a: ZappaSectionStyleKind, b: ZappaSectionStyleKind): boolean {
  return INCOMPATIBLE_SECTION_PAIRS.some(
    ([x, y]) => (x === a && y === b) || (x === b && y === a)
  );
}

function pickInitialSectionKind(seed: number, sectionIndex: number): ZappaSectionStyleKind {
  const idx = Math.floor(seededUnit(seed, sectionIndex + 1, 870) * ZAPPA_SECTION_STYLE_KINDS.length);
  return ZAPPA_SECTION_STYLE_KINDS[idx] ?? 'march';
}

function pickClashingSectionKind(
  seed: number,
  prev: ZappaSectionStyleKind,
  sectionIndex: number,
  styleCollisionWeight: number
): ZappaSectionStyleKind {
  const clashCandidates = ZAPPA_SECTION_STYLE_KINDS.filter((k) => isIncompatiblePair(prev, k));
  const useClash =
    clashCandidates.length > 0 && seededUnit(seed, sectionIndex + 1, 871) < styleCollisionWeight;
  if (useClash) {
    const idx = Math.floor(seededUnit(seed, sectionIndex + 1, 872) * clashCandidates.length);
    return clashCandidates[idx] ?? prev;
  }
  const idx = Math.floor(seededUnit(seed, sectionIndex + 1, 873) * ZAPPA_SECTION_STYLE_KINDS.length);
  return ZAPPA_SECTION_STYLE_KINDS[idx] ?? prev;
}

/** Deterministic absurdist section-kind sequence (march ↔ ballad etc.). */
export function planZappaAbsurdistSectionKinds(
  seed: number,
  sectionCount: number,
  styleCollisionWeight: number
): ZappaSectionStyleKind[] {
  if (sectionCount <= 0) return [];
  const out: ZappaSectionStyleKind[] = [pickInitialSectionKind(seed, 0)];
  for (let i = 1; i < sectionCount; i++) {
    out.push(pickClashingSectionKind(seed, out[i - 1]!, i, styleCollisionWeight));
  }
  return out;
}

/** Build auto barMeterMap from fingerprint splice — only when request did not supply one. */
export function buildZappaGceAutoBarMeterMap(form: FormMap, seed: number): BarMeterMap {
  const map: BarMeterMap = {};
  const sections = form.sections;
  if (!sections.length) return map;

  let spliceCursor = Math.floor(seededUnit(seed, 1, 860) * ZAPPA_GCE_METER_SPLICE.length);

  for (let si = 0; si < sections.length; si++) {
    const sec = sections[si]!;
    const lo = sec.startBar;
    const hi = Math.min(form.totalBars, sec.startBar + sec.length - 1);
    for (let b = lo; b <= hi; b++) {
      const row = ZAPPA_GCE_METER_SPLICE[spliceCursor % ZAPPA_GCE_METER_SPLICE.length]!;
      map[b] = { numerator: row.numerator, denominator: row.denominator };
      if (b === lo && si > 0) {
        /** Section boundary — advance splice (7/8 → 5/4 → 4/4). */
        spliceCursor++;
      } else if (b > lo) {
        spliceCursor++;
      }
    }
    spliceCursor++;
  }
  return map;
}

function macroGoalsForZappaSectionKind(
  base: MacroSectionGoals,
  kind: ZappaSectionStyleKind
): MacroSectionGoals {
  switch (kind) {
    case 'march':
      return {
        ...base,
        harmonyPacing: 'dense',
        motifTreatment: 'fragmentation',
        energyCurve: 'peak',
        registerTarget: 'low',
      };
    case 'ballad':
      return {
        ...base,
        harmonyPacing: 'static',
        motifTreatment: 'statement',
        energyCurve: 'low',
        registerTarget: 'mid',
      };
    case 'fusion_groove':
      return {
        ...base,
        harmonyPacing: 'moderate',
        motifTreatment: 'development',
        energyCurve: 'high',
        registerTarget: 'high',
      };
    case 'doo_wop':
      return {
        ...base,
        harmonyPacing: 'static',
        motifTreatment: 'return',
        energyCurve: 'mid',
        registerTarget: 'mid',
      };
    case 'avant_garde':
      return {
        ...base,
        harmonyPacing: 'dense',
        motifTreatment: 'fragmentation',
        energyCurve: 'peak',
        registerTarget: 'high',
      };
    case 'country_twang':
      return {
        ...base,
        harmonyPacing: 'moderate',
        motifTreatment: 'statement',
        energyCurve: 'mid',
        registerTarget: 'low',
      };
    default:
      return base;
  }
}

function applyZappaKindsToMacroFormPlan(
  plan: MacroFormPlan | undefined,
  kinds: readonly ZappaSectionStyleKind[]
): MacroFormPlan | undefined {
  if (!plan?.sections?.length || !kinds.length) return plan;
  return {
    ...plan,
    sections: plan.sections.map((sec, i) =>
      macroGoalsForZappaSectionKind(sec, kinds[i] ?? kinds[kinds.length - 1] ?? 'march')
    ),
  };
}

export function shouldApplyZappaGceStructuralGeneration(context: CompositionContext): boolean {
  const id =
    context.generationMetadata?.songwriterStyleId ??
    context.generationMetadata?.primarySongwriterStyleId;
  if (!isFrankZappaSongwriterId(id)) return false;
  return resolveZappaStyleMode(context) === 'compositional';
}

/**
 * Wire GCE structural fingerprint into Song Mode section planning + meter map.
 * Skips barMeterMap when request already supplied one.
 */
export function applyZappaGceStructuralFingerprintToContext(
  context: CompositionContext,
  seed: number,
  requestBarMeterMapPresent: boolean
): void {
  if (!shouldApplyZappaGceStructuralGeneration(context)) return;
  if (!context.form?.sections?.length) return;

  const fp = FRANK_ZAPPA_STRUCTURAL_FINGERPRINT;
  const sectionCount = context.form.sections.length;
  let sectionKinds: ZappaSectionStyleKind[] | undefined;

  if (fp.absurdistJuxtaposition) {
    sectionKinds = planZappaAbsurdistSectionKinds(seed, sectionCount, fp.styleCollisionWeight);
  }

  let barMeterMap: BarMeterMap | undefined;
  if (fp.metricDisruption && !requestBarMeterMapPresent) {
    barMeterMap = buildZappaGceAutoBarMeterMap(context.form, seed);
  }

  context.generationMetadata = {
    ...context.generationMetadata,
    zappaGceStructuralFingerprintApplied: true,
    zappaGceRegisterShiftProbability: fp.registerShiftProbability,
    ...(sectionKinds?.length ? { zappaSectionKindSequence: [...sectionKinds] } : {}),
    ...(barMeterMap && Object.keys(barMeterMap).length > 0
      ? {
          barMeterMap,
          zappaGceAutoBarMeterMap: true,
        }
      : {}),
  };

  if (barMeterMap && Object.keys(barMeterMap).length > 0) {
    context.barMeterMap = barMeterMap;
  }

  if (sectionKinds?.length && context.generationMetadata.macroFormPlan) {
    context.generationMetadata = {
      ...context.generationMetadata,
      macroFormPlan: applyZappaKindsToMacroFormPlan(
        context.generationMetadata.macroFormPlan,
        sectionKinds
      ),
    };
  }
}
