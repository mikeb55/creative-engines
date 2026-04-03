/**
 * Guitar–Bass Duo LOCK quality: GCE composite, rhythm anti-loop, melodic heuristics.
 * Additive — used by behaviour gates for `guitar_bass_duo` only.
 */

import type { MeasureModel, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import type { CompositionContext } from '../compositionContext';
import { activityScoreForBar } from '../goldenPath/activityScore';
import { melodyAuthorityGceLayer } from './duoMelodyIdentityV3';
import {
  countCallResponseEvents,
  guideToneCoverage,
  hasCallResponseInWindow,
  rootRatioStrongBeats,
  scoreJazzDuoBehaviourSoft,
} from './jazzDuoBehaviourValidation';
import {
  isSongModeHookFirstIdentity,
  partitionDuoIdentityIssues,
  type SongModeDuoIdentityIssue,
} from '../song-mode/songModeDuoIdentityBehaviourRules';

export interface DuoLockValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  issues: SongModeDuoIdentityIssue[];
}

function finalizeDuoLock(
  issues: SongModeDuoIdentityIssue[],
  compositionContext: CompositionContext | undefined
): DuoLockValidationResult {
  const songMode = isSongModeHookFirstIdentity(compositionContext);
  const { blocking, warnings } = partitionDuoIdentityIssues(issues, songMode);
  return {
    valid: blocking.length === 0,
    errors: blocking,
    warnings,
    issues,
  };
}

function rhythmSig(m: MeasureModel): string {
  return [...m.events]
    .filter((e) => e.kind === 'note')
    .sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat)
    .map((e) => `${(e as { startBeat: number }).startBeat}:${(e as { duration: number }).duration}`)
    .join('|');
}

/**
 * Guitar rest fraction: sum(rest durations) / sum(note + rest durations) across all voices.
 * Per measure each voice fills 4 beats; with two voices the old `rests / (measures×4)` numerator
 * summed both voices’ rests but the denominator only counted one layer — inflating ratio (~2×) and false “too sparse”.
 */
export function guitarRestRatio(guitar: PartModel): number {
  let restBeats = 0;
  let noteBeats = 0;
  for (const m of guitar.measures) {
    for (const e of m.events) {
      if (e.kind === 'rest') restBeats += (e as { duration: number }).duration;
      else if (e.kind === 'note') noteBeats += (e as { duration: number }).duration;
    }
  }
  const total = restBeats + noteBeats;
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
  const micro = Math.abs(g12 - g34) + Math.abs(b34 - b12);
  const avg = (part: typeof g, from: number, to: number) => {
    let s = 0;
    for (let i = from; i <= to; i++) s += activityScoreForBar(part, i);
    return s / (to - from + 1);
  };
  const gA = avg(g, 1, 4);
  const gB = avg(g, 5, 8);
  const bA = avg(b, 1, 4);
  const bB = avg(b, 5, 8);
  const macro = Math.abs(gA - gB) + Math.abs(bA - bB);
  const contrast = 0.45 * micro + 0.55 * macro;
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

/** Largest |Δpitch| between consecutive note attacks in a bar (time-ordered). */
export function guitarBarMaxAdjacentInterval(m: MeasureModel): number {
  const notes = [...m.events]
    .filter((e) => e.kind === 'note')
    .sort(
      (a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat
    ) as { pitch: number }[];
  if (notes.length < 2) return 0;
  let max = 0;
  for (let i = 1; i < notes.length; i++) {
    max = Math.max(max, Math.abs(notes[i].pitch - notes[i - 1].pitch));
  }
  return max;
}

/** V3.2: bar 7 max adjacent leap must be ≥ bar 6 (used when picking among multi-seed golden-path variants). */
export function duoGuitarBarSevenIntervalPeakVsBarSixOk(score: ScoreModel): boolean {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) return true;
  const m6 = g.measures.find((x) => x.index === 6);
  const m7 = g.measures.find((x) => x.index === 7);
  if (!m6 || !m7) return true;
  return guitarBarMaxAdjacentInterval(m7) >= guitarBarMaxAdjacentInterval(m6);
}

function maxNoteDurationInBar(m: MeasureModel): number {
  let max = 0;
  for (const e of m.events) {
    if (e.kind === 'note') max = Math.max(max, (e as { duration: number }).duration);
  }
  return max;
}

function syncopationStrengthBar(m: MeasureModel): number {
  let s = 0;
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    const sb = (e as { startBeat: number }).startBeat;
    const frac = sb % 1;
    if (sb > 0.15 && frac > 0.15 && frac < 0.85) s += 0.35;
  }
  return Math.min(1, s);
}

