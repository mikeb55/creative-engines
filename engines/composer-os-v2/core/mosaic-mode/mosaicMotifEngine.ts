/**
 * Mosaic Mode — seeded source motif + per-section composer transforms (MVP).
 */

import type { CoreMotif, HookContourDirs, MotifRegisterTag, MotifRoleTag } from '../motif/motifEngineTypes';
import { seededUnit } from '../goldenPath/guitarBassDuoHarmony';
import type { MosaicModeSectionPlan } from './precomputeMosaicEffectiveHarmonyBars';
import type { MosaicTonicMap } from './precomputeMosaicEffectiveHarmonyBars';

const INTERVAL_POOL = [1, 2, 3, 5, 7] as const;
const DURATION_POOL = [0.5, 1, 1.5, 2] as const;

function pickContourFamily(seed: number, salt: number): HookContourDirs {
  const u = seededUnit(seed, salt, 0);
  if (u < 0.34) return [1, -1, 1];
  if (u < 0.67) return [1, -1, -1];
  return [-1, 1, 1];
}

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

function buildRhythmPattern(seed: number, noteCount: number): CoreMotif['rhythmPattern'] {
  const count = Math.min(Math.max(noteCount, 3), 4);
  const rhythm: CoreMotif['rhythmPattern'] = [];
  let start = 0;
  let total = 0;
  for (let i = 0; i < count; i++) {
    const remaining = 4 - total;
    const eligible = DURATION_POOL.filter((d) => d <= remaining + 1e-6);
    const dur =
      eligible[Math.floor(seededUnit(seed, 93200 + i, 0) * eligible.length)] ??
      eligible[eligible.length - 1] ??
      0.5;
    rhythm.push({ startBeat: start, duration: dur });
    start += dur;
    total += dur;
    if (total >= 4 - 1e-6) break;
  }
  while (rhythm.length < 3) {
    const last = rhythm[rhythm.length - 1];
    const nextStart = last ? last.startBeat + last.duration : 0;
    rhythm.push({ startBeat: nextStart, duration: 0.5 });
  }
  return rhythm.slice(0, count);
}

function buildIntervalPattern(seed: number, contourDirs: HookContourDirs): number[] {
  const count = 3 + Math.floor(seededUnit(seed, 93101, 0) * 2);
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const mag = INTERVAL_POOL[Math.floor(seededUnit(seed, 93110 + i, 0) * INTERVAL_POOL.length)]!;
    const dir = contourDirs[i] ?? contourDirs[contourDirs.length - 1] ?? 1;
    out.push(dir >= 0 ? mag : -mag);
  }
  return out;
}

export function generateMosaicSourceMotif(seed: number, totalBars: number): CoreMotif {
  void totalBars;
  const contourDirs = pickContourFamily(seed, 93100);
  const intervalPattern = buildIntervalPattern(seed, contourDirs);
  const noteCount = intervalPattern.length + 1;
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

function applyComposerTransform(
  prefix: string,
  intervals: number[],
  rhythm: CoreMotif['rhythmPattern']
): { intervalPattern: number[]; rhythmPattern: CoreMotif['rhythmPattern'] } {
  const key = prefix.endsWith(':') ? prefix.slice(0, -1) : prefix;

  if (key === 'rf') {
    const intervalPattern = intervals.map((iv) => clampIntervalMagnitude(-iv, 7));
    const rhythmPattern = rhythm.map((r) => ({
      startBeat: r.startBeat,
      duration: roundHalf(r.duration * 1.5),
    }));
    return { intervalPattern, rhythmPattern };
  }

  if (key === 'jw') {
    const intervalPattern = intervals.map((iv) => clampIntervalMagnitude(iv, 5));
    const rhythmPattern = [...rhythm];
    if (rhythmPattern.length > 0) {
      rhythmPattern.push({ ...rhythmPattern[0]! });
    }
    return { intervalPattern, rhythmPattern };
  }

  if (key === 'tv') {
    const intervalPattern = intervals.map((iv) => (Math.abs(iv) > 4 ? (iv >= 0 ? 2 : -2) : iv));
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
