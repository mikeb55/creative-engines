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
import type {
  CoreMotif,
  Motif,
  MotifRegisterTag,
  MotifRoleTag,
  HookContourDirs,
  SongModeHookIdentityCell,
} from './motifEngineTypes';
import {
  SONG_MODE_HOOK_RETURN_BAR,
  SONG_MODE_MOTIF_BAR_9,
  SONG_MODE_MOTIF_BAR_17,
} from './motifEngineTypes';
import { buildSongModeMotifV2Runtime, simMotifToRealization } from './songModeMotifEngineV2';

export {
  SONG_MODE_HOOK_RETURN_BAR,
  SONG_MODE_MOTIF_BAR_9,
  SONG_MODE_MOTIF_BAR_17,
} from './motifEngineTypes';
export type { HookContourDirs, SongModeHookIdentityCell } from './motifEngineTypes';
export { songModeMotifCount } from './songModeMotifEngineV2';

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

/** Motif Engine v2 — candidate scoring, placement, development (see `songModeMotifEngineV2.ts`). */
export function buildSongModeHookRuntime(
  params: Parameters<typeof buildSongModeMotifV2Runtime>[0]
): ReturnType<typeof buildSongModeMotifV2Runtime> {
  return buildSongModeMotifV2Runtime(params);
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

function validateSongModeBar1Strength(guitar: PartModel): string[] {
  const out: string[] = [];
  const m1 = guitar.measures.find((x) => x.index === 1);
  if (!m1) {
    out.push('Song Mode motif v2: bar 1 missing.');
    return out;
  }
  const notes = m1.events
    .filter((e) => e.kind === 'note')
    .map((e) => e as { pitch: number; startBeat: number })
    .sort((a, b) => a.startBeat - b.startBeat);
  if (notes.length < 3) {
    out.push('Song Mode motif v2: bar 1 identity cell is weak (fewer than 3 notes).');
  }
  if (notes.length >= 2) {
    let maxLeap = 0;
    for (let i = 1; i < notes.length; i++) {
      maxLeap = Math.max(maxLeap, Math.abs(notes[i].pitch - notes[i - 1].pitch));
    }
    if (maxLeap < 3 && notes.length < 4) {
      out.push('Song Mode motif v2: bar 1 lacks a featured leap or enough notes for identity.');
    }
  }
  return out;
}

/** Sliding 8-bar windows: ≥50% of melody notes must map to motif IDs. */
function validateMotifCoverageSliding(guitar: PartModel): string[] {
  const totalBars = guitar.measures.length;
  if (totalBars < 8) return [];
  const motifRe = /^song_motif/;
  for (let start = 1; start <= totalBars - 7; start++) {
    let motifNotes = 0;
    let totalNotes = 0;
    for (let b = start; b < start + 8; b++) {
      const meas = guitar.measures.find((x) => x.index === b);
      if (!meas) continue;
      for (const e of meas.events) {
        if (e.kind !== 'note') continue;
        totalNotes++;
        const ref = (e as { motifRef?: string }).motifRef;
        if (ref && motifRe.test(ref)) motifNotes++;
      }
    }
    if (totalNotes === 0) continue;
    if (motifNotes / totalNotes < 0.5) {
      return [
        `Song Mode motif v2: motif-mapped notes <50% in sliding window bars ${start}–${start + 7}.`,
      ];
    }
  }
  return [];
}

/** At most two consecutive bars may lack any motif-mapped note. */
function validateMaxConsecutiveNonMotifBars(guitar: PartModel): string[] {
  let run = 0;
  let maxRun = 0;
  for (let b = 1; b <= guitar.measures.length; b++) {
    const meas = guitar.measures.find((x) => x.index === b);
    let anyMotif = false;
    if (meas) {
      for (const e of meas.events) {
        if (e.kind === 'note' && (e as { motifRef?: string }).motifRef?.startsWith('song_motif')) {
          anyMotif = true;
          break;
        }
      }
    }
    if (!anyMotif) {
      run++;
      maxRun = Math.max(maxRun, run);
    } else run = 0;
  }
  if (maxRun > 2) {
    return [`Song Mode motif v2: ${maxRun} consecutive bars without motif-mapped notes (max 2).`];
  }
  return [];
}

function extractIntervalsAndRhythmFromBar(
  guitar: PartModel,
  bar: number
): { intervals: number[]; rhythm: { onset: number; duration: number }[] } | null {
  const meas = guitar.measures.find((x) => x.index === bar);
  if (!meas) return null;
  const notes = meas.events
    .filter((e) => e.kind === 'note')
    .map((e) => e as { pitch: number; startBeat: number; duration: number })
    .sort((a, b) => a.startBeat - b.startBeat);
  if (notes.length === 0) return { intervals: [], rhythm: [] };
  const intervals: number[] = [];
  for (let i = 1; i < notes.length; i++) intervals.push(notes[i].pitch - notes[i - 1].pitch);
  const rhythm = notes.map((n) => ({ onset: n.startBeat, duration: n.duration }));
  return { intervals, rhythm };
}

function validateMotifReturnSimilarity(guitar: PartModel, primary: Motif | undefined): string[] {
  if (!primary) return [];
  const ex = extractIntervalsAndRhythmFromBar(guitar, SONG_MODE_HOOK_RETURN_BAR);
  if (!ex || ex.intervals.length < 1) {
    return ['Song Mode motif v2: return bar lacks enough notes for similarity check.'];
  }
  const sim = simMotifToRealization(primary, ex.intervals, ex.rhythm);
  if (sim < 0.7) {
    return [`Song Mode motif v2: return similarity ${sim.toFixed(2)} < 0.70 (unrecognisable).`];
  }
  return [];
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
  errs.push(...validateSongModeBar1Strength(guitar));
  errs.push(...validateMotifCoverageSliding(guitar));
  errs.push(...validateMaxConsecutiveNonMotifBars(guitar));
  errs.push(...validateMotifReturnSimilarity(guitar, context.generationMetadata?.songModePrimaryMotif));

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
