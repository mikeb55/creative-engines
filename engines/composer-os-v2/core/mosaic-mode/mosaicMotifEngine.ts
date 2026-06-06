/**
 * Mosaic Mode — seeded source motif + per-section composer transforms (rc9).
 */

import type { CoreMotif, MotifRegisterTag, MotifRoleTag } from '../motif/motifEngineTypes';
import { seededUnit } from '../goldenPath/guitarBassDuoHarmony';
import type { MosaicModeSectionPlan } from './precomputeMosaicEffectiveHarmonyBars';
import type { MosaicTonicMap } from './precomputeMosaicEffectiveHarmonyBars';

const BLUES_INTERVAL_POOL = [0, 2, 3, 5] as const;
const STEP_POOL = [1, 2] as const;

function roundHalf(x: number): number {
  return Math.round(x * 2) / 2;
}

function clampIntervalMagnitude(iv: number, max: number): number {
  const sign = iv >= 0 ? 1 : -1;
  return sign * Math.min(max, Math.abs(iv));
}

function contourFromIntervals(intervals: number[]): number[] {
  return intervals.map((iv) => (iv > 0 ? 1 : iv < 0 ? -1 : 0));
}

function countContourDirectionChanges(contour: number[]): number {
  let changes = 0;
  for (let i = 1; i < contour.length; i++) {
    const a = contour[i - 1]!;
    const b = contour[i]!;
    if (a !== 0 && b !== 0 && a !== b) changes++;
  }
  return changes;
}

function oneHingeContourDirs(intervalCount: number, seed: number): number[] {
  const hingeAt = 1 + Math.floor(seededUnit(seed, 93150, 0) * (intervalCount - 1));
  const firstSign = seededUnit(seed, 93151, 0) < 0.5 ? 1 : -1;
  const dirs: number[] = [];
  for (let i = 0; i < intervalCount; i++) {
    dirs.push(i < hingeAt ? firstSign : -firstSign);
  }
  return dirs;
}