function barDistinctivenessRaw(gm: MeasureModel, bar: number): number {
  const maxIv = guitarBarMaxAdjacentInterval(gm);
  const maxDur = maxNoteDurationInBar(gm);
  const sync = syncopationStrengthBar(gm);
  const nNotes = gm.events.filter((e) => e.kind === 'note').length;
  return (
    maxIv * 0.11 +
    maxDur * 1.75 +
    sync * 2.1 +
    (nNotes >= 3 ? 0.45 : 0) +
    (bar === 7 ? 6.25 : 0)
  );
}

/** Heuristic: which 1–8 bar has the strongest “signature” profile (bar 7 structurally favoured). */
export function distinctiveGuitarBarIndex(guitar: PartModel): number {
  let best = 1;
  let bestS = -1;
  for (let bar = 1; bar <= 8; bar++) {
    const m = guitar.measures.find((x) => x.index === bar);
    if (!m) continue;
    const s = barDistinctivenessRaw(m, bar);
    if (s > bestS) {
      bestS = s;
      best = bar;
    }
  }
  return best;
}

/**
 * V3.2 — 0–10 identity moment: bar 7 peak, contrast vs 6/8, bass non-mirror.
 */
export function computeDuoIdentityMomentScore(score: ScoreModel): number {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const b = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!g || !b) return 0;
  const m6 = g.measures.find((x) => x.index === 6);
  const m7 = g.measures.find((x) => x.index === 7);
  const m8 = g.measures.find((x) => x.index === 8);
  const b7 = b.measures.find((x) => x.index === 7);
  if (!m7 || !m8) return 0;
  let s = 0;
  s += Math.min(2.8, guitarBarMaxAdjacentInterval(m7) / 3.2);
  s += Math.min(2.2, maxNoteDurationInBar(m7) * 1.05);
  s += syncopationStrengthBar(m7) * 1.1;
  if (m6) s += rhythmSig(m7) !== rhythmSig(m6) ? 1.5 : 0;
  s += rhythmSig(m7) !== rhythmSig(m8) ? 1.5 : 0;
  if (b7) {
    const gRh = rhythmSig(m7);
    const bRh = rhythmSig(b7);
    if (gRh !== bRh || gRh.split('|').length < 3) s += 1.3;
    else s += 0.25;
  }
  const a7 = activityScoreForBar(g, 7);
  const a8 = activityScoreForBar(g, 8);
  if (a7 > a8 + 0.05) s += 0.9;
  return Math.min(10, s * 1.08 + 0.95);
}

/** V3.2 — 0–1.2 layer for composite GCE. */
export function identityMomentGceLayer(score: ScoreModel): number {
  return Math.min(1.2, (computeDuoIdentityMomentScore(score) / 10) * 1.18);
}

function guitarBarRestBeats(m: MeasureModel): number {
  let r = 0;
  for (const e of m.events) {
    if (e.kind === 'rest') r += (e as { duration: number }).duration;
  }
  return r;
}

export function firstGuitarAttackInBar(m: MeasureModel): number | undefined {
  const notes = [...m.events]
    .filter((e) => e.kind === 'note')
    .sort(
      (a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat
    );
  if (!notes.length) return undefined;
  return (notes[0] as { startBeat: number }).startBeat;
}

function lastGuitarNoteEndInBar(m: MeasureModel): number | undefined {
  let best = -1;
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    const n = e as { startBeat: number; duration: number };
    best = Math.max(best, n.startBeat + n.duration);
  }
  return best < 0 ? undefined : best;
}

