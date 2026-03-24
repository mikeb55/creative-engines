/**
 * Bacharach style validation — subtle chromatic colour + phrase asymmetry per section.
 * Aligned with bacharachSignal.ts and generateGoldenPathDuoScore anchor measures.
 */

import type { ScoreModel } from '../../score-model/scoreModelTypes';
import {
  analyzeGuitarSectionMeasures,
  countMelodicChromaticSteps,
  sectionHasBacharachSignal,
} from './bacharachSignal';

function guitarPitchesTimeOrdered(guitar: ScoreModel['parts'][0]): number[] {
  const timed: { t: number; pitch: number }[] = [];
  for (const m of guitar.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const sb = (e as { startBeat: number }).startBeat;
      timed.push({ t: (m.index - 1) * 4 + sb, pitch: (e as { pitch: number }).pitch });
    }
  }
  timed.sort((a, b) => a.t - b.t);
  return timed.map((x) => x.pitch);
}

export interface BacharachValidationResult {
  valid: boolean;
  errors: string[];
}

const MAX_CHROMATIC_RATIO = 0.45;

export function validateBacharachConformance(score: ScoreModel): BacharachValidationResult {
  const errors: string[] = [];
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!guitar) return { valid: true, errors: [] };

  const measA = guitar.measures.filter((m) => m.index >= 1 && m.index <= 4);
  const measB = guitar.measures.filter((m) => m.index >= 5 && m.index <= 8);

  const sigA = analyzeGuitarSectionMeasures(measA);
  const sigB = analyzeGuitarSectionMeasures(measB);

  if (sigA.pitchesOrdered.length === 0 || sigB.pitchesOrdered.length === 0) {
    errors.push('Bacharach: guitar section missing notes');
    return { valid: false, errors };
  }

  if (!sectionHasBacharachSignal(sigA)) {
    errors.push(
      'Bacharach: section A lacks chromatic colour or phrase asymmetry (too diatonic / square)'
    );
  }
  if (!sectionHasBacharachSignal(sigB)) {
    errors.push(
      'Bacharach: section B lacks chromatic colour or phrase asymmetry (too diatonic / square)'
    );
  }

  const ordered = guitarPitchesTimeOrdered(guitar);
  const intervals = ordered.length - 1;
  if (intervals > 0) {
    const chrom = countMelodicChromaticSteps(ordered);
    const ratio = chrom / intervals;
    if (ratio > MAX_CHROMATIC_RATIO) {
      errors.push('Bacharach: harmony feels chromatically arbitrary');
    }
  }

  return { valid: errors.length === 0, errors };
}
