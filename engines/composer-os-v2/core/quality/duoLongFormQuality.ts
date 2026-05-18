/**
 * Long-form Duo quality layer (32–64-bar) — additive; does not replace 8-bar GCE.
 * V4.0 Prompt 1/8.
 */

import type { CompositionContext } from '../compositionContext';
import type { PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import { activityScoreForBar } from '../goldenPath/activityScore';

export interface DuoLongFormQualityResult {
  /** 0–10 aggregate */
  total: number;
  sectionContrast: number;
  tonalJourney: number;
  motifSpread: number;
  bContrast: number;
  returnPayoff: number;
  interactionArc: number;
  globalPeak: number;
}

function meanActivity(part: PartModel, start: number, end: number): number {
  let s = 0;
  let n = 0;
  for (let b = start; b <= end; b++) {
    s += activityScoreForBar(part, b);
    n++;
  }
  return n ? s / n : 0;
}

/**
 * Heuristic evaluation of long-form Duo output — used for manifests / soft scoring only.
 */
export function evaluateDuoLongFormQuality(score: ScoreModel, context: CompositionContext): DuoLongFormQualityResult {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const b = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  const totalBars = context.form.totalBars;
  if (!g || !b || totalBars < 32) {
    return {
      total: 0,
      sectionContrast: 0,
      tonalJourney: 0,
      motifSpread: 0,
      bContrast: 0,
      returnPayoff: 0,
      interactionArc: 0,
      globalPeak: 0,
    };
  }

  const q = totalBars / 4;
  const s1End = q;
  const s2End = q * 2;
  const s3End = q * 3;

  const a = meanActivity(g, 1, s1End);
  const ap = meanActivity(g, s1End + 1, s2End);
  const br = meanActivity(g, s2End + 1, s3End);
  const ar = meanActivity(g, s3End + 1, totalBars);

  const ba = meanActivity(b, 1, s1End);
  const bb = meanActivity(b, s2End + 1, s3End);

  const sectionContrast = Math.min(
    10,
    Math.abs(a - ap) + Math.abs(ap - br) + Math.abs(br - ar) + Math.abs(ba - bb) * 0.4
  );

  const tonalJourney = context.generationMetadata?.modulationPlanActive ? 8.5 : 6;

  const motifSpread = (g.measures.length ?? 0) >= totalBars ? 7.5 : 5;

  const bContrast = Math.min(10, Math.abs(br - a) + Math.abs(bb - ba) * 0.35 + 2);

  const returnPayoff = Math.min(
    10,
    Math.abs(ar - a) * 0.5 +
      (meanActivity(g, Math.max(1, totalBars - 2), totalBars) - meanActivity(g, s3End + 1, Math.min(s3End + 3, totalBars))) *
        0.8 +
      4
  );

  const interactionArc = Math.min(
    10,
    Math.abs(meanActivity(b, s2End + 1, s3End) - meanActivity(g, s2End + 1, s3End)) * 0.6 + 4
  );

  const globalPeak = Math.min(
    10,
    meanActivity(g, Math.max(1, totalBars - 2), totalBars) - Math.min(a, ap) + 5
  );

  const total =
    0.2 * sectionContrast +
    0.15 * tonalJourney +
    0.1 * motifSpread +
    0.15 * bContrast +
    0.15 * returnPayoff +
    0.1 * interactionArc +
    0.15 * globalPeak;

  return {
    total: Math.round(total * 10) / 10,
    sectionContrast: Math.round(sectionContrast * 10) / 10,
    tonalJourney,
    motifSpread,
    bContrast: Math.round(bContrast * 10) / 10,
    returnPayoff: Math.round(returnPayoff * 10) / 10,
    interactionArc: Math.round(interactionArc * 10) / 10,
    globalPeak: Math.round(globalPeak * 10) / 10,
  };
}
