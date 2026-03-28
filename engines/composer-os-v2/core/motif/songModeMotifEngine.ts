/**
 * Song Mode — core motif engine (abstract identity + realization).
 * Source alignment: Riffs_Motifs.md §2, §5 — motif as symbol-level pattern; guitar realization only.
 */

import type { CompositionContext } from '../compositionContext';
import type { MeasureModel, PartModel } from '../score-model/scoreModelTypes';
import { createNote, createRest, addEvent } from '../score-model/scoreEventBuilder';
import { getChordForBar } from '../harmony/harmonyResolution';
import { guitarChordTonesInRange } from '../goldenPath/guitarPhraseAuthority';
import { clampPitch, seededUnit } from '../goldenPath/guitarBassDuoHarmony';
import { snapAttackBeatToGrid } from '../score-integrity/duoEighthBeatGrid';
import { contourFingerprint, rhythmFingerprint } from '../goldenPath/bassLineFingerprints';
import type { ChordTonesOptions } from '../harmony/chordSymbolAnalysis';
import type { CoreMotif, MotifRegisterTag, MotifRoleTag } from './motifEngineTypes';

export const SONG_MODE_HOOK_RETURN_BAR = 25;
export const SONG_MODE_MOTIF_BAR_9 = 9;
export const SONG_MODE_MOTIF_BAR_17 = 17;

export type HookContourDirs = number[];

export interface SongModeHookIdentityCell {
  noteCount: number;
  contourDirs: HookContourDirs;
  statementRhythm: { start: number; dur: number }[];
  returnRhythm: { start: number; dur: number }[];
  variationKind: 'rhythm' | 'interval';
  intervalReturnScale: 1 | 2;
}

function uniquePoolMidi(tones: ReturnType<typeof guitarChordTonesInRange>): number[] {
  const raw = [tones.root, tones.third, tones.fifth, tones.seventh].map((p) => Math.round(p));
  return Array.from(new Set(raw)).sort((a, b) => a - b);
}

export function isGenericScaleRun(pitches: number[]): boolean {
  if (pitches.length < 3) return false;
  for (let i = 0; i <= pitches.length - 3; i++) {
    const d1 = pitches[i + 1] - pitches[i];
    const d2 = pitches[i + 2] - pitches[i + 1];
    if (d1 === 0 || d2 === 0) continue;
    if (Math.sign(d1) !== Math.sign(d2)) continue;
    if (Math.abs(d1) <= 2 && Math.abs(d2) <= 2) return true;
  }
  return false;
}

function hasMotifShape(contourDirs: number[], pitches: number[]): boolean {
  const hasUp = contourDirs.some((d) => d > 0);
  const hasDown = contourDirs.some((d) => d < 0);
  if (hasUp && hasDown) return true;
  let maxLeap = 0;
  for (let i = 1; i < pitches.length; i++) {
    maxLeap = Math.max(maxLeap, Math.abs(pitches[i] - pitches[i - 1]));
  }
  return maxLeap >= 4;
}

function rhythmDistinctive(rhythms: { start: number; dur: number }[]): boolean {
  const durs = rhythms.map((r) => Math.round(r.dur * 1000) / 1000);
  const uniq = new Set(durs);
  const firstStart = rhythms[0]?.start ?? 0;
  return uniq.size >= 2 || firstStart > 0.01;
}

export function contourDirSignatureFromPitches(pitches: number[]): string {
  if (pitches.length < 2) return '';
  const parts: string[] = [];
  for (let i = 1; i < pitches.length; i++) {
    const d = pitches[i] - pitches[i - 1];
    parts.push(d > 0 ? '1' : d < 0 ? '-1' : '0');
  }
  return parts.join(',');
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

  for (let attempt = 1; attempt <= 48; attempt++) {
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
    if (isGenericScaleRun(out)) continue;
    if (!hasMotifShape(contourDirs, out)) continue;
    return out;
  }
  return null;
}

function pickContourFamily(seed: number, salt: number): HookContourDirs {
  const u = seededUnit(seed, salt, 0);
  if (u < 0.34) return [1, -1, 1];
  if (u < 0.67) return [1, -1, -1];
  return [-1, 1, 1];
}

function pickStatementRhythm(seed: number, salt: number): { start: number; dur: number }[] {
  const u = seededUnit(seed, salt, 1);
  if (u < 0.5) {
    return [
      { start: 0, dur: 0.5 },
      { start: 0.5, dur: 0.5 },
      { start: 1.5, dur: 1 },
      { start: 2.5, dur: 1.5 },
    ];
  }
  return [
    { start: 0.25, dur: 0.75 },
    { start: 1.25, dur: 0.5 },
    { start: 2, dur: 1 },
    { start: 3, dur: 1 },
  ];
}

