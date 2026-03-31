/**
 * Motif Engine v2 — Song Mode guitar/melody only.
 * Structural scheduling (no synthetic echo-bar lists); deterministic.
 */

import type { CompositionContext } from '../compositionContext';
import type { MeasureModel, PartModel } from '../score-model/scoreModelTypes';
import { createNote, createRest, addEvent } from '../score-model/scoreEventBuilder';
import { getChordForBar } from '../harmony/harmonyResolution';
import { guitarChordTonesInRange } from '../goldenPath/guitarPhraseAuthority';
import { clampPitch, seededUnit } from '../goldenPath/guitarBassDuoHarmony';
import { snapAttackBeatToGrid } from '../score-integrity/duoEighthBeatGrid';
import { chordTonesForChordSymbol, type ChordTonesOptions } from '../harmony/chordSymbolAnalysis';
import type {
  CoreMotif,
  Motif,
  MotifAnchor,
  MotifRegisterTag,
  MotifRoleTag,
  MotifVariant,
  HookContourDirs,
  SongModeHookIdentityCell,
} from './motifEngineTypes';
import { SONG_MODE_HOOK_RETURN_BAR } from './motifEngineTypes';
import {
  type MotifShape,
  extractMotifShapeFromGuitarBarContext,
  extractMotifShapeFromStatement,
  mergeTouchingSamePitchNotesForValidator,
  motifShapeWithReturnAttacks,
  realizeReturnMidiFromMotifShape,
} from './motifShape';

const MOTIF_REF = 'song_motif';

/** Same PC delta as `realizeReturnMidiFromMotifShape` (not MIDI root lift per register). */
function rootPcFromChordSymbol(chord: string, opts?: ChordTonesOptions): number {
  const t = chordTonesForChordSymbol(chord, opts);
  return ((Math.round(t.root) % 12) + 12) % 12;
}

function shortestRootPcDelta(pc1: number, pc2: number): number {
  let d = pc2 - pc1;
  if (d > 6) d -= 12;
  if (d < -6) d += 12;
  return d;
}

/** Time-ordered merged pitches for bar 1 — same atoms as `extractMotifShapeFromGuitarBar`. */
function hookFirstBar1MergedPitches(guitar: PartModel, bar: number): number[] | null {
  const m = guitar.measures.find((x) => x.index === bar);
  if (!m) return null;
  const raw = m.events
    .filter((e) => e.kind === 'note')
    .map((e) => e as { pitch: number; startBeat: number; duration: number })
    .sort((a, b) => a.startBeat - b.startBeat);
  const notes = mergeTouchingSamePitchNotesForValidator(raw);
  if (notes.length < 2) return null;
  return notes.map((n) => n.pitch);
}

/** Octave-shift phrase into [low, high] without changing semitone intervals. */
function transposeOctavesToFitReturn(
  pitches: number[],
  low: number,
  high: number,
  hintForFirst: number
): number[] | null {
  if (pitches.length === 0) return pitches;
  const minP = Math.min(...pitches);
  const maxP = Math.max(...pitches);
  if (maxP - minP > high - low + 1e-6) return null;
  let best: number[] | null = null;
  let bestD = Infinity;
  for (let k = -8; k <= 8; k++) {
    const shifted = pitches.map((p) => p + 12 * k);
    if (!shifted.every((p) => p >= low && p <= high)) continue;
    const d = Math.abs(shifted[0] - hintForFirst);
    if (d < bestD - 1e-6) {
      bestD = d;
      best = shifted;
    }
  }
  return best;
}

/**
 * Hook-first return: transpose the actual bar-1 merged pitch sequence by harmonic root movement
 * (shortest PC delta — same as `realizeReturnMidiFromMotifShape`, not per-bar MIDI root lift).
 * Register: one global octave shift into [zLow,zHigh] if possible; else raw chain unchanged.
 */
