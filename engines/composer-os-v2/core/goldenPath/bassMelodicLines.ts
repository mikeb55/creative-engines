/**
 * Melodic bass line construction — phrases, contours, varied rhythm (golden path duo).
 */

import type { MeasureModel } from '../score-model/scoreModelTypes';
import { createNote, createRest, addEvent } from '../score-model/scoreEventBuilder';
import { approachFromBelow, clampPitch, seededUnit } from './guitarBassDuoHarmony';

export type DuoSwingBassMode = 'hold' | 'anticipate' | 'offbeat';

/**
 * Non-walking bass: held tones, anticipations, off-beat entries (duo swing identity).
 */
export function emitDuoSwingBassBar(params: {
  m: MeasureModel;
  mode: DuoSwingBassMode;
  rootClamped: number;
  third: number;
  fifth: number;
  guide: number;
  walkLow: number;
  effectiveHigh: number;
  firstStart: number;
  seed: number;
  bar: number;
}): void {
  const { m, mode, rootClamped, third, fifth, guide, firstStart, seed, bar, walkLow, effectiveHigh } = params;
  const span = 4 - firstStart;
  if (firstStart > 0) addEvent(m, createRest(0, firstStart));
  const t0 = firstStart;
  if (mode === 'hold') {
    const p1 = seededUnit(seed, bar, 901) < 0.55 ? clampPitch(guide, walkLow, effectiveHigh) : rootClamped;
    const dur = qBeat(Math.min(3.5, span));
    addEvent(m, createNote(p1, t0, dur));
    if (span - dur > 0.2) addEvent(m, createRest(t0 + dur, qBeat(span - dur)));
    return;
  }
  if (mode === 'anticipate') {
    const restLen = qBeat(Math.max(0.5, Math.min(3.25, span - 0.5)));
    addEvent(m, createRest(t0, restLen));
    const hit = qBeat(t0 + restLen);
    const target = seededUnit(seed, bar, 902) < 0.5 ? fifth : third;
    addEvent(m, createNote(clampPitch(target, walkLow, effectiveHigh), hit, qBeat(4 - hit)));
    return;
  }
  addEvent(m, createRest(t0, 0.5));
  addEvent(m, createNote(third, t0 + 0.5, 1));
  addEvent(m, createNote(guide, t0 + 1.5, 1));
  addEvent(m, createNote(fifth, t0 + 2.5, qBeat(Math.max(0.25, 4 - t0 - 2.5))));
}

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
  effectiveHigh: number,
  opts?: { slashBassPitch?: number }
): void {
  if (opts?.slashBassPitch !== undefined) return;
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
function applyGuideToneWeightBias(
  pieces: Array<{ w: number; pitch: number }>,
  rootClamped: number,
  third: number,
  seventh: number,
  guide: number,
  bias: number
): Array<{ w: number; pitch: number }> {
  const rp = rootClamped % 12;
  const tp = third % 12;
  const sp = seventh % 12;
  const gp = guide % 12;
  return pieces.map((p) => {
    const pc = p.pitch % 12;
    let w = p.w;
    if (pc === tp || pc === sp || pc === gp) w *= bias;
    else if (pc === rp) w /= bias * 0.88;
    return { ...p, w };
  });
}

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
  /** Guitar is hot this bar — favour guide tones / fewer roots on strong beats (soft weighting). */
  guitarActivityHot?: boolean;
  /** Multiplier on 3rd/7th/guide vs root (default 1). */
  guideToneBias?: number;
  /** Slash-bass target (strong anchor); line roots favour this over chord root when set. */
  slashBassPitch?: number;
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
    guitarActivityHot,
    guideToneBias,
    slashBassPitch,
  } = params;
  const gtBias = (guideToneBias ?? 1) * (guitarActivityHot ? 1.12 : 1);
  const rootForLine =
    slashBassPitch !== undefined
      ? clampPitch(slashBassPitch, walkLow, effectiveHigh)
      : rootClamped;

  const span = 4 - firstStart;
  if (firstStart > 0) {
    addEvent(m, createRest(0, firstStart));
  }

  const ap = approachFromBelow(rootForLine, walkLow, effectiveHigh);
  const land = seededUnit(seed, bar, 41) < 0.68 ? fifth : rootForLine;
  const lastLead = seededUnit(seed, bar, 43) < 0.58 ? fifth : rootForLine;

  const biasPieces = (base: Array<{ w: number; pitch: number }>) =>
    applyGuideToneWeightBias(base, rootForLine, third, seventh, guide, gtBias);

  const useEcho = section === 'B' && guitarFirstPitchInBar !== undefined;
  let echoPitch =
    guitarFirstPitchInBar !== undefined
      ? echoGuitarToBass(guitarFirstPitchInBar, walkLow, effectiveHigh)
      : guide;
  if (echoPitch % 12 === rootForLine % 12) {
    echoPitch = third;
  }
  if (prevBassPitch !== undefined) {
    echoPitch = pickEchoPitchForLine(prevBassPitch, echoPitch, third, fifth, guide, rootForLine, walkLow, effectiveHigh);
  }

  const u = seededUnit(seed, bar, 61);
  const rot = (bar + seed * 3) % 3;

  if (section === 'cadence') {
    const base = biasPieces([
      { w: bar % 2 === 0 ? 1.25 : 1, pitch: ap },
      { w: 3, pitch: rootForLine },
      { w: 5, pitch: guide },
      { w: 4, pitch: land },
    ]);
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
        { w: 1, pitch: rootForLine },
        { w: 2, pitch: guide },
        { w: 2, pitch: land },
      ];
    }
    addWeightedPhrase(m, firstStart, span, perturbWeights(biasPieces(base), bar, seed));
    return;
  }

  if (section === 'A') {
    const lf = leadPitch(seed, bar, third, guide, fifth, rootClamped);
    let base: Array<{ w: number; pitch: number }>;
    if (u < 0.38) {
      base = biasPieces([
        { w: 1, pitch: lf },
        { w: 1, pitch: fifth },
        { w: 2, pitch: guide },
        { w: 2, pitch: rootForLine },
        { w: 2, pitch: land },
      ]);
    } else if (u < 0.72) {
      base = biasPieces([
        { w: bar % 2 === 0 ? 1.2 : 1, pitch: ap },
        { w: 3, pitch: rootForLine },
        { w: 2.5, pitch: seventh },
        { w: 1, pitch: third },
        { w: 2.5, pitch: land },
      ]);
    } else {
      base = biasPieces([
        { w: 2.5, pitch: fifth },
        { w: 0.5, pitch: lf },
        { w: 1, pitch: guide },
        { w: 2, pitch: seventh },
        { w: 2, pitch: lastLead },
      ]);
    }
    addWeightedPhrase(m, firstStart, span, perturbWeights(base, bar, seed));
    return;
  }

  const lf = leadPitch(seed, bar + 1, third, guide, fifth, rootClamped);
  const pivot = seededUnit(seed, bar, 83) < 0.5 ? third : seventh;
  const bRhythm = (bar + seed * 2) % 3;

  let base: Array<{ w: number; pitch: number }>;
  if (bRhythm === 0) {
    base = biasPieces([
      { w: bar % 2 === 0 ? 1.25 : 1.2, pitch: ap },
      { w: 1, pitch: lf },
      { w: 2.8, pitch: fifth },
      { w: 1.1, pitch: guide },
      { w: 2.9, pitch: land },
    ]);
  } else if (bRhythm === 1) {
    base = biasPieces([
      { w: 1.4, pitch: fifth },
      { w: 1.2, pitch: pivot },
      { w: 1.8, pitch: seventh },
      { w: 1.3, pitch: guide },
      { w: 3.3, pitch: lastLead },
    ]);
  } else if (u < 0.35) {
    base = biasPieces([
      { w: bar % 2 === 0 ? 1.15 : 1, pitch: ap },
      { w: 1, pitch: lf },
      { w: 3, pitch: fifth },
      { w: 1, pitch: guide },
      { w: 3, pitch: land },
    ]);
  } else if (u < 0.7) {
    base = biasPieces([
      { w: 1, pitch: fifth },
      { w: 1, pitch: pivot },
      { w: 2, pitch: seventh },
      { w: 1, pitch: guide },
      { w: 3, pitch: lastLead },
    ]);
  } else {
    base = biasPieces([
      { w: 2, pitch: guide },
      { w: 1, pitch: rootForLine },
      { w: bar % 2 === 0 ? 1.15 : 1, pitch: ap },
      { w: 1, pitch: lf },
      { w: 3, pitch: land },
    ]);
  }
  addWeightedPhrase(m, firstStart, span, perturbWeights(base, bar, seed));
}