function pickReturnRhythmStatement(seed: number): { start: number; dur: number }[] {
  const u = seededUnit(seed, 91003, 0);
  if (u < 0.5) {
    return [
      { start: 0, dur: 1 },
      { start: 1, dur: 0.5 },
      { start: 2, dur: 0.5 },
      { start: 3, dur: 1 },
    ];
  }
  return [
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
      dir > 0
        ? clampPitch(curr + 4, low, high)
        : dir < 0
          ? clampPitch(curr - 3, low, high)
          : curr;
    out.push(next);
    curr = next;
  }
  return out;
}

function contourDirsToPattern(dirs: HookContourDirs): number[] {
  return dirs.map((d) => (d > 0 ? 1 : d < 0 ? -1 : 0));
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

/** How many core motifs (1–3) drive this Song Mode generation. */
export function songModeMotifCount(seed: number): 1 | 2 | 3 {
  const u = seededUnit(seed, 92000, 0);
  if (u < 0.38) return 1;
  if (u < 0.72) return 2;
  return 3;
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
    const st = snapAttackBeatToGrid(r.start);
    addEvent(m, createNote(pitches[i], st, r.dur, 1, motifRef));
  }
  let sum = 0;
  for (const e of m.events) {
    if (e.kind === 'note') {
      const ev = e as { startBeat: number; duration: number };
      sum = Math.max(sum, ev.startBeat + ev.duration);
    }
  }
  if (sum < 4 - 1e-4) {
    addEvent(m, createRest(sum, 4 - sum));
  }
}

/**
 * Build hook runtime + 1–3 abstract CoreMotifs; optional featured bars 9/17 for motifs 2–3.
 */
