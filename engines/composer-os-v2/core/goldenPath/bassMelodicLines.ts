/**
 * Melodic bass line construction — phrases, contours, varied rhythm (golden path duo).
 */

import type { MeasureModel } from '../score-model/scoreModelTypes';
import { createNote, createRest, addEvent } from '../score-model/scoreEventBuilder';
import { approachFromBelow, clampPitch, seededUnit } from './guitarBassDuoHarmony';
import { contourFingerprint } from './bassLineFingerprints';

/** 2-bar phrase expressive role — avoids default quarter/eighth “walking” sameness. */
export type DuoPhraseBehaviourMode = 'stepwise' | 'leap' | 'rhythmic' | 'pedal';

const DUO_MODE_ORDER: DuoPhraseBehaviourMode[] = ['stepwise', 'leap', 'rhythmic', 'pedal'];

/**
 * Deterministic mode per phrase pair; last three *completed* phrase modes avoided (no immediate repeats).
 */
export function duoPhraseModeForPairIndex(
  seed: number,
  pairIndex: number,
  recentCompleted: DuoPhraseBehaviourMode[]
): DuoPhraseBehaviourMode {
  const h = (seed * 2654435761 + pairIndex * 97531) >>> 0;
  for (let attempt = 0; attempt < 8; attempt++) {
    const cand = DUO_MODE_ORDER[(h + attempt) % 4];
    if (!recentCompleted.slice(-3).includes(cand)) return cand;
  }
  return DUO_MODE_ORDER[(pairIndex + (h % 4)) % 4];
}

/** Detects dense even-eighth streams (walking cliche) for max-2-bar caps. */
export function measureIsDenseEvenEighthWalk(m: MeasureModel): boolean {
  const notes = m.events.filter((e) => e.kind === 'note') as { startBeat: number; duration: number }[];
  if (notes.length < 5) return false;
  for (const n of notes) {
    if (Math.abs(n.duration - 0.5) > 0.09) return false;
  }
  const sorted = [...notes].sort((a, b) => a.startBeat - b.startBeat);
  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i]!.startBeat - sorted[i - 1]!.startBeat - 0.5) > 0.09) return false;
  }
  return true;
}

/**
 * Duo “simplified” bars: one explicit behaviour per 2-bar phrase (pedal / leap / syncope / step melody).
 */
