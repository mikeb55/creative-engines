/**
 * Motif Engine v2 — Song Mode guitar/melody only.
 * Structural scheduling (no synthetic echo-bar lists); deterministic.
 */

import type { CompositionContext } from '../compositionContext';
import type { MeasureModel } from '../score-model/scoreModelTypes';
import { createNote, createRest, addEvent } from '../score-model/scoreEventBuilder';
import { getChordForBar } from '../harmony/harmonyResolution';
import { guitarChordTonesInRange } from '../goldenPath/guitarPhraseAuthority';
import { clampPitch, seededUnit } from '../goldenPath/guitarBassDuoHarmony';
import { snapAttackBeatToGrid } from '../score-integrity/duoEighthBeatGrid';
import type { ChordTonesOptions } from '../harmony/chordSymbolAnalysis';
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

const MOTIF_REF = 'song_motif';

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

/** Similarity between base motif and a variant (intervals + rhythm realized for that bar). */
export function simMotifToRealization(base: Motif, intervalsB: number[], rhythmB: Motif['rhythm']): number {
  const w1 = 0.4;
  const w2 = 0.35;
  const w3 = 0.25;
  const cB = intervalsToUDS(intervalsB);
  const cs = contourSimilarity(base.contour, cB);
  const rs = rhythmSimilarity(base.rhythm, rhythmB);
  const am = anchorMatch(base, intervalsB, rhythmB);
  return w1 * cs + w2 * rs + w3 * am;
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

function pickReturnRhythm(seed: number): { start: number; dur: number }[] {
  return seededUnit(seed, 91003, 0) < 0.5
    ? [
        { start: 0, dur: 1 },
        { start: 1, dur: 0.5 },
        { start: 2, dur: 0.5 },
        { start: 3, dur: 1 },
      ]
    : [
        { start: 0, dur: 0.5 },
        { start: 0.75, dur: 0.75 },
        { start: 2, dur: 1 },
        { start: 3, dur: 1 },
      ];
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
}): {
  cell: SongModeHookIdentityCell;
  coreMotifs: CoreMotif[];
  motifCount: 1;
  primaryMotif: Motif;
  schedule: ScheduledBar[];
  emitScheduledBar: (bar: number, m: MeasureModel) => void;
} {
  const { seed, context, registerForBar, chordToneOpts } = params;
  const tb = context.form.totalBars;
  const primary = pickBestMotif(seed);
  const chord1 = getChordForBar(1, context);
  const [stLo, stHi] = registerForBar(1);
  const dirs0 = contourUDSToDirs(primary.contour);
  const stmtRh = rhythmToLegacy(primary.rhythm);
  const statementPitches =
    pickPitchesForContour(chord1, stLo, stHi, dirs0, seed, 91010, 1, chordToneOpts) ??
    pickPicksFallback(chord1, stLo, stHi, dirs0, chordToneOpts);

  const variationKind = seededUnit(seed, 91004, 0) < 0.5 ? 'rhythm' : 'interval';
  const intervalReturnScale: 1 | 2 = variationKind === 'interval' ? 2 : 1;
  let returnRhythm =
    variationKind === 'rhythm'
      ? rhythmToLegacy(
          primary.rhythm.map((e, i) =>
            i === 1 ? { ...e, onset: Math.min(3, e.onset + 0.25) } : { ...e }
          )
        )
      : stmtRh.map((r) => ({ ...r }));
  if (rhythmsEqual(returnRhythm, stmtRh)) returnRhythm = pickReturnRhythm(seed);
  if (rhythmsEqual(returnRhythm, stmtRh)) {
    returnRhythm = returnRhythm.map((r, i) =>
      i === 1 ? { start: Math.min(3, r.start + 0.25), dur: r.dur } : { ...r }
    );
  }

  const cell: SongModeHookIdentityCell = {
    noteCount: statementPitches.length,
    contourDirs: dirs0,
    statementRhythm: stmtRh,
    returnRhythm,
    variationKind,
    intervalReturnScale,
  };

  const coreMotifs: CoreMotif[] = [
    pitchesToCoreMotif('song_m1', statementPitches, stmtRh, ['guide-tone', 'chord-tone'], ['mid', 'narrow']),
  ];

  const schedule = buildMotifSchedule32(seed, tb);

  const emitScheduledBar = (bar: number, m: MeasureModel): void => {
    const entry = schedule.find((s) => s.bar === bar);
    if (!entry) {
      emitMeasureFromPitches(m, statementPitches, stmtRh, MOTIF_REF);
      return;
    }
    const ch = getChordForBar(bar, context);
    const [zLow, zHigh] = registerForBar(bar);

    if (entry.role === 'statement') {
      emitMeasureFromPitches(m, statementPitches, stmtRh, MOTIF_REF);
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
      let rp =
        variationKind === 'interval'
          ? pickPitchesForContour(ch, zLow, zHigh, dirs0, seed, 91020, intervalReturnScale, chordToneOpts) ??
            pickPitchesForContour(ch, zLow, zHigh, dirs0, seed, 91021, 1, chordToneOpts) ??
            pickPicksFallback(ch, zLow, zHigh, dirs0, chordToneOpts)
          : pickPitchesForContour(ch, zLow, zHigh, dirs0, seed, 91022, 1, chordToneOpts) ??
            pickPicksFallback(ch, zLow, zHigh, dirs0, chordToneOpts);
      const stepFp = (p: number[]) => {
        if (p.length < 2) return '';
        const o: string[] = [];
        for (let i = 1; i < p.length; i++) o.push(String(p[i] - p[i - 1]));
        return o.join(',');
      };
      if (stepFp(rp) === stepFp(statementPitches) && rp.length) {
        const adj = [...rp];
        adj[adj.length - 1] = clampPitch(
          adj[adj.length - 1] + (seededUnit(seed, 91025, 0) < 0.5 ? 1 : -1),
          zLow,
          zHigh
        );
        rp = adj;
      }
      emitMeasureFromPitches(m, rp, returnRhythm, MOTIF_REF);
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
  };
}

export function songModeMotifCount(_seed: number): 1 {
  return 1;
}
