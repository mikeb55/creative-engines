/**
 * Guitar–Bass Duo LOCK quality: GCE composite, rhythm anti-loop, melodic heuristics.
 * Additive — used by behaviour gates for `guitar_bass_duo` only.
 */

import type { MeasureModel, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import { activityScoreForBar } from '../goldenPath/activityScore';
import { melodyAuthorityGceLayer } from './duoMelodyIdentityV3';
import {
  countCallResponseEvents,
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

/** V3.1 — Guitar rests in 15–45% window (conversational space; upper slack for motif variance). */
export function spaceUsageScore(restRatio: number): number {
  if (restRatio < 0.15 || restRatio > 0.45) return Math.max(0, 0.45 - Math.min(restRatio, 1 - restRatio) * 0.5);
  const mid = 0.3;
  return Math.min(1, 1 - Math.abs(restRatio - mid) / 0.15);
}

/** V3.1 — Phrase A vs B: guitar vs bass activity swap (lead vs support). */
export function roleContrastScore(score: ScoreModel): number {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const b = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!g || !b) return 0;
  const g12 = (activityScoreForBar(g, 1) + activityScoreForBar(g, 2)) / 2;
  const g34 = (activityScoreForBar(g, 3) + activityScoreForBar(g, 4)) / 2;
  const b12 = (activityScoreForBar(b, 1) + activityScoreForBar(b, 2)) / 2;
  const b34 = (activityScoreForBar(b, 3) + activityScoreForBar(b, 4)) / 2;
  const contrast = Math.abs(g12 - g34) + Math.abs(b34 - b12);
  return Math.min(1, contrast / 14);
}

/** V3.1 — Call/response density + phrase boundaries (soft). */
export function conversationalFlowScore(score: ScoreModel): number {
  const cr = countCallResponseEvents(score);
  return Math.min(1, cr / 5);
}

/**
 * V3.1 — Composite 0–1.2 layer: call/response clarity, role contrast, flow, space.
 */
export function interactionAuthorityGceLayer(score: ScoreModel): number {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) return 0;
  const restR = guitarRestRatio(g);
  const cr = countCallResponseEvents(score);
  const crN = Math.min(1, cr / 4);
  const rc = roleContrastScore(score);
  const flow = conversationalFlowScore(score);
  const space = spaceUsageScore(restR);
  return Math.min(1.2, 0.28 * crN + 0.24 * rc + 0.26 * flow + 0.22 * space + 0.1);
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
  const maLayer = melodyAuthorityGceLayer(g);
  const iaLayer = interactionAuthorityGceLayer(score);
  let s =
    2.5 * gc +
    1.55 * (1 - rr) +
    1.75 * softN +
    1.15 * Math.min(1.35, restR / 0.14) +
    0.65 * rep +
    0.95 * call +
    0.85 * (1 - Math.min(1, chrom / 7)) +
    0.55 * (1 - Math.min(1, stepwise / 12)) +
    0.38 * maLayer +
    0.38 * iaLayer;
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
  if (maxUnison > 2) {
    errors.push('Duo LOCK: guitar and bass share identical dense rhythm for more than two consecutive bars');
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
  if (rr < 0.15) {
    errors.push('Duo swing: guitar needs at least 15% rests (conversational space)');
  }
  if (rr > 0.45) {
    errors.push('Duo swing: guitar rests exceed 45% (needs more melodic presence)');
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

/** Bars where summed note durations ≥ threshold (full activity). */
export function maxConsecutiveNoteHeavyBars(part: PartModel, thresholdBeats = 3.5): number {
  const sorted = [...part.measures].sort((a, b) => a.index - b.index);
  let run = 0;
  let maxRun = 0;
  for (const m of sorted) {
    let noteBeats = 0;
    for (const e of m.events) {
      if (e.kind === 'note') noteBeats += (e as { duration: number }).duration;
    }
    if (noteBeats >= thresholdBeats) {
      run++;
      maxRun = Math.max(maxRun, run);
    } else {
      run = 0;
    }
  }
  return maxRun;
}

/**
 * V3.1 — Explicit interaction floor: call/response count, anti-streaming, role contrast.
 */
export function validateDuoInteractionAuthorityGate(score: ScoreModel): DuoLockValidationResult {
  const errors: string[] = [];
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const b = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!g || !b) return { valid: true, errors: [] };
  if (countCallResponseEvents(score) < 2) {
    errors.push('Duo interaction V3.1: need at least 2 call/response events per 8 bars');
  }
  /** Wall-to-wall sustained activity: ≥3.95 beats of notes, no meaningful breath (anti-streaming). */
  if (maxConsecutiveNoteHeavyBars(g, 3.95) > 2) {
    errors.push('Duo interaction V3.1: guitar sustained wall-to-wall activity exceeds two bars');
  }
  if (maxConsecutiveNoteHeavyBars(b, 3.95) > 2) {
    errors.push('Duo interaction V3.1: bass sustained wall-to-wall activity exceeds two bars');
  }
  if (roleContrastScore(score) < 0.06) {
    errors.push('Duo interaction V3.1: role contrast between phrase A and B is too weak');
  }
  return { valid: errors.length === 0, errors };
}