export function emitDuoPhraseModeBar(params: {
  m: MeasureModel;
  mode: DuoPhraseBehaviourMode;
  t0: number;
  span: number;
  seed: number;
  bar: number;
  walkLow: number;
  effectiveHigh: number;
  rootClamped: number;
  third: number;
  fifth: number;
  seventh: number;
  guide: number;
  slashBassPitch?: number;
  phraseRetryAttempt: number;
}): void {
  const {
    m,
    mode,
    t0,
    span,
    seed,
    bar,
    walkLow,
    effectiveHigh,
    rootClamped,
    third,
    fifth,
    seventh,
    guide,
    slashBassPitch,
    phraseRetryAttempt,
  } = params;
  const r0 = slashBassPitch !== undefined ? clampPitch(slashBassPitch, walkLow, effectiveHigh) : rootClamped;
  const t = qBeat(t0);
  if (t > 0) addEvent(m, createRest(0, t));
  const sp = qBeat(4 - t);
  if (sp <= EPS) return;
  const rot = phraseRetryAttempt % 3;

  if (mode === 'pedal') {
    const pAnchor = seededUnit(seed, bar, 920) < 0.45 ? clampPitch(guide, walkLow, effectiveHigh) : r0;
    const dur1 = qBeat(Math.min(2.75, sp * (0.62 + seededUnit(seed, bar, 921) * 0.12)));
    addEvent(m, createNote(pAnchor, t, dur1));
    const rem = qBeat(sp - dur1);
    if (rem > 0.3) {
      const p2 =
        seededUnit(seed, bar, 922) < 0.5 ? clampPitch(fifth, walkLow, effectiveHigh) : clampPitch(third, walkLow, effectiveHigh);
      addEvent(m, createNote(p2, t + dur1, rem));
    }
    return;
  }

  if (mode === 'leap') {
    const p1 =
      seededUnit(seed, bar, 930 + rot) < 0.55 ? clampPitch(third, walkLow, effectiveHigh) : r0;
    const leapTarget =
      seededUnit(seed, bar, 931) < 0.5 ? clampPitch(fifth, walkLow, effectiveHigh) : clampPitch(seventh, walkLow, effectiveHigh);
    let p2 =
      Math.abs(leapTarget - p1) >= 4 ? leapTarget : clampPitch(seventh, walkLow, effectiveHigh);
    if (Math.abs(p2 - p1) < 4) p2 = clampPitch(fifth, walkLow, effectiveHigh);
    const d1 = qBeat(Math.min(1.35, sp * 0.44));
    addEvent(m, createNote(p1, t, d1));
    const d2 = qBeat(sp - d1);
    if (d2 > 0.25) addEvent(m, createNote(clampPitch(p2, walkLow, effectiveHigh), t + d1, d2));
    return;
  }

  if (mode === 'rhythmic') {
    const gap = qBeat(0.45 + seededUnit(seed, bar, 940) * 0.55 + rot * 0.1);
    const hit1 =
      seededUnit(seed, bar, 941) < 0.5 ? clampPitch(third, walkLow, effectiveHigh) : clampPitch(seventh, walkLow, effectiveHigh);
    if (gap > 0.05) addEvent(m, createRest(t, gap));
    const tHit = qBeat(t + gap);
    const rem = qBeat(4 - tHit);
    const dA = qBeat(Math.min(0.75, rem * 0.52));
    addEvent(m, createNote(hit1, tHit, dA));
    const t2 = qBeat(tHit + dA);
    const rem2 = qBeat(4 - t2);
    if (rem2 > 0.28) {
      const rest2 = qBeat(0.2 + seededUnit(seed, bar, 943) * 0.45);
      addEvent(m, createRest(t2, Math.min(rest2, rem2 - 0.25)));
      const t3 = qBeat(t2 + Math.min(rest2, rem2 - 0.25));
      const rem3 = qBeat(4 - t3);
      const pB =
        seededUnit(seed, bar, 944) < 0.5 ? clampPitch(fifth, walkLow, effectiveHigh) : clampPitch(guide, walkLow, effectiveHigh);
      if (rem3 > 0.22) addEvent(m, createNote(clampPitch(pB, walkLow, effectiveHigh), t3, rem3));
    }
    return;
  }

  const ap = approachFromBelow(r0, walkLow, effectiveHigh);
  const base = [
    { w: 1.15, pitch: ap },
    { w: 1.05, pitch: clampPitch(third, walkLow, effectiveHigh) },
    { w: 1.1, pitch: clampPitch(fifth, walkLow, effectiveHigh) },
    { w: 1, pitch: clampPitch(seventh, walkLow, effectiveHigh) },
    { w: 1.05, pitch: clampPitch(guide, walkLow, effectiveHigh) },
  ];
  addWeightedPhrase(m, t, sp, applyPhraseWeights(perturbWeights(base, bar, seed), bar, seed, false));
}

/**
 * Slash-bass symbols (e.g. Dmaj9/F#) require the bass line to spell that pitch class somewhere.
 * Some phrase emitters (echo / contour breaks) can drop it — call this before scrub/finalize.
 */
export function ensureSlashBassPitchPresentInMeasure(
  m: MeasureModel,
  slashBassPitch: number | undefined,
  walkLow: number,
  high: number
): void {
  if (slashBassPitch === undefined) return;
  const targetPc = ((slashBassPitch % 12) + 12) % 12;
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    const pc = (((e as { pitch: number }).pitch % 12) + 12) % 12;
    if (pc === targetPc) return;
  }
  const firstIdx = m.events.findIndex((ev) => ev.kind === 'note');
  if (firstIdx >= 0) {
    const n = m.events[firstIdx] as { pitch: number; kind: string; startBeat: number; duration: number };
    m.events[firstIdx] = { ...n, pitch: clampPitch(slashBassPitch, walkLow, high) };
  }
}