/** Bar resolves after meaningful rest (delayed resolution / across-the-barline feel in 4/4 slice). */
export function barHasDelayedResolutionGesture(m: MeasureModel): boolean {
  const notes = [...m.events]
    .filter((e) => e.kind === 'note')
    .sort(
      (a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat
    );
  if (notes.length === 0) return false;
  const first = (notes[0] as { startBeat: number }).startBeat;
  const last = notes[notes.length - 1] as { startBeat: number; duration: number };
  const lastEnd = last.startBeat + last.duration;
  if (first >= 1.0 && lastEnd >= 3.35) return true;
  if (first >= 1.5) return true;
  return false;
}

/**
 * V3.3 — Phrasing polish: asymmetry, delayed resolution, attack variety, restraint; penalise mirror phrases.
 */
export function computeDuoPolishV33Score(score: ScoreModel): number {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) return 0;
  const attacks: number[] = [];
  let asymmetryHits = 0;
  let delayedBars = 0;
  let totalNotes = 0;
  let overResolvedBars = 0;

  for (let bar = 1; bar <= 8; bar++) {
    const m = g.measures.find((x) => x.index === bar);
    if (!m) continue;
    const fa = firstGuitarAttackInBar(m);
    const le = lastGuitarNoteEndInBar(m);
    if (fa !== undefined) attacks.push(fa);
    totalNotes += m.events.filter((e) => e.kind === 'note').length;
    if (fa !== undefined && fa >= 0.62) asymmetryHits++;
    if (fa !== undefined && le !== undefined && le <= 3.15) asymmetryHits++;
    if (barHasDelayedResolutionGesture(m)) delayedBars++;

    let bestEnd = -1;
    let bestStart = 0;
    let bestDur = 0;
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const n = e as { startBeat: number; duration: number };
      const end = n.startBeat + n.duration;
      if (end > bestEnd) {
        bestEnd = end;
        bestStart = n.startBeat;
        bestDur = n.duration;
      }
    }
    if (bestEnd >= 0 && bestStart <= 0.85 && bestDur >= 2.25) overResolvedBars++;
  }

  let s = 0;
  const spread = attacks.length >= 2 ? Math.max(...attacks) - Math.min(...attacks) : 0;
  s += Math.min(2.9, spread * 3.1);
  s += Math.min(2.4, asymmetryHits * 0.48);
  s += Math.min(2.4, delayedBars * 1.0);

  const uniq = new Set(attacks.map((a) => Math.round(a * 4) / 4));
  s += Math.min(1.5, Math.max(0, uniq.size - 2) * 0.32);

  if (totalNotes <= 32) s += 1.15;
  else if (totalNotes <= 36) s += 0.7;
  else if (totalNotes <= 40) s += 0.35;
  else s -= 0.75;

  const a4 = attacks.slice(0, 4);
  const b4 = attacks.slice(4);
  const meanA = a4.length ? a4.reduce((x, y) => x + y, 0) / a4.length : 0;
  const meanB = b4.length ? b4.reduce((x, y) => x + y, 0) / b4.length : 0;
  if (attacks.length >= 6 && Math.abs(meanA - meanB) < 0.14 && spread < 0.42) s -= 1.65;

  if (overResolvedBars >= 5) s -= 1.1;

  const m7 = g.measures.find((x) => x.index === 7);
  if (m7) {
    const rb = guitarBarRestBeats(m7);
    const nc = m7.events.filter((e) => e.kind === 'note').length;
    if (rb >= 0.45 && nc <= 4) s += 1.05;
  }

  return Math.min(10, Math.max(0, s * 1.04 + 0.45));
}

/** V3.3 — 0–1.2 layer: inevitability / restraint (score-only). */
export function polishV33GceLayer(score: ScoreModel): number {
  return Math.min(1.2, (computeDuoPolishV33Score(score) / 10) * 1.15);
}

