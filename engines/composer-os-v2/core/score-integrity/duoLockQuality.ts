/**
 * Guitar–Bass Duo LOCK quality: GCE composite, rhythm anti-loop, melodic heuristics.
 * Additive — used by behaviour gates for `guitar_bass_duo` only.
 */

import type { MeasureModel, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import { activityScoreForBar } from '../goldenPath/activityScore';
import {
  guideToneCoverage,
  hasCallResponseInWindow,
  rootRatioStrongBeats,
  scoreJazzDuoBehaviourSoft,
} from './jazzDuoBehaviourValidation';

export interface DuoLockValidationResult {
  valid: boolean;
  errors: string[];
}

function rhythmSig(m: MeasureModel): string {
  return [...m.events]
    .filter((e) => e.kind === 'note')
    .sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat)
    .map((e) => `${(e as { startBeat: number }).startBeat}:${(e as { duration: number }).duration}`)
    .join('|');
}

/** Guitar rest duration / total bar beats (8 bars × 4). */
export function guitarRestRatio(guitar: PartModel): number {
  let restBeats = 0;
  let total = 0;
  for (const m of guitar.measures) {
    for (const e of m.events) {
      if (e.kind === 'rest') restBeats += (e as { duration: number }).duration;
    }
    total += 4;
  }
  return total > 0 ? restBeats / total : 0;
}

/** Max run of consecutive semitone steps in same direction (chromatic run). */
export function maxConsecutiveChromaticSteps(guitar: PartModel): number {
  const pitches: number[] = [];
  for (const m of guitar.measures) {
    for (const e of m.events) {
      if (e.kind === 'note') pitches.push((e as { pitch: number }).pitch);
    }
  }
  if (pitches.length < 2) return 0;
  let maxRun = 1;
  let run = 1;
  for (let i = 1; i < pitches.length; i++) {
    const d = pitches[i] - pitches[i - 1];
    if (Math.abs(d) === 1) {
      if (i >= 2) {
        const prev = pitches[i - 1] - pitches[i - 2];
        if (Math.sign(d) === Math.sign(prev) && prev !== 0) run++;
        else run = 2;
      }
      maxRun = Math.max(maxRun, run);
    } else {
      run = 1;
    }
  }
  return maxRun;
}

/** Stepwise motion with |step| ≤ maxStep (in semitones), same direction. */
export function maxConsecutiveStepwiseMotion(guitar: PartModel, maxStep: number): number {
  const pitches: number[] = [];
  for (const m of guitar.measures) {
    for (const e of m.events) {
      if (e.kind === 'note') pitches.push((e as { pitch: number }).pitch);
    }
  }
  if (pitches.length < 2) return 0;
  let maxRun = 1;
  let run = 1;
  let dir = 0;
  for (let i = 1; i < pitches.length; i++) {
    const d = pitches[i] - pitches[i - 1];
    if (d === 0) continue;
    const ad = Math.abs(d);
    if (ad > maxStep) {
      run = 1;
      dir = Math.sign(d);
      continue;
    }
    const s = Math.sign(d);
    if (dir === 0 || s === dir) {
      run++;
      dir = s;
      maxRun = Math.max(maxRun, run);
    } else {
      run = 2;
      dir = s;
    }
  }
  return maxRun;
}

/** Adjacent melodic intervals include a repeated interval size (motivic identity). */
export function hasRepeatedIntervalCell(guitar: PartModel): boolean {
  const pitches: number[] = [];
  for (const m of guitar.measures) {
    for (const e of m.events) {
      if (e.kind === 'note') pitches.push((e as { pitch: number }).pitch);
    }
  }
  if (pitches.length < 4) return true;
  const adjs: number[] = [];
  for (let i = 1; i < pitches.length; i++) {
    adjs.push(Math.abs(pitches[i] - pitches[i - 1]) % 12);
  }
  const seen = new Set<number>();
  for (const iv of adjs) {
    if (iv === 0) continue;
    if (seen.has(iv)) return true;
    seen.add(iv);
  }
  return false;
}

/**
 * Composite 0–10 “GCE-style” score: melody memorability, motif-like intervals, bass clarity, interaction.
 */
export function computeDuoGceScore(score: ScoreModel): number {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const b = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!g || !b) return 0;
  const gc = guideToneCoverage(b);
  const rr = rootRatioStrongBeats(b);
  const soft = scoreJazzDuoBehaviourSoft(score);
  const restR = guitarRestRatio(g);
  const chrom = maxConsecutiveChromaticSteps(g);
  const stepwise = maxConsecutiveStepwiseMotion(g, 2);
  const rep = hasRepeatedIntervalCell(g) ? 1 : 0.35;
  const callA = hasCallResponseInWindow(score, 4, 1);
  const callB = hasCallResponseInWindow(score, 4, 5);
  const call = callA && callB ? 1 : callA || callB ? 0.72 : 0.4;
  const softN = Math.min(1, Math.max(0, (soft - 4) / 20));
  let s =
    2.5 * gc +
    1.55 * (1 - rr) +
    1.75 * softN +
    1.4 * Math.min(1.35, restR / 0.14) +
    0.65 * rep +
    0.95 * call +
    0.85 * (1 - Math.min(1, chrom / 7)) +
    0.55 * (1 - Math.min(1, stepwise / 12));
  s = Math.min(10, s * 1.35 + 0.55);
  return Math.round(Math.max(0, s) * 10) / 10;
}