function hookFirstReturnPitchesFromShape(
  bar1Pitches: number[],
  chord1: string,
  chord25: string,
  zLow: number,
  zHigh: number,
  seed: number,
  hookRepetitionBias: number = 0.5,
  chordToneOpts?: ChordTonesOptions
): number[] {
  if (bar1Pitches.length === 0) return [];
  const r1pc = rootPcFromChordSymbol(chord1, chordToneOpts);
  const r25pc = rootPcFromChordSymbol(chord25, chordToneOpts);
  const delta = shortestRootPcDelta(r1pc, r25pc);
  const p = bar1Pitches.map((pitch) => pitch + delta);
  const hint = clampPitch(bar1Pitches[0] + delta, zLow, zHigh);
  const fitted = transposeOctavesToFitReturn(p, zLow, zHigh, hint);
  const base = fitted ?? p;
  if (base.length < 2) return base;

  const getContour = (pitches: number[]): string => {
    const parts: string[] = [];
    for (let i = 1; i < pitches.length; i++) {
      const d = pitches[i] - pitches[i - 1];
      parts.push(d > 0 ? '1' : d < 0 ? '-1' : '0');
    }
    return parts.join(',');
  };

  const targetContour = getContour(base);
  if (hookRepetitionBias > 0.75) return base;
  const nudges = hookRepetitionBias < 0.4
    ? [1, -1, 2, -2, 3, -3]
    : [1, -1, 2, -2];
  const nonAnchorIndices = base
    .map((_, i) => i)
    .filter((i) => i !== 0 && i !== base.length - 1);

  for (const nudge of nudges) {
    for (const idx of nonAnchorIndices) {
      const candidate = base.map((pitch, i) => i === idx ? pitch + nudge : pitch);
      if (getContour(candidate) === targetContour) {
        return candidate;
      }
    }
  }

  return base;
}

function uniquePoolMidi(tones: ReturnType<typeof guitarChordTonesInRange>): number[] {
  const raw = [tones.root, tones.third, tones.fifth, tones.seventh].map((p) => Math.round(p));
  return Array.from(new Set(raw)).sort((a, b) => a - b);
}

function contourUDSToDirs(c: Motif['contour']): HookContourDirs {
  return c.map((x) => (x === 'U' ? 1 : x === 'D' ? -1 : 0));
}

function intervalsToUDS(intervals: number[]): Motif['contour'] {
  return intervals.map((iv) => (iv > 0 ? 'U' : iv < 0 ? 'D' : 'S'));
}

function totalBeats(r: Motif['rhythm']): number {
  let m = 0;
  for (const e of r) m = Math.max(m, e.onset + e.duration);
  return m;
}

function metricPositionsFromRhythm(r: Motif['rhythm']): number[] {
  return r.map((e) => Math.round(e.onset * 8) % 32);
}

function buildAnchors(m: Motif): MotifAnchor[] {
  const anchors: MotifAnchor[] = [];
  let maxL = 0;
  let leapIx = 0;
  for (let i = 0; i < m.intervals.length; i++) {
    const a = Math.abs(m.intervals[i]);
    if (a >= maxL) {
      maxL = a;
      leapIx = i;
    }
  }
  if (maxL >= 3) anchors.push({ type: 'interval', index: leapIx + 1, meta: { semis: m.intervals[leapIx] } });
  let bestRi = 0;
  let bestR = 0;
  for (let i = 0; i < m.rhythm.length; i++) {
    const w = m.rhythm[i].duration + (m.rhythm[i].accent ? 0.5 : 0);
    if (w >= bestR) {
      bestR = w;
      bestRi = i;
    }
  }
  anchors.push({ type: 'rhythm', index: bestRi, meta: { onset: m.rhythm[bestRi].onset } });
  anchors.push({ type: 'role', index: 0, meta: { role: 'statement_head' } });
  return anchors.slice(0, 2);
}

function countSameDirectionStepwise(intervals: number[]): number {
  if (intervals.length < 2) return 0;
  let run = 0;
  let maxRun = 0;
  let prevSign = 0;
  for (const iv of intervals) {
    if (iv === 0) continue;
    if (Math.abs(iv) > 2) {
      maxRun = Math.max(maxRun, run);
      run = 0;
      prevSign = 0;
      continue;
    }
    const s = Math.sign(iv);
    if (s === prevSign) run++;
    else {
      run = 1;
      prevSign = s;
    }
    maxRun = Math.max(maxRun, run);
  }
  return Math.max(maxRun, run);
}

function monotonicUDS(c: Motif['contour']): boolean {
  const u = new Set(c);
  return u.size <= 1;
}

function strongSyncopation(r: Motif['rhythm']): boolean {
  return r.some((e) => {
    const x = e.onset * 4;
    return e.onset > 0.01 && Math.abs(x - Math.round(x)) > 0.08;
  });
}