/**
 * V3.1 — Bass authority (bars 3–4): longer tones, at least one leap, not a walking line (≤3 attacks).
 */
export function emitDuoBassAuthorityMomentBar(params: {
  m: MeasureModel;
  rootClamped: number;
  third: number;
  fifth: number;
  seventh: number;
  guide: number;
  walkLow: number;
  effectiveHigh: number;
  firstStart: number;
  seed: number;
  bar: number;
  slashBassPitch?: number;
}): void {
  const { m, rootClamped, third, fifth, seventh, guide, walkLow, effectiveHigh, firstStart, seed, bar, slashBassPitch } =
    params;
  const t0 = qBeat(firstStart);
  if (t0 > 0) addEvent(m, createRest(0, t0));
  const span = qBeat(4 - t0);
  const p1 = slashBassPitch !== undefined ? clampPitch(slashBassPitch, walkLow, effectiveHigh) : clampPitch(third, walkLow, effectiveHigh);
  const pLeap = clampPitch(seventh, walkLow, effectiveHigh);
  const pAlt = clampPitch(fifth, walkLow, effectiveHigh);
  const pat = (seed + bar * 7) % 2;
  if (pat === 0) {
    const d1 = qBeat(Math.min(2.5, span * 0.62));
    addEvent(m, createNote(p1, t0, d1));
    const rem = qBeat(span - d1);
    if (rem > 0.3) {
      const p2 = Math.abs(pLeap - p1) >= 4 ? pLeap : pAlt;
      addEvent(m, createNote(p2, t0 + d1, rem));
    }
  } else {
    const pLow =
      slashBassPitch !== undefined
        ? clampPitch(slashBassPitch, walkLow, effectiveHigh)
        : clampPitch(rootClamped, walkLow, effectiveHigh);
    const d1 = qBeat(Math.min(1.75, span * 0.48));
    addEvent(m, createNote(pLow, t0, d1));
    const p2 = Math.abs(guide - pLow) >= 5 ? guide : pLeap;
    const d2 = qBeat(span - d1);
    if (d2 > 0.25) addEvent(m, createNote(clampPitch(p2, walkLow, effectiveHigh), t0 + d1, d2));
  }
}