/** Every bar should articulate 3rd or 7th somewhere (guide-tone voice). */
export function ensureBassBarHitsThirdOrSeventh(
  m: MeasureModel,
  third: number,
  seventh: number,
  walkLow: number,
  high: number,
  slashBassPc?: number
): void {
  if (slashBassPc !== undefined) {
    const sb = ((slashBassPc % 12) + 12) % 12;
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const pc = (((e as { pitch: number }).pitch % 12) + 12) % 12;
      if (pc === sb) return;
    }
  }
  const thirdPc = ((third % 12) + 12) % 12;
  const seventhPc = ((seventh % 12) + 12) % 12;
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    const pc = (((e as { pitch: number }).pitch % 12) + 12) % 12;
    if (pc === thirdPc || pc === seventhPc) return;
  }
  const idxs = m.events.map((e, i) => (e.kind === 'note' ? i : -1)).filter((i) => i >= 0);
  if (idxs.length === 0) return;
  const pick = idxs[Math.min(1, idxs.length - 1)]!;
  const n = m.events[pick] as { pitch: number; kind: 'note'; startBeat: number; duration: number };
  const target = clampPitch(third, walkLow, high);
  m.events[pick] = { ...n, pitch: target, kind: 'note' };
}

/** Phrase ends (even bars): land resolve (root/fifth) or suspend (third/seventh), not weak chromatic tails. */
export function nudgeDuoBassPhraseEndTone(
  m: MeasureModel,
  barIndex: number,
  rootClamped: number,
  third: number,
  fifth: number,
  seventh: number,
  walkLow: number,
  high: number,
  seed: number
): void {
  if (barIndex % 2 !== 0) return;
  let lastI = -1;
  let bestEnd = -1;
  for (let i = 0; i < m.events.length; i++) {
    const e = m.events[i];
    if (e.kind !== 'note') continue;
    const n = e as { startBeat: number; duration: number };
    const end = n.startBeat + n.duration;
    if (end >= bestEnd) {
      bestEnd = end;
      lastI = i;
    }
  }
  if (lastI < 0) return;
  const n = m.events[lastI] as { pitch: number; kind: 'note'; startBeat: number; duration: number };
  const pc = ((n.pitch % 12) + 12) % 12;
  const resolveSet = new Set([((rootClamped % 12) + 12) % 12, ((fifth % 12) + 12) % 12]);
  const suspendSet = new Set([((third % 12) + 12) % 12, ((seventh % 12) + 12) % 12]);
  const wantResolve = seededUnit(seed, barIndex, 951) < 0.5;
  const pool = wantResolve
    ? [clampPitch(rootClamped, walkLow, high), clampPitch(fifth, walkLow, high)]
    : [clampPitch(third, walkLow, high), clampPitch(seventh, walkLow, high)];
  const ok = wantResolve ? resolveSet.has(pc) : suspendSet.has(pc);
  if (ok) return;
  let best = pool[0]!;
  let bestD = Math.abs(best - n.pitch);
  for (const p of pool) {
    const d = Math.abs(p - n.pitch);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  m.events[lastI] = { ...n, pitch: best, kind: 'note' };
}

export type DuoSwingBassMode = 'hold' | 'anticipate' | 'offbeat';

const EPS = 1e-5;

/**
 * Steady quarter-beat motion from t0 (no leading rest here — caller adds rest first).
 * Preferable to rest + half + short punch: readable Sibelius-style walking.
 */
export function emitDuoBassQuarterStrideBar(params: {
  m: MeasureModel;
  t0: number;
  span: number;
  seed: number;
  bar: number;
  walkLow: number;
  effectiveHigh: number;
  pitches: number[];
  /** Prefer shared pitch classes with guitar when step size is tied (motif echo + smooth voice-leading). */
  guitarPitchClassesInBar?: Set<number>;
}): void {
  const { m, t0, span, walkLow, effectiveHigh, guitarPitchClassesInBar } = params;
  const pool = params.pitches.filter((p) => typeof p === 'number');
  if (pool.length === 0 || span <= EPS) return;
  const uniq = [...new Set(pool.map((p) => clampPitch(p, walkLow, effectiveHigh)))];
  let cur = t0;
  let rem = span;
  let prev = uniq[0];
  let first = true;
  while (rem > EPS) {
    const dur = rem >= 1 ? 1 : qBeat(rem);
    if (dur <= EPS) break;
    let chosen: number;
    if (first) {
      chosen = prev;
      first = false;
    } else {
      chosen = uniq[0];
      let bestScore = Infinity;
      for (const p of uniq) {
        const gap = Math.abs(p - prev);
        const echoBonus = guitarPitchClassesInBar?.has(((p % 12) + 12) % 12) ? -0.25 : 0;
        const score = gap + echoBonus;
        if (score < bestScore - 1e-6 || (Math.abs(score - bestScore) < 1e-6 && p < chosen)) {
          bestScore = score;
          chosen = p;
        }
      }
    }
    addEvent(m, createNote(chosen, cur, dur));
    prev = chosen;
    cur = qBeat(cur + dur);
    rem = qBeat(rem - dur);
  }
}

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
  slashBassPitch?: number;
}): void {
  const {
    m,
    mode,
    rootClamped,
    third,
    fifth,
    guide,
    firstStart,
    seed,
    bar,
    walkLow,
    effectiveHigh,
    slashBassPitch,
  } = params;
  const span = 4 - firstStart;
  if (firstStart > 0) addEvent(m, createRest(0, firstStart));
  const t0 = firstStart;
  if (mode === 'hold') {
    const p1 = seededUnit(seed, bar, 901) < 0.55 ? clampPitch(guide, walkLow, effectiveHigh) : rootClamped;
    const pool = [p1, clampPitch(third, walkLow, effectiveHigh), clampPitch(fifth, walkLow, effectiveHigh)];
    if (slashBassPitch !== undefined) {
      pool.unshift(clampPitch(slashBassPitch, walkLow, effectiveHigh));
    }
    emitDuoBassQuarterStrideBar({ m, t0, span, seed, bar, walkLow, effectiveHigh, pitches: pool });
    return;
  }
  if (mode === 'anticipate') {
    const restLen = qBeat(Math.max(0.5, Math.min(1, span - 0.5)));
    addEvent(m, createRest(t0, restLen));
    const hit = qBeat(t0 + restLen);
    const rem = qBeat(4 - hit);
    const target = seededUnit(seed, bar, 902) < 0.5 ? fifth : third;
    const pool = [
      clampPitch(target, walkLow, effectiveHigh),
      clampPitch(guide, walkLow, effectiveHigh),
      clampPitch(rootClamped, walkLow, effectiveHigh),
    ];
    if (slashBassPitch !== undefined) {
      pool.unshift(clampPitch(slashBassPitch, walkLow, effectiveHigh));
    }
    emitDuoBassQuarterStrideBar({ m, t0: hit, span: rem, seed, bar, walkLow, effectiveHigh, pitches: pool });
    return;
  }
  addEvent(m, createRest(t0, 0.5));
  const n1 = slashBassPitch !== undefined ? clampPitch(slashBassPitch, walkLow, effectiveHigh) : third;
  addEvent(m, createNote(n1, t0 + 0.5, 1));
  addEvent(m, createNote(guide, t0 + 1.5, 1));
  addEvent(m, createNote(fifth, t0 + 2.5, qBeat(Math.max(0.25, 4 - t0 - 2.5))));
}