function strongRhythmicIdentity(r: Motif['rhythm']): boolean {
  const durs = r.map((x) => Math.round(x.duration * 1000));
  const uniq = new Set(durs).size;
  return uniq >= 3 || strongSyncopation(r) || r.some((e) => e.accent);
}

function hasRepeatedCell(intervals: number[], r: Motif['rhythm']): boolean {
  if (intervals.length >= 2) {
    const a = `${intervals[0]},${intervals[1]}`;
    for (let i = 2; i + 1 < intervals.length; i++) {
      if (`${intervals[i]},${intervals[i + 1]}` === a) return true;
    }
  }
  const keys = r.map((e) => `${e.onset.toFixed(2)}:${e.duration.toFixed(2)}`);
  const seen = new Set<string>();
  for (const k of keys) {
    if (seen.has(k)) return true;
    seen.add(k);
  }
  return false;
}

function excessiveUniqueness(intervals: number[], r: Motif['rhythm']): boolean {
  const ui = new Set(intervals.map(String)).size;
  const ur = new Set(r.map((x) => x.duration.toFixed(3))).size;
  return ui === intervals.length && ur === r.length && intervals.length >= 4 && !hasRepeatedCell(intervals, r);
}

function chromaticFeature(intervals: number[]): boolean {
  return intervals.some((i) => Math.abs(i) === 1);
}

function distinctivenessScore(m: Motif): number {
  let s = 0;
  if (m.intervals.some((i) => Math.abs(i) >= 3)) s += 3;
  if (strongRhythmicIdentity(m.rhythm)) s += 3;
  if (chromaticFeature(m.intervals)) s += 2;
  return s;
}

function rhythmOnlyMotif(m: Motif): boolean {
  const n = m.intervals.length + 1;
  return n >= 2 && n <= 3 && strongSyncopation(m.rhythm);
}

function acceptMotif(m: Motif): boolean {
  if (distinctivenessScore(m) >= 4) return true;
  if (rhythmOnlyMotif(m)) return true;
  return false;
}

function simplicityOk(m: Motif): boolean {
  const ui = new Set(m.intervals.map((x) => Math.abs(x))).size;
  const ur = new Set(m.rhythm.map((x) => x.duration)).size;
  if (ui > 4) return false;
  if (ur > 3) return false;
  const n = m.intervals.length + 1;
  if (n >= 6 && !hasRepeatedCell(m.intervals, m.rhythm)) return false;
  return true;
}

function hardReject(m: Motif): string | null {
  const n = m.intervals.length + 1;
  if (n < 2 || n > 7) return 'note_count';
  if (totalBeats(m.rhythm) > 8 + 1e-4) return 'span';
  if (m.lengthBars > 2 + 1e-4) return 'len';
  if (countSameDirectionStepwise(m.intervals) >= 4) return 'step_run';
  if (m.rhythm.length >= 2 && m.rhythm.every((e) => Math.abs(e.duration - m.rhythm[0].duration) < 1e-4)) return 'equal_dur';
  if (monotonicUDS(m.contour) && !strongRhythmicIdentity(m.rhythm)) return 'mono_contour';
  if (!hasRepeatedCell(m.intervals, m.rhythm) && m.intervals.length >= 4) return 'no_redundancy';
  if (excessiveUniqueness(m.intervals, m.rhythm)) return 'excess_unique';
  if (!acceptMotif(m)) return 'score';
  if (!simplicityOk(m)) return 'simplicity';
  return null;
}

const RHYTHM_POOL: Motif['rhythm'][] = [
  [
    { onset: 0, duration: 0.5 },
    { onset: 0.5, duration: 0.5 },
    { onset: 1.5, duration: 1, accent: true },
    { onset: 2.5, duration: 1.5 },
  ],
  [
    { onset: 0.25, duration: 0.75 },
    { onset: 1.25, duration: 0.5 },
    { onset: 2, duration: 1 },
    { onset: 3, duration: 1, accent: true },
  ],
  [
    { onset: 0, duration: 0.75, accent: true },
    { onset: 1.25, duration: 0.25 },
    { onset: 2, duration: 1.25 },
    { onset: 3.5, duration: 0.5 },
  ],
  [{ onset: 0, duration: 0.5 }, { onset: 0.75, duration: 0.75 }, { onset: 2, duration: 0.5 }, { onset: 3, duration: 1 }],
];