/**
 * Composite 0–10 “GCE-style” score: melody memorability, motif-like intervals, bass clarity, interaction.
 * V3.3 adds polish layer (asymmetry, delayed resolution, restraint).
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
  const idLayer = identityMomentGceLayer(score);
  const p33Layer = polishV33GceLayer(score);
  let s =
    2.45 * gc +
    1.52 * (1 - rr) +
    1.72 * softN +
    1.12 * Math.min(1.35, restR / 0.14) +
    0.62 * rep +
    0.92 * call +
    0.82 * (1 - Math.min(1, chrom / 7)) +
    0.52 * (1 - Math.min(1, stepwise / 12)) +
    0.32 * maLayer +
    0.3 * iaLayer +
    0.28 * idLayer +
    0.3 * p33Layer;
  s = Math.min(10, s * 1.38 + 0.62);
  return Math.round(Math.max(0, s) * 10) / 10;
}

const DUO_GCE_FLOOR = 9.0;

function duoGceFloorForForm(effectiveFormBars: number | undefined): number {
  if (effectiveFormBars === undefined) return DUO_GCE_FLOOR;
  if (effectiveFormBars >= 32) return 8.25;
  if (effectiveFormBars >= 16) return 8.55;
  return DUO_GCE_FLOOR;
}

export function validateDuoGceHardGate(
  score: ScoreModel,
  opts?: { compositionContext?: CompositionContext; effectiveFormBars?: number }
): DuoLockValidationResult {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const b = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!g || !b) return finalizeDuoLock([], opts?.compositionContext);
  const gce = computeDuoGceScore(score);
  const floor = duoGceFloorForForm(opts?.effectiveFormBars);
  if (gce < floor) {
    return finalizeDuoLock(
      [
        {
          ruleId: 'lock_gce_floor',
          message: `Duo LOCK: GCE ${gce.toFixed(1)} < ${floor} (V3.3 polish, motif, interaction, bass clarity)`,
        },
      ],
      opts?.compositionContext
    );
  }
  return finalizeDuoLock([], opts?.compositionContext);
}

/**
 * V3.3 — Soft gate: minimum phrasing polish (asymmetry / timing / restraint signals).
 */
function polishMinScore(effectiveFormBars: number | undefined): number {
  if (effectiveFormBars === undefined) return 7.2;
  if (effectiveFormBars >= 32) return 6.45;
  if (effectiveFormBars >= 16) return 6.75;
  return 7.2;
}

export function validateDuoPolishV33Gate(
  score: ScoreModel,
  opts?: { compositionContext?: CompositionContext; effectiveFormBars?: number }
): DuoLockValidationResult {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) return finalizeDuoLock([], opts?.compositionContext);
  const issues: SongModeDuoIdentityIssue[] = [];
  const p = computeDuoPolishV33Score(score);
  const minP = polishMinScore(opts?.effectiveFormBars);
  if (p < minP) {
    issues.push({
      ruleId: 'lock_polish_score_low',
      message: `Duo polish V3.3: phrasing score ${p.toFixed(1)} < ${minP.toFixed(2)} (asymmetry / resolution / restraint)`,
    });
  }
  const attacks: number[] = [];
  for (let bar = 1; bar <= 8; bar++) {
    const m = g.measures.find((x) => x.index === bar);
    if (!m) continue;
    const fa = firstGuitarAttackInBar(m);
    if (fa !== undefined) attacks.push(fa);
  }
  const spread = attacks.length >= 2 ? Math.max(...attacks) - Math.min(...attacks) : 0;
  let delayed = 0;
  for (let bar = 1; bar <= 8; bar++) {
    const m = g.measures.find((x) => x.index === bar);
    if (m && barHasDelayedResolutionGesture(m)) delayed++;
  }
  const longForm = (opts?.effectiveFormBars ?? 8) >= 16;
  if (!longForm && spread < 0.28 && delayed === 0) {
    issues.push({
      ruleId: 'lock_polish_too_square',
      message: 'Duo polish V3.3: phrasing too square (need late entry, early cut, or delayed resolution)',
    });
  }
  return finalizeDuoLock(issues, opts?.compositionContext);
}