export function validateDuoGceHardGate(score: ScoreModel): DuoLockValidationResult {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const b = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!g || !b) return { valid: true, errors: [] };
  const gce = computeDuoGceScore(score);
  if (gce < 8.5) {
    return { valid: false, errors: [`Duo LOCK: GCE ${gce.toFixed(1)} < 8.5 (motif, interaction, bass clarity)`] };
  }
  return { valid: true, errors: [] };
}

/** Guitar rhythm loop + rest window + unison rhythm with bass (duo-specific). */
export function validateDuoRhythmAntiLoop(score: ScoreModel): DuoLockValidationResult {
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  const errors: string[] = [];
  if (!guitar || !bass) return { valid: true, errors: [] };

  const sorted = [...guitar.measures].sort((a, b) => a.index - b.index);
  let prevRh = '';
  let runRh = 0;
  let maxRh = 0;
  for (const m of sorted) {
    const rh = rhythmSig(m);
    if (rh === prevRh) runRh++;
    else {
      runRh = 1;
      prevRh = rh;
    }
    maxRh = Math.max(maxRh, runRh);
  }
  if (maxRh > 2) {
    errors.push('Duo LOCK: identical guitar rhythmic cell repeats >2 consecutive bars');
  }

  let unisonRun = 0;
  let maxUnison = 0;
  for (let bar = 1; bar <= 8; bar++) {
    const gm = guitar.measures.find((x) => x.index === bar);
    const bm = bass.measures.find((x) => x.index === bar);
    if (!gm || !bm) continue;
    const gRh = rhythmSig(gm);
    const bRh = rhythmSig(bm);
    if (gRh.length > 0 && gRh === bRh && gRh.split('|').length >= 3) {
      unisonRun++;
      maxUnison = Math.max(maxUnison, unisonRun);
    } else {
      unisonRun = 0;
    }
  }
  if (maxUnison > 3) {
    errors.push('Duo LOCK: guitar and bass share identical dense rhythm for too many consecutive bars');
  }

  return { valid: errors.length === 0, errors };
}

const DUAL_DENSE_ACTIVITY = 6;

/**
 * V3.0 swing: ≥20% guitar rests, no long dual-density runs, bass not constant walking, bass rhythm variety.
 */
export function validateDuoSwingRhythm(score: ScoreModel): DuoLockValidationResult {
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  const errors: string[] = [];
  if (!guitar || !bass) return { valid: true, errors: [] };

  const rr = guitarRestRatio(guitar);
  if (rr < 0.2) {
    errors.push('Duo swing: guitar melody needs at least 20% rests (breathing / phrasing)');
  }

  const tb = guitar.measures.length;
  let dualRun = 0;
  let maxDual = 0;
  for (let b = 1; b <= tb; b++) {
    const ga = activityScoreForBar(guitar, b);
    const ba = activityScoreForBar(bass, b);
    if (ga >= DUAL_DENSE_ACTIVITY && ba >= DUAL_DENSE_ACTIVITY) {
      dualRun++;
      maxDual = Math.max(maxDual, dualRun);
    } else {
      dualRun = 0;
    }
  }
  if (maxDual > 2) {
    errors.push('Duo swing: both instruments dense for more than two consecutive bars');
  }

  let walkLikeBars = 0;
  for (const m of bass.measures) {
    const nNotes = m.events.filter((e) => e.kind === 'note').length;
    if (nNotes >= 5) walkLikeBars++;
  }
  if (walkLikeBars > 4) {
    errors.push('Duo swing: bass is too constant-walking (need held notes / anticipations / off-beats)');
  }

  const sortedBass = [...bass.measures].sort((a, b) => a.index - b.index);
  let prevBRh = '';
  let runBRh = 0;
  let maxBRh = 0;
  for (const m of sortedBass) {
    const rh = rhythmSig(m);
    if (rh.length > 0 && rh === prevBRh) runBRh++;
    else {
      runBRh = 1;
      prevBRh = rh;
    }
    maxBRh = Math.max(maxBRh, runBRh);
  }
  if (maxBRh > 2) {
    errors.push('Duo swing: bass rhythmic cell repeats more than two consecutive bars');
  }

  return { valid: errors.length === 0, errors };
}