const INTERVAL_POOL: number[][] = [
  [4, -3, 5],
  [5, -2, -4],
  [3, -5, 4],
  [-4, 7, -3],
  [2, 5, -4],
  [6, -4, 2],
];

function makeMotif(id: string, intervals: number[], rhythm: Motif['rhythm']): Motif {
  const contour = intervalsToUDS(intervals);
  const lengthBars = Math.min(2, totalBeats(rhythm) / 4);
  const m: Motif = {
    id,
    intervals: [...intervals],
    rhythm: rhythm.map((r) => ({ ...r })),
    contour,
    anchors: [],
    metricPositions: metricPositionsFromRhythm(rhythm),
    lengthBars,
  };
  m.anchors = buildAnchors(m);
  return m;
}

function generateCandidatePool(seed: number): Motif[] {
  const pool: Motif[] = [];
  let idx = 0;
  for (const iv of INTERVAL_POOL) {
    for (const rh of RHYTHM_POOL) {
      if (iv.length + 1 !== rh.length) continue;
      if (totalBeats(rh) > 4 + 1e-4) continue;
      const m = makeMotif(`c_${idx++}`, iv, rh);
      if (!hardReject(m)) pool.push(m);
    }
  }
  for (let k = 0; k < 24; k++) {
    const iv = [...INTERVAL_POOL[k % INTERVAL_POOL.length]];
    const rh = RHYTHM_POOL[k % RHYTHM_POOL.length];
    if (iv.length + 1 !== rh.length) continue;
    iv[0] += Math.round((seededUnit(seed, k, 11) - 0.5) * 2);
    const m = makeMotif(`c_${idx++}`, iv, rh.map((r) => ({ ...r })));
    if (!hardReject(m)) pool.push(m);
  }
  if (pool.length === 0) pool.push(makeMotif('fb', [4, -3, 5], RHYTHM_POOL[0]));
  return pool;
}

function pickBestMotif(seed: number): Motif {
  const pool = generateCandidatePool(seed);
  let best = pool[0] ?? makeMotif('fb', [4, -3, 5], RHYTHM_POOL[0]);
  let bestS = -1;
  for (const m of pool) {
    const s = distinctivenessScore(m) + seededUnit(seed, m.id.length, 3) * 0.01;
    if (s > bestS) {
      bestS = s;
      best = m;
    }
  }
  return { ...best, id: 'primary_motif' };
}

function contourSimilarity(a: Motif['contour'], b: Motif['contour']): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let hit = 0;
  for (let i = 0; i < n; i++) if (a[i] === b[i]) hit++;
  return hit / Math.max(a.length, b.length);
}

function rhythmSimilarity(ra: Motif['rhythm'], rb: Motif['rhythm']): number {
  const n = Math.min(ra.length, rb.length);
  if (n === 0) return 0;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const da = Math.abs(ra[i].onset - rb[i].onset);
    const db = Math.abs(ra[i].duration - rb[i].duration);
    s += (1 - Math.min(1, da * 2)) * 0.5 + (1 - Math.min(1, db * 2)) * 0.5;
  }
  return s / n;
}

function anchorMatch(a: Motif, bIv: number[], bRh: Motif['rhythm']): number {
  const hits: number[] = [];
  for (const an of a.anchors) {
    if (an.type === 'interval' && typeof an.index === 'number' && an.index > 0 && an.index <= bIv.length) {
      hits.push(Math.abs(bIv[an.index - 1]) >= 3 ? 1 : 0.4);
    }
    if (an.type === 'rhythm' && bRh[an.index]) hits.push(1);
  }
  return hits.length ? hits.reduce((x, y) => x + y, 0) / hits.length : 0.5;
}

/** Primary: interval magnitudes + direction; contour UDS is secondary (correlated but kept for stability). */
function intervalPatternSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) {
    const mag = 1 - Math.min(1, Math.abs(a[i] - b[i]) / 8);
    const dir = Math.sign(a[i]) === Math.sign(b[i]) ? 1 : 0;
    s += 0.65 * mag + 0.35 * dir;
  }
  return s / Math.max(a.length, b.length);
}

