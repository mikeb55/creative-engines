/**
 * Melodic bass line construction — phrases, contours, varied rhythm (golden path duo).
 */

import type { MeasureModel } from '../score-model/scoreModelTypes';
import { createNote, createRest, addEvent } from '../score-model/scoreEventBuilder';
import { approachFromBelow, clampPitch, seededUnit } from './guitarBassDuoHarmony';

export function qBeat(x: number): number {
  return Math.round(x * 4) / 4;
}

export type BassSectionRole = 'A' | 'B' | 'cadence';

/** Map guitar pitch into bass register sharing pitch class (motif echo). */
export function echoGuitarToBass(guitarPitch: number, walkLow: number, high: number): number {
  const pc = guitarPitch % 12;
  let p = Math.floor(walkLow / 12) * 12 + pc;
  while (p < walkLow) p += 12;
  while (p > high) p -= 12;
  return clampPitch(p, walkLow, high);
}

/** Pick octave of `pitch` nearest to `prev` to keep Barry Harris / walking line jumps ≤ ~8 st. */
function nearestRegisterToPrev(pitch: number, prev: number, walkLow: number, high: number): number {
  let p = pitch;
  for (let k = 0; k < 4; k++) {
    if (Math.abs(p - prev) <= 9) break;
    if (p > prev) p -= 12;
    else p += 12;
    p = clampPitch(p, walkLow, high);
  }
  return p;
}

/** Prefer a chord-tone echo that lands within 12 semitones of previous bass (BH gate). */
function pickEchoPitchForLine(
  prev: number | undefined,
  rawEcho: number,
  third: number,
  fifth: number,
  guide: number,
  rootClamped: number,
  walkLow: number,
  high: number
): number {
  if (prev === undefined) return rawEcho;
  const candidates = [rawEcho, third, fifth, guide, rootClamped];
  let best = rawEcho;
  let bestGap = 999;
  for (const c of candidates) {
    const n = nearestRegisterToPrev(c, prev, walkLow, high);
    const g = Math.abs(n - prev);
    if (g < bestGap) {
      bestGap = g;
      best = n;
    }
  }
  return bestGap <= 12 ? best : clampPitch(prev + Math.sign(rawEcho - prev) * 7, walkLow, high);
}

function perturbWeights(
  pieces: Array<{ w: number; pitch: number }>,
  bar: number,
  seed: number
): Array<{ w: number; pitch: number }> {
  return pieces.map((p, i) => ({
    ...p,
    w: p.w * (1 + ((bar * 3 + i * 5 + seed) % 5) * 0.12) * (1 + seededUnit(seed, bar, 500 + i) * 0.14),
  }));
}

function addWeightedPhrase(
  m: MeasureModel,
  t0: number,
  span: number,
  pieces: Array<{ w: number; pitch: number }>
): void {
  const sumW = pieces.reduce((s, p) => s + p.w, 0);
  if (sumW <= 0 || span <= 0) return;
  let t = t0;
  let acc = 0;
  for (let i = 0; i < pieces.length; i++) {
    const isLast = i === pieces.length - 1;
    const raw = isLast ? span - acc : (span * pieces[i].w) / sumW;
    const dur = qBeat(raw);
    if (dur <= 0) continue;
    addEvent(m, createNote(pieces[i].pitch, qBeat(t), dur));
    t += dur;
    acc += dur;
  }
}

export function leadPitch(
  seed: number,
  bar: number,
  third: number,
  guide: number,
  fifth: number,
  _rootClamped: number
): number {
  const u = seededUnit(seed, bar, 59);
  if (u < 0.52) return third;
  if (u < 0.86) return guide;
  return fifth;
}

/** First chronological bass attack: if it is chord root, retarget for melodic identity. */
export function scrubBassFirstAttackIfRoot(
  m: MeasureModel,
  bar: number,
  seed: number,
  rootClamped: number,
  third: number,
  guide: number,
  fifth: number,
  walkLow: number,
  effectiveHigh: number
): void {
  let bestI = -1;
  let bestT = Infinity;
  for (let i = 0; i < m.events.length; i++) {
    const e = m.events[i];
    if (e.kind !== 'note') continue;
    if (e.startBeat < bestT) {
      bestT = e.startBeat;
      bestI = i;
    }
  }
  if (bestI < 0) return;
  const n = m.events[bestI] as { pitch: number; kind: string; startBeat: number; duration: number; voice?: number };
  if (n.pitch % 12 !== rootClamped % 12) return;
  const np = clampPitch(leadPitch(seed, bar + 97, third, guide, fifth, rootClamped), walkLow, effectiveHigh);
  m.events[bestI] = { ...n, pitch: np, kind: 'note' };
}

/**
 * Emit one bar of bass: phrase contour, varied rhythm, target tones.
 */