/**
 * V3.2 — Bar 7: support (held / minimal) OR contrast (active under guitar); never mirror guitar rhythm.
 */
export function emitDuoBassIdentityBar7(params: {
  m: MeasureModel;
  supportMode: boolean;
  rootClamped: number;
  third: number;
  fifth: number;
  guide: number;
  walkLow: number;
  effectiveHigh: number;
  firstStart: number;
  seed: number;
  bar: number;
  slashBassPitch?: number;
}): void {
  const {
    m,
    supportMode,
    rootClamped,
    third,
    fifth,
    guide,
    walkLow,
    effectiveHigh,
    firstStart,
    seed,
    bar,
    slashBassPitch,
  } = params;
  const anchor = slashBassPitch !== undefined ? slashBassPitch : rootClamped;
  const t0 = qBeat(firstStart);
  if (t0 > 0) addEvent(m, createRest(0, t0));
  const span = qBeat(4 - t0);
  if (supportMode) {
    const p1 = clampPitch(anchor, walkLow, effectiveHigh);
    const d1 = qBeat(Math.min(3, span * 0.7));
    addEvent(m, createNote(p1, t0, d1));
    const rem = qBeat(span - d1);
    if (rem > 0.35) {
      addEvent(m, createNote(clampPitch(fifth, walkLow, effectiveHigh), t0 + d1, rem));
    }
  } else {
    const u = seededUnit(seed, bar, 808);
    const pA = u < 0.5 ? third : guide;
    const dA = qBeat(Math.min(1, span * 0.35));
    addEvent(m, createNote(clampPitch(pA, walkLow, effectiveHigh), t0, dA));
    const dB = qBeat(Math.min(0.75, (span - dA) * 0.45));
    addEvent(m, createNote(clampPitch(fifth, walkLow, effectiveHigh), t0 + dA, dB));
    const rem = qBeat(span - dA - dB);
    if (rem > 0.3) {
      addEvent(m, createNote(clampPitch(rootClamped, walkLow, effectiveHigh), t0 + dA + dB, rem));
    }
  }
}