/** Similarity between base motif and a variant (intervals + rhythm realized for that bar). */
export function simMotifToRealization(base: Motif, intervalsB: number[], rhythmB: Motif['rhythm']): number {
  const wInt = 0.5;
  const wCont = 0.15;
  const wRhy = 0.25;
  const wAnch = 0.1;
  const intSim = intervalPatternSimilarity(base.intervals, intervalsB);
  const cB = intervalsToUDS(intervalsB);
  const cs = contourSimilarity(base.contour, cB);
  const rs = rhythmSimilarity(base.rhythm, rhythmB);
  const am = anchorMatch(base, intervalsB, rhythmB);
  return wInt * intSim + wCont * cs + wRhy * rs + wAnch * am;
}

export type ScheduledBarRole = 'statement' | 'reinforce' | 'return' | 'develop';

export interface ScheduledBar {
  bar: number;
  role: ScheduledBarRole;
  variant: MotifVariant;
  targetSim: number;
}

/** Structural placement: bar 1 statement; 2–4 reinforce; 25 return; all other bars develop from material (scheduling, not echo injection). */
export function buildMotifSchedule32(seed: number, totalBars: number): ScheduledBar[] {
  const out: ScheduledBar[] = [];
  for (let b = 1; b <= totalBars; b++) {
    if (b === 1) {
      out.push({
        bar: b,
        role: 'statement',
        variant: { baseId: 'primary_motif', transformType: 'interval', similarity: 1 },
        targetSim: 1,
      });
    } else if (b >= 2 && b <= 4) {
      const t = seededUnit(seed, b, 1) < 0.5 ? 'rhythm' : 'transpose';
      out.push({
        bar: b,
        role: 'reinforce',
        variant: { baseId: 'primary_motif', transformType: t, similarity: 0.82 },
        targetSim: 0.8,
      });
    } else if (b === SONG_MODE_HOOK_RETURN_BAR) {
      out.push({
        bar: b,
        role: 'return',
        variant: { baseId: 'primary_motif', transformType: 'interval', similarity: 0.72 },
        targetSim: 0.7,
      });
    } else {
      const modes: MotifVariant['transformType'][] = ['truncate', 'rhythm', 'transpose', 'interval', 'register', 'extend'];
      const tm = modes[Math.floor(seededUnit(seed, b, 7) * modes.length)];
      out.push({
        bar: b,
        role: 'develop',
        variant: { baseId: 'primary_motif', transformType: tm, similarity: 0.62 },
        targetSim: 0.65,
      });
    }
  }
  return out;
}

function pickPitchesForContour(
  chord: string,
  low: number,
  high: number,
  contourDirs: HookContourDirs,
  seed: number,
  salt: number,
  intervalScale: 1 | 2,
  chordToneOpts?: ChordTonesOptions
): number[] | null {
  const tones = guitarChordTonesInRange(chord, low, high, chordToneOpts);
  const pool = uniquePoolMidi(tones);
  if (pool.length < 2) return null;
  for (let attempt = 1; attempt <= 64; attempt++) {
    const startPc = pool[Math.floor(seededUnit(seed, salt, attempt * 17) * pool.length)];
    let curr = clampPitch(startPc, low, high);
    const out: number[] = [curr];
    let failed = false;
    for (let i = 0; i < contourDirs.length; i++) {
      const dir = contourDirs[i];
      const maxAbs = intervalScale === 1 ? 8 : 12;
      const candidates = pool.filter((p) => {
        const d = p - curr;
        if (dir > 0) return d > 0 && d <= maxAbs;
        if (dir < 0) return d < 0 && d >= -maxAbs;
        return Math.abs(d) <= 2;
      });
      if (candidates.length === 0) {
        failed = true;
        break;
      }
      const pick = candidates[Math.floor(seededUnit(seed, salt, attempt * 31 + i * 7) * candidates.length)];
      out.push(clampPitch(pick, low, high));
      curr = pick;
    }
    if (failed) continue;
    return out;
  }
  return null;
}

function pickPicksFallback(
  chord: string,
  low: number,
  high: number,
  contourDirs: HookContourDirs,
  chordToneOpts?: ChordTonesOptions
): number[] {
  const tones = guitarChordTonesInRange(chord, low, high, chordToneOpts);
  const pool = uniquePoolMidi(tones);
  const a = clampPitch(pool[Math.min(1, pool.length - 1)], low, high);
  let curr = a;
  const out: number[] = [curr];
  for (const dir of contourDirs) {
    const next =
      dir > 0 ? clampPitch(curr + 4, low, high) : dir < 0 ? clampPitch(curr - 3, low, high) : curr;
    out.push(next);
    curr = next;
  }
  return out;
}