/** V3.3 — max − min first-attack onset across bars (asymmetry proxy). */
export function guitarPhraseOnsetSpread(guitar: PartModel): number {
  const attacks: number[] = [];
  for (let bar = 1; bar <= 8; bar++) {
    const m = guitar.measures.find((x) => x.index === bar);
    if (!m) continue;
    const fa = firstGuitarAttackInBar(m);
    if (fa !== undefined) attacks.push(fa);
  }
  return attacks.length >= 2 ? Math.max(...attacks) - Math.min(...attacks) : 0;
}

/** V3.3 — bars with delayed-resolution gesture. */
export function countDelayedResolutionBars(guitar: PartModel): number {
  let n = 0;
  for (let bar = 1; bar <= 8; bar++) {
    const m = guitar.measures.find((x) => x.index === bar);
    if (m && barHasDelayedResolutionGesture(m)) n++;
  }
  return n;
}

/** Guitar rhythm loop + rest window + unison rhythm with bass (duo-specific). */
export function validateDuoRhythmAntiLoop(
  score: ScoreModel,
  opts?: { compositionContext?: CompositionContext; effectiveFormBars?: number }
): DuoLockValidationResult {
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  const issues: SongModeDuoIdentityIssue[] = [];
  if (!guitar || !bass) return finalizeDuoLock([], opts?.compositionContext);

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
  const maxRhAllowed = (opts?.effectiveFormBars ?? 8) >= 16 ? 3 : 2;
  if (maxRh > maxRhAllowed) {
    issues.push({
      ruleId: 'lock_rhythm_cell_repeat',
      message: `Duo LOCK: identical guitar rhythmic cell repeats >${maxRhAllowed} consecutive bars`,
    });
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
  const maxUniAllowed = (opts?.effectiveFormBars ?? 8) >= 16 ? 3 : 2;
  if (maxUnison > maxUniAllowed) {
    issues.push({
      ruleId: 'lock_unison_dense_rhythm',
      message: `Duo LOCK: guitar and bass share identical dense rhythm for more than ${maxUniAllowed} consecutive bars`,
    });
  }

  return finalizeDuoLock(issues, opts?.compositionContext);
}

const DUAL_DENSE_ACTIVITY = 6;

/**
 * V3.0 swing: ≥20% guitar rests, no long dual-density runs, bass not constant walking, bass rhythm variety.
 */
export function validateDuoSwingRhythm(
  score: ScoreModel,
  opts?: { compositionContext?: CompositionContext; effectiveFormBars?: number }
): DuoLockValidationResult {
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  const issues: SongModeDuoIdentityIssue[] = [];
  if (!guitar || !bass) return finalizeDuoLock([], opts?.compositionContext);

  const rr = guitarRestRatio(guitar);
  if (rr < 0.15) {
    issues.push({
      ruleId: 'swing_guitar_rests_too_low',
      message: 'Duo swing: guitar needs at least 15% rests (conversational space)',
    });
  }
  if (rr > 0.45) {
    issues.push({
      ruleId: 'swing_guitar_rests_too_high',
      message: 'Duo swing: guitar rests exceed 45% (needs more melodic presence)',
    });
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
  const longFormSwing = (opts?.effectiveFormBars ?? 8) >= 16;
  const maxDualAllowed = longFormSwing ? 3 : 2;
  if (maxDual > maxDualAllowed) {
    issues.push({
      ruleId: 'swing_dual_dense_run',
      message: `Duo swing: both instruments dense for more than ${maxDualAllowed} consecutive bars`,
    });
  }

  let walkLikeBars = 0;
  for (const m of bass.measures) {
    const nNotes = m.events.filter((e) => e.kind === 'note').length;
    if (nNotes >= 5) walkLikeBars++;
  }
  const walkCap = longFormSwing ? 6 : 4;
  if (walkLikeBars > walkCap) {
    issues.push({
      ruleId: 'swing_bass_constant_walking',
      message: 'Duo swing: bass is too constant-walking (need held notes / anticipations / off-beats)',
    });
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
  const maxBassRhAllowed = longFormSwing ? 3 : 2;
  if (maxBRh > maxBassRhAllowed) {
    issues.push({
      ruleId: 'swing_bass_rhythm_cell_repeat',
      message: `Duo swing: bass rhythmic cell repeats more than ${maxBassRhAllowed} consecutive bars`,
    });
  }

  return finalizeDuoLock(issues, opts?.compositionContext);
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
export function validateDuoInteractionAuthorityGate(
  score: ScoreModel,
  opts?: { compositionContext?: CompositionContext }
): DuoLockValidationResult {
  const issues: SongModeDuoIdentityIssue[] = [];
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const b = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!g || !b) return finalizeDuoLock([], opts?.compositionContext);
  if (countCallResponseEvents(score) < 2) {
    issues.push({
      ruleId: 'ix_call_response_events',
      message: 'Duo interaction V3.1: need at least 2 call/response events per 8 bars',
    });
  }
  /** Wall-to-wall sustained activity: ≥3.95 beats of notes, no meaningful breath (anti-streaming). */
  if (maxConsecutiveNoteHeavyBars(g, 3.95) > 2) {
    issues.push({
      ruleId: 'ix_guitar_wall_to_wall',
      message: 'Duo interaction V3.1: guitar sustained wall-to-wall activity exceeds two bars',
    });
  }
  if (maxConsecutiveNoteHeavyBars(b, 3.95) > 2) {
    issues.push({
      ruleId: 'ix_bass_wall_to_wall',
      message: 'Duo interaction V3.1: bass sustained wall-to-wall activity exceeds two bars',
    });
  }
  if (roleContrastScore(score) < 0.06) {
    issues.push({
      ruleId: 'ix_role_contrast_weak',
      message: 'Duo interaction V3.1: role contrast between phrase A and B is too weak',
    });
  }
  return finalizeDuoLock(issues, opts?.compositionContext);
}

/**
 * V3.2 — Bar 7 identity moment: score floor, distinctiveness peak, contrast vs bars 6 & 8.
 */
export function validateDuoIdentityMomentGate(
  score: ScoreModel,
  opts?: { compositionContext?: CompositionContext }
): DuoLockValidationResult {
  const issues: SongModeDuoIdentityIssue[] = [];
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const b = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!g || !b) return finalizeDuoLock([], opts?.compositionContext);
  const id = computeDuoIdentityMomentScore(score);
  if (id < 8.5) {
    issues.push({
      ruleId: 'id_moment_score_low',
      message: `Duo identity V3.2: identity moment score ${id.toFixed(1)} < 8.5`,
    });
  }
  if (distinctiveGuitarBarIndex(g) !== 7) {
    issues.push({
      ruleId: 'id_bar7_not_most_distinctive',
      message: 'Duo identity V3.2: bar 7 is not the most distinctive guitar bar',
    });
  }
  const m6 = g.measures.find((x) => x.index === 6);
  const m7 = g.measures.find((x) => x.index === 7);
  const m8 = g.measures.find((x) => x.index === 8);
  const b7 = b.measures.find((x) => x.index === 7);
  if (m7 && m6 && rhythmSig(m7) === rhythmSig(m6)) {
    issues.push({
      ruleId: 'id_bar7_rhythm_same_as_bar6',
      message: 'Duo identity V3.2: bar 7 rhythm must differ from bar 6',
    });
  }
  if (m7 && m8 && rhythmSig(m7) === rhythmSig(m8)) {
    issues.push({
      ruleId: 'id_bar7_rhythm_same_as_bar8',
      message: 'Duo identity V3.2: bar 7 rhythm must differ from bar 8',
    });
  }
  if (m7 && b7) {
    const gr = rhythmSig(m7);
    const br = rhythmSig(b7);
    if (gr.length > 0 && gr === br && gr.split('|').length >= 3) {
      issues.push({
        ruleId: 'id_bass_mirrors_guitar_bar7',
        message: 'Duo identity V3.2: bass mirrors guitar rhythm on bar 7',
      });
    }
  }
  return finalizeDuoLock(issues, opts?.compositionContext);
}