export function qBeat(x: number): number {
  return Math.round(x * 4) / 4;
}

export type BassSectionRole = 'A' | 'A_prime' | 'B' | 'cadence';

/**
 * Break a stuck contour (same inter-note steps as previous bar) by swapping adjacent chord-tone
 * pitches or nudging toward pool tones. Deterministic from seed + bar.
 */
export function breakMeasureContourLocally(
  m: MeasureModel,
  seed: number,
  bar: number,
  opts: { walkLow: number; high: number; chordTonePool: number[] }
): boolean {
  const { walkLow, high, chordTonePool } = opts;
  const pool = [...new Set(chordTonePool.map((p) => clampPitch(p, walkLow, high)))];
  const indices = m.events.map((e, i) => (e.kind === 'note' ? i : -1)).filter((i) => i >= 0);
  if (indices.length < 2) return false;
  const before = contourFingerprint(m);
  const j = 1 + ((seed + bar * 17) % (indices.length - 1));
  const i0 = indices[j - 1]!;
  const i1 = indices[j]!;
  const e0 = m.events[i0] as { pitch: number; kind: string; startBeat: number; duration: number };
  const e1 = m.events[i1] as { pitch: number; kind: string; startBeat: number; duration: number };
  const tmp = e0.pitch;
  e0.pitch = clampPitch(e1.pitch, walkLow, high);
  e1.pitch = clampPitch(tmp, walkLow, high);
  let after = contourFingerprint(m);
  if (after === before || after === '') {
    for (const alt of pool) {
      e0.pitch = alt;
      after = contourFingerprint(m);
      if (after !== before && after !== '') return true;
    }
    for (const alt of pool) {
      e1.pitch = alt;
      after = contourFingerprint(m);
      if (after !== before && after !== '') return true;
    }
  }
  return after !== before && after !== '';
}