function rhythmToLegacy(r: Motif['rhythm']): { start: number; dur: number }[] {
  return r.map((x) => ({ start: x.onset, dur: x.duration }));
}

function emitMeasureFromPitches(
  m: MeasureModel,
  pitches: number[],
  rhythm: { start: number; dur: number }[],
  motifRef: string
): void {
  m.events = [];
  const n = Math.min(pitches.length, rhythm.length);
  for (let i = 0; i < n; i++) {
    const r = rhythm[i];
    addEvent(m, createNote(pitches[i], snapAttackBeatToGrid(r.start), r.dur, 1, motifRef));
  }
  let sum = 0;
  for (const e of m.events) {
    if (e.kind === 'note') {
      const ev = e as { startBeat: number; duration: number };
      sum = Math.max(sum, ev.startBeat + ev.duration);
    }
  }
  if (sum < 4 - 1e-4) addEvent(m, createRest(sum, 4 - sum));
}

function pitchesToCoreMotif(
  id: string,
  pitches: number[],
  rhythm: { start: number; dur: number }[],
  roles: MotifRoleTag[],
  registers: MotifRegisterTag[]
): CoreMotif {
  const intervalPattern: number[] = [];
  const contourPattern: number[] = [];
  for (let i = 1; i < pitches.length; i++) {
    intervalPattern.push(pitches[i] - pitches[i - 1]);
    const d = pitches[i] - pitches[i - 1];
    contourPattern.push(d > 0 ? 1 : d < 0 ? -1 : 0);
  }
  return {
    id,
    intervalPattern,
    rhythmPattern: rhythm.map((r) => ({ startBeat: r.start, duration: r.dur })),
    contourPattern,
    roleTags: roles,
    registerTags: registers,
  };
}

function sliceMotif(m: Motif, from: number, len: number): { intervals: number[]; rhythm: Motif['rhythm'] } {
  const nNotes = Math.min(len, m.intervals.length + 1 - from);
  if (nNotes < 2) {
    return {
      intervals: m.intervals.slice(0, Math.max(1, m.intervals.length)),
      rhythm: m.rhythm.slice(0, Math.min(m.rhythm.length, 2)),
    };
  }
  const iv = m.intervals.slice(from, from + nNotes - 1);
  const rh = m.rhythm.slice(from, from + nNotes);
  return { intervals: iv, rhythm: rh };
}

function applyDevelopTransform(
  base: Motif,
  bar: number,
  seed: number,
  t: MotifVariant['transformType']
): { intervals: number[]; rhythm: Motif['rhythm'] } {
  const u = seededUnit(seed, bar, 99);
  if (t === 'truncate') return sliceMotif(base, 0, u < 0.5 ? 3 : 2);
  if (t === 'extend') {
    const extra = base.intervals.slice(0, Math.min(base.intervals.length, 3));
    return { intervals: extra, rhythm: base.rhythm.slice(0, extra.length + 1) };
  }
  if (t === 'transpose') {
    const iv = base.intervals.map((x, i) => (i === 0 ? x + (seededUnit(seed, bar, 2) < 0.5 ? 2 : -2) : x));
    return { intervals: iv, rhythm: base.rhythm.map((r) => ({ ...r })) };
  }
  if (t === 'rhythm') {
    const rh = base.rhythm.map((e, i) =>
      i === 1 ? { ...e, onset: Math.min(3, e.onset + 0.25) } : { ...e }
    );
    return { intervals: [...base.intervals], rhythm: rh };
  }
  if (t === 'register') {
    return { intervals: base.intervals.map((x) => x), rhythm: base.rhythm.map((r) => ({ ...r })) };
  }
  return { intervals: [...base.intervals], rhythm: base.rhythm.map((r) => ({ ...r })) };
}

/**
 * Preserve all statement attack times (four notes); vary one duration by one eighth so the bar still
 * tiles and normalization cannot drop a note (shifting the next onset breaks the pattern).
 */