export function buildSongModeHookRuntime(params: {
  seed: number;
  context: CompositionContext;
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
  motifCount: 1 | 2 | 3;
  fillStatement: (m: MeasureModel) => void;
  fillReturn: (m: MeasureModel) => void;
  fillBar9: ((m: MeasureModel) => void) | undefined;
  fillBar17: ((m: MeasureModel) => void) | undefined;
} {
  const {
    seed,
    context,
    statementLow,
    statementHigh,
    returnLow,
    returnHigh,
    bar9Low,
    bar9High,
    bar17Low,
    bar17High,
    chordToneOpts,
  } = params;
  const chord1 = getChordForBar(1, context);
  const motifCount = songModeMotifCount(seed);
  const contourDirs = pickContourFamily(seed, 91001);
  const variationKind = seededUnit(seed, 91004, 0) < 0.5 ? 'rhythm' : 'interval';
  const intervalReturnScale: 1 | 2 = variationKind === 'interval' ? 2 : 1;

  let statementRhythm = pickStatementRhythm(seed, 91002);
  if (!rhythmDistinctive(statementRhythm)) {
    statementRhythm = [
      { start: 0.5, dur: 0.5 },
      { start: 1, dur: 0.5 },
      { start: 2, dur: 1 },
      { start: 3, dur: 1 },
    ];
  }

  let returnRhythm: { start: number; dur: number }[];
  if (variationKind === 'rhythm') {
    returnRhythm = pickReturnRhythmStatement(seed);
    if (rhythmsEqual(returnRhythm, statementRhythm)) {
      returnRhythm = returnRhythm.map((r, i) =>
        i === 1 ? { start: r.start + 0.25, dur: r.dur } : r
      );
    }
  } else {
    returnRhythm = statementRhythm.map((r) => ({ ...r }));
  }

  const statementPitches =
    pickPitchesForContour(chord1, statementLow, statementHigh, contourDirs, seed, 91010, 1, chordToneOpts) ??
    pickPicksFallback(chord1, statementLow, statementHigh, contourDirs, chordToneOpts);

  const cell: SongModeHookIdentityCell = {
    noteCount: statementPitches.length,
    contourDirs,
    statementRhythm,
    returnRhythm,
    variationKind,
    intervalReturnScale,
  };

  const m1Roles: MotifRoleTag[] =
    seededUnit(seed, 92001, 0) < 0.55 ? ['guide-tone', 'chord-tone'] : ['chord-tone', 'guide-tone'];
  const coreMotifs: CoreMotif[] = [
    pitchesToCoreMotif('song_m1', statementPitches, statementRhythm, m1Roles, ['mid', 'narrow']),
  ];

  if (motifCount >= 2) {
    const dirs2 = pickContourFamily(seed, 92010);
    let rh2 = pickStatementRhythm(seed, 92011);
    if (rhythmsEqual(rh2, statementRhythm)) {
      rh2 = rh2.map((r, i) => (i === 0 ? { start: r.start + 0.5, dur: r.dur } : r));
    }
    const p2 =
      pickPitchesForContour(chord1, statementLow, statementHigh, dirs2, seed, 92012, 1, chordToneOpts) ??
      pickPicksFallback(chord1, statementLow, statementHigh, dirs2, chordToneOpts);
    coreMotifs.push(
      pitchesToCoreMotif('song_m2', p2, rh2, ['chord-tone', 'passing'], ['mid', 'wide'])
    );
  }
  if (motifCount >= 3) {
    const dirs3 = pickContourFamily(seed, 92020);
    const rh3 = pickStatementRhythm(seed, 92021);
    const p3 =
      pickPitchesForContour(chord1, statementLow, statementHigh, dirs3, seed, 92022, 1, chordToneOpts) ??
      pickPicksFallback(chord1, statementLow, statementHigh, dirs3, chordToneOpts);
    coreMotifs.push(
      pitchesToCoreMotif('song_m3', p3, rh3, ['chromatic', 'neighbor'], ['high', 'narrow'])
    );
  }

  const fillStatement = (m: MeasureModel): void => {
    emitMeasureFromPitches(m, statementPitches, statementRhythm, 'song_m1');
  };

  const fillReturn = (m: MeasureModel): void => {
    const barChord = m.chord ? m.chord.trim() : getChordForBar(SONG_MODE_HOOK_RETURN_BAR, context);
    const returnPitches =
      variationKind === 'interval'
        ? pickPitchesForContour(barChord, returnLow, returnHigh, contourDirs, seed, 91020, intervalReturnScale, chordToneOpts) ??
          pickPitchesForContour(barChord, returnLow, returnHigh, contourDirs, seed, 91021, 1, chordToneOpts) ??
          pickPicksFallback(barChord, returnLow, returnHigh, contourDirs, chordToneOpts)
        : pickPitchesForContour(barChord, returnLow, returnHigh, contourDirs, seed, 91022, 1, chordToneOpts) ??
          pickPicksFallback(barChord, returnLow, returnHigh, contourDirs, chordToneOpts);
    emitMeasureFromPitches(m, returnPitches, returnRhythm, 'song_m1');
  };

  let fillBar9: ((m: MeasureModel) => void) | undefined;
  let fillBar17: ((m: MeasureModel) => void) | undefined;

  if (motifCount >= 2 && coreMotifs[1]) {
    const m2 = coreMotifs[1];
    const dirs = m2.contourPattern.map((c) => (c > 0 ? 1 : c < 0 ? -1 : 0)) as HookContourDirs;
    const rh = m2.rhythmPattern.map((r) => ({ start: r.startBeat, dur: r.duration }));
    /** Bar 9: transpose — same contour/rhythm, harmony at bar 9. */
    fillBar9 = (m: MeasureModel): void => {
      const ch = m.chord?.trim() ?? getChordForBar(SONG_MODE_MOTIF_BAR_9, context);
      const pitches =
        pickPitchesForContour(ch, bar9Low, bar9High, dirs, seed, 92030, 1, chordToneOpts) ??
        pickPicksFallback(ch, bar9Low, bar9High, dirs, chordToneOpts);
      emitMeasureFromPitches(m, pitches, rh, 'song_m2');
    };
  }

  if (motifCount >= 3 && coreMotifs[2]) {
    const m3 = coreMotifs[2];
    const dirs = m3.contourPattern.map((c) => (c > 0 ? 1 : c < 0 ? -1 : 0)) as HookContourDirs;
    /** Bar 17: rhythmic variation — stagger onsets vs template. */
    const rhBase = m3.rhythmPattern.map((r) => ({ start: r.startBeat, dur: r.duration }));
    const rhVar = rhBase.map((r, i) =>
      i === 2 ? { start: Math.min(3, r.start + 0.25), dur: r.dur } : { ...r }
    );
    fillBar17 = (m: MeasureModel): void => {
      const ch = m.chord?.trim() ?? getChordForBar(SONG_MODE_MOTIF_BAR_17, context);
      const pitches =
        pickPitchesForContour(ch, bar17Low, bar17High, dirs, seed, 92040, 1, chordToneOpts) ??
        pickPicksFallback(ch, bar17Low, bar17High, dirs, chordToneOpts);
      emitMeasureFromPitches(m, pitches, rhVar, 'song_m3');
    };
  }

  return {
    cell,
    coreMotifs,
    motifCount,
    fillStatement,
    fillReturn,
    fillBar9,
    fillBar17,
  };
}

export function validateSongModeHookIdentity(guitar: PartModel, _context: CompositionContext): string[] {
  const errs: string[] = [];
  const m1 = guitar.measures.find((x) => x.index === 1);
  const m25 = guitar.measures.find((x) => x.index === SONG_MODE_HOOK_RETURN_BAR);
  if (!m1 || !m25) {
    errs.push('Song Mode hook: missing guitar bar 1 or bar 25.');
    return errs;
  }

  const notes1 = m1.events
    .filter((e) => e.kind === 'note')
    .map((e) => e as { pitch: number; startBeat: number; duration: number })
    .sort((a, b) => a.startBeat - b.startBeat);
  const notes25 = m25.events
    .filter((e) => e.kind === 'note')
    .map((e) => e as { pitch: number; startBeat: number; duration: number })
    .sort((a, b) => a.startBeat - b.startBeat);

  if (notes25.length < 2) {
    errs.push('Song Mode hook: return bar has too few notes (hook not reused).');
  }

  const c1 = contourDirSignatureFromPitches(notes1.map((n) => n.pitch));
  const c25 = contourDirSignatureFromPitches(notes25.map((n) => n.pitch));
  if (c1.length < 2 || c1 !== c25) {
    errs.push('Song Mode hook: return lost contour identity (unrecognisable).');
  }

  const r1 = rhythmFingerprint(m1);
  const r25 = rhythmFingerprint(m25);
  const fp1 = contourFingerprint(m1);
  const fp25 = contourFingerprint(m25);
  if (r1 === r25 && fp1 === fp25) {
    errs.push('Song Mode hook: return is a literal repetition (variation required).');
  }

  return errs;
}

function validateMotifBarContour(
  guitar: PartModel,
  bar: number,
  expectedContour: string,
  label: string
): string[] {
  const out: string[] = [];
  const m = guitar.measures.find((x) => x.index === bar);
  if (!m) {
    out.push(`Song Mode motif: missing guitar bar ${bar} (${label}).`);
    return out;
  }
  const timeOrder = m.events
    .filter((e) => e.kind === 'note')
    .map((e) => e as { pitch: number; startBeat: number })
    .sort((a, b) => a.startBeat - b.startBeat)
    .map((n) => n.pitch);
  if (timeOrder.length < 2) {
    out.push(`Song Mode motif: bar ${bar} (${label}) has too few notes.`);
    return out;
  }
  const sig = contourDirSignatureFromPitches(timeOrder);
  if (sig !== expectedContour) {
    out.push(`Song Mode motif: bar ${bar} (${label}) lost contour identity.`);
  }
  if (isGenericScaleRun(timeOrder)) {
    out.push(`Song Mode motif: bar ${bar} (${label}) reads as generic scale run.`);
  }
  return out;
}

/**
 * Validates featured motifs + anti-generic linkage; extend hook-only checks.
 */
export function validateSongModeMotifSystem(
  guitar: PartModel,
  context: CompositionContext,
  coreMotifs: CoreMotif[] | undefined,
  motifCount: 1 | 2 | 3
): string[] {
  const errs: string[] = [];
  errs.push(...validateSongModeHookIdentity(guitar, context));

  if (coreMotifs && coreMotifs.length > 0) {
    const exp1 = coreMotifs[0].contourPattern.join(',');
    errs.push(...validateMotifBarContour(guitar, 1, exp1, 'song_m1'));

    if (motifCount >= 2 && coreMotifs[1]) {
      errs.push(
        ...validateMotifBarContour(guitar, SONG_MODE_MOTIF_BAR_9, coreMotifs[1].contourPattern.join(','), 'song_m2')
      );
    }
    if (motifCount >= 3 && coreMotifs[2]) {
      errs.push(
        ...validateMotifBarContour(guitar, SONG_MODE_MOTIF_BAR_17, coreMotifs[2].contourPattern.join(','), 'song_m3')
      );
    }
  }

  return errs;
}

/**
 * Riff Generator — single abstract motif derived from same primitives as Song Mode (identity linkage).
 */
export function generateRiffCoreMotif(seed: number): CoreMotif {
  const contourDirs = pickContourFamily(seed, 93100);
  const chord = 'Cmaj7';
  const low = 55;
  const high = 76;
  const pitches =
    pickPitchesForContour(chord, low, high, contourDirs, seed, 93101, 1, undefined) ??
    pickPicksFallback(chord, low, high, contourDirs, undefined);
  const rhythm = pickStatementRhythm(seed, 93102);
  return pitchesToCoreMotif('riff_core', pitches, rhythm, ['chord-tone'], ['mid']);
}