/** Map guitar pitch into bass register sharing pitch class (motif echo). */
export function echoGuitarToBass(guitarPitch: number, walkLow: number, high: number): number {
  const pc = guitarPitch % 12;
  let p = Math.floor(walkLow / 12) * 12 + pc;
  while (p < walkLow) p += 12;
  while (p > high) p -= 12;
  return clampPitch(p, walkLow, high);
}

/** Pick octave of `pitch` nearest to `prev` to keep walking-line jumps ≤ ~8 st. */
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

/** Duo golden path: balanced quarter-note subdivision (no wild weight spread). */
function applyPhraseWeights(
  base: Array<{ w: number; pitch: number }>,
  bar: number,
  seed: number,
  duoSteadyWalking: boolean
): Array<{ w: number; pitch: number }> {
  if (duoSteadyWalking) {
    return base.map((p, i) => ({
      ...p,
      w: 1 + (((seed + bar * 7 + i * 11) % 7) - 3) * 0.045,
    }));
  }
  return perturbWeights(base, bar, seed);
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
  /** Guitar–bass duo: prefer even phrase weights → steadier quarter / eighth subdivision. */
  duoSteadyWalking?: boolean;
  /** Phrase A: stepwise; A′: leap-leaning; mixed blends buckets. */
  motionHint?: 'step' | 'leap' | 'mixed';
  /** A: sparser targets; A′: denser rhythmic activity. */
  densityHint?: 'sparse' | 'normal' | 'dense';
  /** Phrase retry: rotate rhythm / bucket (0–2). */
  phraseRhythmVariant?: number;
  /** 2-bar expressive mode (duo): pedal / leap / syncopation / step melody. */
  phraseBehaviourMode?: DuoPhraseBehaviourMode;
  /** Anti-loop retry count — perturbs phrase-mode bars. */
  bassPhraseRetryAttempt?: number;
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
    duoSteadyWalking,
    motionHint,
    densityHint,
    phraseRhythmVariant,
    phraseBehaviourMode,
    bassPhraseRetryAttempt,
  } = params;
  const steady = !!duoSteadyWalking;
  const modeRetry = bassPhraseRetryAttempt ?? phraseRhythmVariant ?? 0;
  const density = densityHint ?? 'normal';
  const gtBiasBase = (guideToneBias ?? 1) * (guitarActivityHot ? 1.12 : 1);
  const gtBias =
    gtBiasBase * (density === 'sparse' ? 0.93 : density === 'dense' ? 1.12 : 1);
  const rootForLine =
    slashBassPitch !== undefined
      ? clampPitch(slashBassPitch, walkLow, effectiveHigh)
      : rootClamped;

  const span = 4 - firstStart;
  if (firstStart > 0) {
    addEvent(m, createRest(0, firstStart));
  }

  const ap = approachFromBelow(rootForLine, walkLow, effectiveHigh);
  const sForMelody = section === 'A_prime' ? seed + 133 + bar * 5 : seed;
  const land = seededUnit(sForMelody, bar, 41) < 0.68 ? fifth : rootForLine;
  const lastLead = seededUnit(sForMelody, bar, 43) < 0.58 ? fifth : rootForLine;

  const biasPieces = (base: Array<{ w: number; pitch: number }>) =>
    applyGuideToneWeightBias(base, rootForLine, third, seventh, guide, gtBias);

  const useEcho =
    guitarFirstPitchInBar !== undefined &&
    (section === 'B' || (section === 'A_prime' && seededUnit(sForMelody, bar, 814) < 0.38));
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

  if (phraseBehaviourMode && section !== 'cadence' && !useEcho && phraseBehaviourMode !== 'stepwise') {
    emitDuoPhraseModeBar({
      m,
      mode: phraseBehaviourMode,
      t0: firstStart,
      span,
      seed: sForMelody,
      bar,
      walkLow,
      effectiveHigh,
      rootClamped,
      third,
      fifth,
      seventh,
      guide,
      slashBassPitch,
      phraseRetryAttempt: modeRetry,
    });
    return;
  }

  const rhythmVar = phraseRhythmVariant ?? 0;
  let u = seededUnit(sForMelody, bar, 61);
  if (motionHint === 'step') u = u * 0.88;
  else if (motionHint === 'leap') u = 0.26 + u * 0.72;
  else if (motionHint === 'mixed') u = (u + seededUnit(sForMelody, bar, 62) * 0.28) % 1;
  if (rhythmVar === 1) u = (u + 0.33) % 1;
  if (rhythmVar === 2) u = (u + 0.62) % 1;
  const rot = (bar + seed * 3 + rhythmVar * 5) % 3;

  if (section === 'cadence') {
    const base = biasPieces([
      { w: bar % 2 === 0 ? 1.25 : 1, pitch: ap },
      { w: 3, pitch: rootForLine },
      { w: 5, pitch: guide },
      { w: 4, pitch: land },
    ]);
    addWeightedPhrase(m, firstStart, span, applyPhraseWeights(base, bar, seed, steady));
    return;
  }

  if (useEcho && (section === 'B' || section === 'A_prime')) {
    const echoSeed = section === 'A_prime' ? sForMelody : seed;
    const landE = seededUnit(echoSeed, bar, 41) < 0.68 ? fifth : rootForLine;
    const lastLeadE = seededUnit(echoSeed, bar, 43) < 0.58 ? fifth : rootForLine;
    const echoShape = (bar * 5 + echoSeed * 2) % 3;
    const t0 = firstStart;
    if (echoShape === 0) {
      addEvent(m, createNote(echoPitch, t0, 1));
      addEvent(m, createNote(guide, t0 + 1, 0.75));
      addEvent(m, createNote(landE, t0 + 1.75, qBeat(4 - t0 - 1.75)));
      return;
    }
    if (echoShape === 1) {
      addEvent(m, createNote(third, t0, 0.5));
      addEvent(m, createNote(echoPitch, t0 + 0.5, 1.25));
      addEvent(m, createNote(seventh, t0 + 1.75, 0.75));
      addEvent(m, createNote(landE, t0 + 2.5, qBeat(4 - t0 - 2.5)));
      return;
    }
    const pat = (bar + echoSeed + rot) % 3;
    let base: Array<{ w: number; pitch: number }>;
    if (pat === 0) {
      base = [
        { w: 1, pitch: echoPitch },
        { w: 1, pitch: guide },
        { w: 2, pitch: fifth },
        { w: 2, pitch: lastLeadE },
        { w: 2, pitch: landE },
      ];
    } else if (pat === 1) {
      base = [
        { w: 1, pitch: third },
        { w: 1, pitch: echoPitch },
        { w: 3, pitch: seventh },
        { w: 1, pitch: guide },
        { w: 3, pitch: landE },
      ];
    } else {
      base = [
        { w: 2, pitch: fifth },
        { w: 1, pitch: echoPitch },
        { w: 1, pitch: rootForLine },
        { w: 2, pitch: guide },
        { w: 2, pitch: landE },
      ];
    }
    addWeightedPhrase(m, firstStart, span, applyPhraseWeights(biasPieces(base), bar, echoSeed, steady));
    return;
  }

  if (section === 'A' || section === 'A_prime') {
    const lineSeed = sForMelody;
    const lf = leadPitch(lineSeed, bar, third, guide, fifth, rootClamped);
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
    addWeightedPhrase(m, firstStart, span, applyPhraseWeights(base, bar, lineSeed, steady));
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
  addWeightedPhrase(m, firstStart, span, applyPhraseWeights(base, bar, seed, steady));
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