function buildReturnRhythmMicroVariation(
  stmtRh: { start: number; dur: number }[],
  seed: number
): { start: number; dur: number }[] {
  const out = stmtRh.map((r) => ({ start: r.start, dur: r.dur }));
  const delta = 0.25;
  const last = out.length - 1;
  const u = seededUnit(seed, 91040, 0);
  if (u < 0.5 && out[last].dur > delta + 0.11) {
    out[last].dur = snapAttackBeatToGrid(Math.max(0.25, out[last].dur - delta));
  } else if (out[0].dur > delta + 0.11) {
    out[0].dur = snapAttackBeatToGrid(Math.max(0.25, out[0].dur - delta));
  } else {
    const j = Math.min(1, last);
    if (out[j].dur > delta + 0.11) out[j].dur = snapAttackBeatToGrid(Math.max(0.25, out[j].dur - delta));
  }
  if (rhythmsEqual(out, stmtRh) && out[last].dur > delta + 0.11) {
    out[last].dur = snapAttackBeatToGrid(Math.max(0.25, out[last].dur - delta));
  }
  return out;
}

function rhythmsEqual(
  a: { start: number; dur: number }[],
  b: { start: number; dur: number }[]
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i].start - b[i].start) > 0.02 || Math.abs(a[i].dur - b[i].dur) > 0.02) return false;
  }
  return true;
}