export function emitMelodicBassBar(params: {
  m: MeasureModel;
  bar: number;
  seed: number;
  rootClamped: number;
  third: number;
  fifth: number;
  seventh: number;
  guide: number;
  walkLow: number;
  effectiveHigh: number;
  firstStart: number;
  section: BassSectionRole;
  guitarFirstPitchInBar?: number;
  /** Last bass pitch of previous bar (smooth echo / BH jumps). */
  prevBassPitch?: number;
}): void {
  const {
    m,
    bar,
    seed,
    rootClamped,
    third,
    fifth,
    seventh,
    guide,
    walkLow,
    effectiveHigh,
    firstStart,
    section,
    guitarFirstPitchInBar,
    prevBassPitch,
  } = params;

  const span = 4 - firstStart;
  if (firstStart > 0) {
    addEvent(m, createRest(0, firstStart));
  }

  const ap = approachFromBelow(rootClamped, walkLow, effectiveHigh);
  const land = seededUnit(seed, bar, 41) < 0.68 ? fifth : rootClamped;
  const lastLead = seededUnit(seed, bar, 43) < 0.58 ? fifth : rootClamped;

  const useEcho = section === 'B' && guitarFirstPitchInBar !== undefined;
  let echoPitch =
    guitarFirstPitchInBar !== undefined
      ? echoGuitarToBass(guitarFirstPitchInBar, walkLow, effectiveHigh)
      : guide;
  if (echoPitch % 12 === rootClamped % 12) {
    echoPitch = third;
  }
  if (prevBassPitch !== undefined) {
    echoPitch = pickEchoPitchForLine(prevBassPitch, echoPitch, third, fifth, guide, rootClamped, walkLow, effectiveHigh);
  }

  const u = seededUnit(seed, bar, 61);
  const rot = (bar + seed * 3) % 3;

  if (section === 'cadence') {
    const base = [
      { w: 1, pitch: ap },
      { w: 3, pitch: rootClamped },
      { w: 5, pitch: guide },
      { w: 4, pitch: land },
    ];
    addWeightedPhrase(m, firstStart, span, perturbWeights(base, bar, seed));
    return;
  }

  if (section === 'B' && useEcho) {
    const echoShape = (bar * 5 + seed * 2) % 3;
    const t0 = firstStart;
    if (echoShape === 0) {
      addEvent(m, createNote(echoPitch, t0, 1));
      addEvent(m, createNote(guide, t0 + 1, 0.75));
      addEvent(m, createNote(land, t0 + 1.75, qBeat(4 - t0 - 1.75)));
      return;
    }
    if (echoShape === 1) {
      addEvent(m, createNote(third, t0, 0.5));
      addEvent(m, createNote(echoPitch, t0 + 0.5, 1.25));
      addEvent(m, createNote(seventh, t0 + 1.75, 0.75));
      addEvent(m, createNote(land, t0 + 2.5, qBeat(4 - t0 - 2.5)));
      return;
    }
    const pat = (bar + seed + rot) % 3;
    let base: Array<{ w: number; pitch: number }>;
    if (pat === 0) {
      base = [
        { w: 1, pitch: echoPitch },
        { w: 1, pitch: guide },
        { w: 2, pitch: fifth },
        { w: 2, pitch: lastLead },
        { w: 2, pitch: land },
      ];
    } else if (pat === 1) {
      base = [
        { w: 1, pitch: third },
        { w: 1, pitch: echoPitch },
        { w: 3, pitch: seventh },
        { w: 1, pitch: guide },
        { w: 3, pitch: land },
      ];
    } else {
      base = [
        { w: 2, pitch: fifth },
        { w: 1, pitch: echoPitch },
        { w: 1, pitch: rootClamped },
        { w: 2, pitch: guide },
        { w: 2, pitch: land },
      ];
    }
    addWeightedPhrase(m, firstStart, span, perturbWeights(base, bar, seed));
    return;
  }

  if (section === 'A') {
    const lf = leadPitch(seed, bar, third, guide, fifth, rootClamped);
    let base: Array<{ w: number; pitch: number }>;
    if (u < 0.38) {
      base = [
        { w: 1, pitch: lf },
        { w: 1, pitch: fifth },
        { w: 2, pitch: guide },
        { w: 2, pitch: rootClamped },
        { w: 2, pitch: land },
      ];
    } else if (u < 0.72) {
      base = [
        { w: 1, pitch: ap },
        { w: 3, pitch: rootClamped },
        { w: 2.5, pitch: seventh },
        { w: 1, pitch: third },
        { w: 2.5, pitch: land },
      ];
    } else {
      base = [
        { w: 2.5, pitch: fifth },
        { w: 0.5, pitch: lf },
        { w: 1, pitch: guide },
        { w: 2, pitch: seventh },
        { w: 2, pitch: lastLead },
      ];
    }
    addWeightedPhrase(m, firstStart, span, perturbWeights(base, bar, seed));
    return;
  }

  const lf = leadPitch(seed, bar + 1, third, guide, fifth, rootClamped);
  const pivot = seededUnit(seed, bar, 83) < 0.5 ? third : seventh;
  const bRhythm = (bar + seed * 2) % 3;

  let base: Array<{ w: number; pitch: number }>;
  if (bRhythm === 0) {
    base = [
      { w: 1.2, pitch: ap },
      { w: 1, pitch: lf },
      { w: 2.8, pitch: fifth },
      { w: 1.1, pitch: guide },
      { w: 2.9, pitch: land },
    ];
  } else if (bRhythm === 1) {
    base = [
      { w: 1.4, pitch: fifth },
      { w: 1.2, pitch: pivot },
      { w: 1.8, pitch: seventh },
      { w: 1.3, pitch: guide },
      { w: 3.3, pitch: lastLead },
    ];
  } else if (u < 0.35) {
    base = [
      { w: 1, pitch: ap },
      { w: 1, pitch: lf },
      { w: 3, pitch: fifth },
      { w: 1, pitch: guide },
      { w: 3, pitch: land },
    ];
  } else if (u < 0.7) {
    base = [
      { w: 1, pitch: fifth },
      { w: 1, pitch: pivot },
      { w: 2, pitch: seventh },
      { w: 1, pitch: guide },
      { w: 3, pitch: lastLead },
    ];
  } else {
    base = [
      { w: 2, pitch: guide },
      { w: 1, pitch: rootClamped },
      { w: 1, pitch: ap },
      { w: 1, pitch: lf },
      { w: 3, pitch: land },
    ];
  }
  addWeightedPhrase(m, firstStart, span, perturbWeights(base, bar, seed));
}