function snapToBluesInterval(iv: number): number {
  const sign = iv >= 0 ? 1 : -1;
  const mag = Math.abs(iv);
  let best: number = BLUES_INTERVAL_POOL[0]!;
  let bestDist = Infinity;
  for (const p of BLUES_INTERVAL_POOL) {
    const d = Math.abs(mag - p);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return sign * best;
}

function buildIntervalPattern(seed: number, noteCount: number): number[] {
  const intervalCount = noteCount - 1;
  const contourDirs = oneHingeContourDirs(intervalCount, seed);
  const leapIdx = Math.floor(seededUnit(seed, 93102, 0) * intervalCount);
  const intervals: number[] = [];
  for (let i = 0; i < intervalCount; i++) {
    if (i === leapIdx) {
      intervals.push(contourDirs[i]! >= 0 ? 5 : -5);
    } else {
      const step = STEP_POOL[Math.floor(seededUnit(seed, 93110 + i, 0) * STEP_POOL.length)]!;
      intervals.push((contourDirs[i]! >= 0 ? 1 : -1) * step);
    }
  }

  const sum = intervals.reduce((a, b) => a + b, 0);
  const current = ((sum % 12) + 12) % 12;
  let need = ((7 - current) + 12) % 12;
  if (need > 6) need -= 12;
  const lastIdx = intervalCount - 1;
  const last = intervals[lastIdx]!;
  if (Math.abs(need) <= 2 && need !== 0) {
    intervals[lastIdx] = last + need;
  } else if (need !== 0) {
    console.warn(
      `mosaicMotifEngine: anchorRole degree-5 skip (adjustment ${need} semitones > 2) seed=${seed}`
    );
  }

  return intervals;
}

function buildRhythmPattern(seed: number, noteCount: number): CoreMotif['rhythmPattern'] {
  const totalTarget = 3 + Math.floor(seededUnit(seed, 93200, 0) * 3);
  const offbeatIdx = 1 + Math.floor(seededUnit(seed, 93201, 0) * Math.max(1, noteCount - 2));
  const durations = Array.from({ length: noteCount }, () => 0.5);
  let remaining = totalTarget - noteCount * 0.5;
  let guard = 0;
  while (remaining > 0.01 && guard < 64) {
    const idx = Math.floor(seededUnit(seed, 93210 + guard, 0) * noteCount);
    const add = Math.min(0.5, remaining);
    durations[idx]! += add;
    remaining -= add;
    guard++;
  }

  const rhythm: CoreMotif['rhythmPattern'] = [];
  let cursor = 0;
  for (let j = 0; j < noteCount; j++) {
    let startBeat = cursor;
    if (j === offbeatIdx) {
      startBeat = Math.floor(cursor) + 0.5;
      if (startBeat <= (rhythm[j - 1]?.startBeat ?? -0.5)) {
        startBeat = cursor + 0.5;
      }
    }
    rhythm.push({ startBeat, duration: durations[j]! });
    cursor = startBeat + durations[j]!;
  }
  return rhythm;
}

export function generateMosaicSourceMotif(seed: number, totalBars: number): CoreMotif {
  void totalBars;
  const noteCount = seededUnit(seed, 93100, 0) < 0.5 ? 4 : 5;
  const intervalPattern = buildIntervalPattern(seed, noteCount);
  const rhythmPattern = buildRhythmPattern(seed, noteCount);
  return {
    id: 'mosaic_source',
    intervalPattern,
    rhythmPattern,
    contourPattern: contourFromIntervals(intervalPattern),
    roleTags: ['mosaic_source' as MotifRoleTag],
    registerTags: ['mid' as MotifRegisterTag],
  };
}

function rotateRhythmOnsets(rhythm: CoreMotif['rhythmPattern']): CoreMotif['rhythmPattern'] {
  if (rhythm.length === 0) return [];
  const rotated = [...rhythm.slice(1), rhythm[0]!];
  let start = 0;
  return rotated.map((r) => {
    const entry = { startBeat: start, duration: r.duration };
    start += r.duration;
    return entry;
  });
}

function transformWs(
  intervals: number[],
  rhythm: CoreMotif['rhythmPattern']
): { intervalPattern: number[]; rhythmPattern: CoreMotif['rhythmPattern'] } {
  if (intervals.length === 0 || rhythm.length === 0) {
    return { intervalPattern: [...intervals], rhythmPattern: rhythm.map((r) => ({ ...r })) };
  }
  const leapIdx = intervals.reduce(
    (best, iv, i) => (Math.abs(iv) > Math.abs(intervals[best]!) ? i : best),
    0
  );
  const leap = intervals[leapIdx]!;
  const half1 = Math.round(leap / 2);
  const half2 = leap - half1;
  const intervalPattern = [...intervals];
  intervalPattern.splice(leapIdx, 1, half1, half2);

  const rhythmPattern = rhythm.map((r) => ({ ...r }));
  const before = rhythmPattern[leapIdx];
  if (before) {
    const newDur = Math.max(0.5, roundHalf(before.duration - 0.5));
    const midStart = before.startBeat + newDur;
    rhythmPattern[leapIdx] = { startBeat: before.startBeat, duration: newDur };
    rhythmPattern.splice(leapIdx + 1, 0, { startBeat: midStart, duration: 0.5 });
  }

  if (rhythmPattern[2] && rhythmPattern[2].startBeat % 1 === 0) {
    rhythmPattern[2] = {
      startBeat: rhythmPattern[2].startBeat + 0.5,
      duration: rhythmPattern[2].duration,
    };
  }

  return { intervalPattern, rhythmPattern };
}

function applyComposerTransform(
  prefix: string,
  intervals: number[],
  rhythm: CoreMotif['rhythmPattern']
): { intervalPattern: number[]; rhythmPattern: CoreMotif['rhythmPattern'] } {
  const key = prefix.endsWith(':') ? prefix.slice(0, -1) : prefix;

  if (key === 'rf') {
    const intervalPattern = intervals.map((iv) => clampIntervalMagnitude(iv + 2, 7));
    const rhythmPattern = rotateRhythmOnsets(rhythm);
    return { intervalPattern, rhythmPattern };
  }

  if (key === 'jw') {
    const intervalPattern = intervals.map((iv, i) => {
      if (i === 0 || i === intervals.length - 1) return clampIntervalMagnitude(iv, 5);
      return clampIntervalMagnitude(snapToBluesInterval(iv), 5);
    });
    const rhythmPattern = [...rhythm.map((r) => ({ ...r }))];
    if (rhythmPattern.length > 0) {
      rhythmPattern.push({ ...rhythmPattern[0]! });
    }
    return { intervalPattern, rhythmPattern };
  }

  if (key === 'ws') {
    return transformWs(intervals, rhythm);
  }

  if (key === 'tv') {
    const intervalPattern = intervals.map((iv) =>
      Math.abs(iv) > 3 ? (iv >= 0 ? 2 : -2) : iv
    );
    return { intervalPattern, rhythmPattern: rhythm.map((r) => ({ ...r })) };
  }

  if (key === 'jma') {
    const intervalPattern = intervals.map((iv) => {
      const sign = iv >= 0 ? 1 : -1;
      return clampIntervalMagnitude(sign * (Math.abs(iv) + 1), 7);
    });
    const rhythmPattern = rhythm.map((r) => ({
      startBeat: r.startBeat,
      duration: Math.max(0.5, roundHalf(r.duration * 0.75)),
    }));
    return { intervalPattern, rhythmPattern };
  }

  return {
    intervalPattern: intervals.map((iv) => iv),
    rhythmPattern: rhythm.map((r) => ({ ...r })),
  };
}

export function transformMotifForSection(
  source: CoreMotif,
  sectionLabel: string,
  composerPrefix: string,
  tonicDeltaSemitones: number
): CoreMotif {
  void tonicDeltaSemitones;
  const { intervalPattern, rhythmPattern } = applyComposerTransform(
    composerPrefix,
    [...source.intervalPattern],
    source.rhythmPattern
  );
  return {
    id: `mosaic_variant_${sectionLabel}`,
    intervalPattern,
    rhythmPattern,
    contourPattern: contourFromIntervals(intervalPattern),
    roleTags: ['mosaic_variant' as MotifRoleTag],
    registerTags: ['mid' as MotifRegisterTag],
  };
}

export function composerReceiptPrefixForStyleId(songwriterStyleId: string): string {
  const map: Record<string, string> = {
    fripp: 'rf',
    fripp_king_crimson: 'fk',
    fripp_systems_process: 'rf',
    jack_white: 'jw',
    jack_white_drone_riff: 'jw',
    verlaine: 'tv',
    marr: 'jma',
    wayne_shorter: 'ws',
  };
  return map[songwriterStyleId] ?? songwriterStyleId.split('_')[0] ?? '';
}

export function buildMosaicMotifVariants(
  source: CoreMotif,
  sectionPlan: MosaicModeSectionPlan,
  tonicMap: MosaicTonicMap
): Record<string, CoreMotif> {
  const sourceLabel = sectionPlan[0]?.sectionLabel;
  const sourceTonic = sourceLabel ? (tonicMap[sourceLabel] ?? 0) : 0;
  const out: Record<string, CoreMotif> = {};
  for (const section of sectionPlan) {
    const tonicPc = tonicMap[section.sectionLabel] ?? 0;
    let delta = tonicPc - sourceTonic;
    if (delta > 6) delta -= 12;
    if (delta < -6) delta += 12;
    const prefix = composerReceiptPrefixForStyleId(section.songwriterStyleId);
    out[section.sectionLabel] = transformMotifForSection(
      source,
      section.sectionLabel,
      prefix,
      delta
    );
  }
  return out;
}

/** Test/diagnostic helpers (rc9 rules). */
export function mosaicSourceHasExactlyOneLeap(intervals: number[]): boolean {
  const leaps = intervals.filter((iv) => Math.abs(iv) >= 5);
  const steps = intervals.filter((iv) => Math.abs(iv) <= 2);
  return leaps.length === 1 && steps.length === intervals.length - 1;
}

export function mosaicContourHasOneDirectionChange(contour: number[]): boolean {
  return countContourDirectionChanges(contour) === 1;
}

export function mosaicRhythmHasOffbeatOnset(rhythm: CoreMotif['rhythmPattern']): boolean {
  return rhythm.some((r) => Math.abs((r.startBeat % 1) - 0.5) < 1e-6);
}