export function buildSongModeMotifV2Runtime(params: {
  seed: number;
  context: CompositionContext;
  /** Per-bar guitar register (melody zone) — required for develop bars. */
  registerForBar: (bar: number) => [number, number];
  statementLow: number;
  statementHigh: number;
  returnLow: number;
  returnHigh: number;
  bar9Low: number;
  bar9High: number;
  bar17Low: number;
  bar17High: number;
  chordToneOpts?: ChordTonesOptions;
  /**
   * Hook-first only: supplier for the guitar part built so far (must include finalized bar 1)
   * when emitting bar 25, so return pitches transpose merged bar-1 guitar notes.
   */
  getHookGuitarPart?: () => PartModel;
}): {
  cell: SongModeHookIdentityCell;
  coreMotifs: CoreMotif[];
  motifCount: 1;
  primaryMotif: Motif;
  schedule: ScheduledBar[];
  emitScheduledBar: (bar: number, m: MeasureModel) => void;
  statementMotifShape: MotifShape;
  returnExpectedMotifShape: MotifShape;
} {
  const { seed, context, registerForBar, chordToneOpts, getHookGuitarPart } = params;
  const tb = context.form.totalBars;
  const primary = pickBestMotif(seed);
  const chord1 = getChordForBar(1, context);
  const [stLo, stHi] = registerForBar(1);
  const dirs0 = contourUDSToDirs(primary.contour);
  const stmtRh = rhythmToLegacy(primary.rhythm);
  const statementPitchesRaw =
    pickPitchesForContour(chord1, stLo, stHi, dirs0, seed, 91010, 1, chordToneOpts) ??
    pickPicksFallback(chord1, stLo, stHi, dirs0, chordToneOpts);
  const nStmt = Math.min(statementPitchesRaw.length, stmtRh.length);
  const statementPitches = statementPitchesRaw.slice(0, nStmt);
  const stmtRhAligned = stmtRh.slice(0, nStmt);

  const variationKind = seededUnit(seed, 91004, 0) < 0.5 ? 'rhythm' : 'interval';
  const hookFirst = context.generationMetadata?.songModeHookFirstIdentity === true;
  /** Hook-first: same attacks as statement so return contour/pitch structure matches extraction; else micro-variation. */
  const returnRhythm = hookFirst
    ? stmtRhAligned.map((r) => ({ start: r.start, dur: r.dur }))
    : buildReturnRhythmMicroVariation(stmtRhAligned, seed);

  const statementMotifShape = extractMotifShapeFromStatement(
    statementPitches,
    stmtRhAligned,
    chord1,
    stLo,
    stHi,
    chordToneOpts
  );
  const returnExpectedMotifShape = motifShapeWithReturnAttacks(statementMotifShape, returnRhythm);

  const cell: SongModeHookIdentityCell = {
    noteCount: statementPitches.length,
    contourDirs: dirs0,
    statementRhythm: stmtRhAligned,
    returnRhythm,
    variationKind,
    intervalReturnScale: 1,
  };

  const coreMotifs: CoreMotif[] = [
    pitchesToCoreMotif('song_m1', statementPitches, stmtRhAligned, ['guide-tone', 'chord-tone'], ['mid', 'narrow']),
  ];

  const schedule = buildMotifSchedule32(seed, tb);

  const emitScheduledBar = (bar: number, m: MeasureModel): void => {
    const entry = schedule.find((s) => s.bar === bar);
    if (!entry) {
      emitMeasureFromPitches(m, statementPitches, stmtRhAligned, MOTIF_REF);
      return;
    }
    const ch = getChordForBar(bar, context);
    const [zLow, zHigh] = registerForBar(bar);

    if (entry.role === 'statement') {
      emitMeasureFromPitches(m, statementPitches, stmtRhAligned, MOTIF_REF);
      return;
    }
    if (entry.role === 'reinforce') {
      const sl = sliceMotif(primary, 0, entry.variant.transformType === 'transpose' ? 4 : 3);
      const dirs = contourUDSToDirs(intervalsToUDS(sl.intervals));
      const rh = rhythmToLegacy(sl.rhythm);
      const pitches =
        pickPitchesForContour(ch, zLow, zHigh, dirs, seed, 92000 + bar, 1, chordToneOpts) ??
        pickPicksFallback(ch, zLow, zHigh, dirs, chordToneOpts);
      emitMeasureFromPitches(m, pitches, rh, MOTIF_REF);
      return;
    }
    if (entry.role === 'return') {
      const rp = hookFirst
        ? (() => {
            const guitar = getHookGuitarPart?.();
            if (!guitar) {
              throw new Error('songModeHookFirstIdentity requires getHookGuitarPart() for bar 25');
            }
            const bar1 = hookFirstBar1MergedPitches(guitar, 1);
            if (!bar1) {
              throw new Error('hook-first return: could not extract MotifShape from guitar bar 1');
            }
            const hookRepBias = (params.context?.generationMetadata as any)?.songwriterHookRepetitionBias ?? 0.5;
            return hookFirstReturnPitchesFromShape(bar1, chord1, ch, zLow, zHigh, seed, hookRepBias, chordToneOpts);
          })()
        : realizeReturnMidiFromMotifShape(
            statementMotifShape,
            statementPitches,
            chord1,
            ch,
            statementPitches[0],
            zLow,
            zHigh,
            seed,
            chordToneOpts
          );
      const rhReturn = hookFirst ? stmtRh.slice(0, rp.length) : returnRhythm;
      emitMeasureFromPitches(m, rp, rhReturn, MOTIF_REF);
      return;
    }
    const dev = applyDevelopTransform(primary, bar, seed, entry.variant.transformType);
    const dirs = contourUDSToDirs(intervalsToUDS(dev.intervals));
    const rh = rhythmToLegacy(dev.rhythm);
    const pitches =
      pickPitchesForContour(ch, zLow, zHigh, dirs, seed, 93000 + bar, 1, chordToneOpts) ??
      pickPicksFallback(ch, zLow, zHigh, dirs, chordToneOpts);
    emitMeasureFromPitches(m, pitches, rh, MOTIF_REF);
  };

  return {
    cell,
    coreMotifs,
    motifCount: 1,
    primaryMotif: primary,
    schedule,
    emitScheduledBar,
    statementMotifShape,
    returnExpectedMotifShape,
  };
}

export function songModeMotifCount(_seed: number): 1 {
  return 1;
}

/**
 * After phrase/overlay/seal passes, re-align hook MotifShape metadata with the final guitar score
 * (statement bar + return rhythm template). Generator and validator both use this representation.
 */
export function recomputeSongModeHookMotifShapesFromScore(
  guitar: PartModel,
  context: CompositionContext
): { statementMotifShape: MotifShape; returnExpectedMotifShape: MotifShape } | null {
  const primary = context.generationMetadata?.songModePrimaryMotif;
  if (!primary) return null;
  const stmt = extractMotifShapeFromGuitarBarContext(guitar, 1, context);
  if (!stmt) return null;
  const stmtRh = rhythmToLegacy(primary.rhythm);
  const returnRhythm = buildReturnRhythmMicroVariation(stmtRh, context.seed);
  return {
    statementMotifShape: stmt,
    returnExpectedMotifShape: motifShapeWithReturnAttacks(stmt, returnRhythm),
  };
}
