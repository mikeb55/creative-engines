/**
 * Bacharach style validation — measurable asymmetry without harmonic chaos.
 */

import type { ScoreModel } from '../../score-model/scoreModelTypes';

export interface BacharachValidationResult {
  valid: boolean;
  errors: string[];
}

function countChromaticSteps(pitches: number[]): number {
  let n = 0;
  for (let i = 1; i < pitches.length; i++) {
    const d = Math.abs(pitches[i] - pitches[i - 1]);
    if (d === 1) n++;
  }
  return n;
}

export function validateBacharachConformance(score: ScoreModel): BacharachValidationResult {
  const errors: string[] = [];
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!guitar) return { valid: true, errors: [] };

  const starts: number[] = [];
  const timed: { t: number; pitch: number }[] = [];
  for (const m of guitar.measures) {
    for (const e of m.events) {
      if (e.kind === 'note') {
        const sb = (e as { startBeat: number }).startBeat;
        starts.push(sb);
        timed.push({ t: (m.index - 1) * 4 + sb, pitch: (e as { pitch: number }).pitch });
      }
    }
  }

  if (starts.length === 0) {
    errors.push('Bacharach: guitar has no notes');
    return { valid: false, errors };
  }

  timed.sort((a, b) => a.t - b.t);
  const pitches = timed.map((x) => x.pitch);

  const fractional = starts.filter((s) => Math.abs(s - Math.round(s)) > 1e-6).length;
  const distinctStarts = new Set(starts.map((s) => Math.round(s * 4) / 4)).size;
  if (fractional < 1 && distinctStarts < 3) {
    errors.push('Bacharach: phrase rhythm too square (no measurable asymmetry)');
  }

  const intervals = pitches.length - 1;
  if (intervals > 0) {
    const chrom = countChromaticSteps(pitches);
    const ratio = chrom / intervals;
    if (ratio > 0.45) errors.push('Bacharach: harmony feels chromatically arbitrary');
    if (ratio === 0 && intervals > 4) errors.push('Bacharach: no subtle chromatic colour detected');
  }

  const onStrongGrid = starts.filter((s) => s === 0 || s === 1 || s === 2 || s === 3).length;
  if (starts.length > 0 && onStrongGrid / starts.length > 0.92) {
    errors.push('Bacharach: onset grid too uniform');
  }

  return { valid: errors.length === 0, errors };
}
