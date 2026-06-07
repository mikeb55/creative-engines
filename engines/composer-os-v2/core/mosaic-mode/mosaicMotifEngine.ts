/**
 * Mosaic Mode — seeded source motif + per-section composer transforms (rc10).
 */

import type { CoreMotif, MotifRegisterTag, MotifRoleTag } from '../motif/motifEngineTypes';
import { seededUnit } from '../goldenPath/guitarBassDuoHarmony';
import type { MosaicModeSectionPlan } from './precomputeMosaicEffectiveHarmonyBars';
import type { MosaicTonicMap } from './precomputeMosaicEffectiveHarmonyBars';
import type { VoiceRuleBundle } from '../composer/voiceRuleBundle';
import { getVoiceRuleBundle, NEUTRAL_VOICE_RULE_BUNDLE } from '../composer/voiceRuleBundles';
import {
  SONGWRITER_STYLE_PROFILES,
  normalizeSongwriterStyleKey,
} from '../song-mode/songwriterStyleProfiles';

const BLUES_INTERVAL_POOL = [0, 2, 3, 5] as const;
const JW_BLUES_SNAP_POOL = [0, 2, 3, 5, 7] as const;
const STEP_POOL = [1, 2] as const;
const NAMED_DELTA_PREFIXES = new Set(['rf', 'jw', 'ws', 'tv', 'jma']);

let lastCorridorCorrectionApplied = false;

export interface DerivedMotifTransform {
  intervalNudge: number;
  intervalClamp: number;
  rhythmScale: number;
  onsetDisplace: boolean;
  preserveContour: boolean;
  preserveSalientLeap: boolean;
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

function snapIntervalToPreferredWeights(
  iv: number,
  weights: Readonly<Partial<Record<number, number>>> | undefined,
  preferredSets: readonly number[] | undefined,
  seed: number,
  salt: number
): number {
  const sign = iv >= 0 ? 1 : -1;
  const mag = Math.abs(iv);
  const fromWeights =
    weights &&
    Object.entries(weights)
      .filter(([, w]) => (w ?? 0) > 0.05)
      .map(([k]) => Number(k));
  const pool =
    fromWeights && fromWeights.length > 0
      ? fromWeights
      : preferredSets?.length
        ? [...preferredSets]
        : null;
  if (!pool?.length) return iv;

  let best = pool[0]!;
  let bestScore = -Infinity;
  for (const p of pool) {
    const weight = weights?.[p] ?? 1;
    const proximity = 1 / (1 + Math.abs(mag - p));
    const jitter = seededUnit(seed, salt, p) * 0.02;
    const score = weight * proximity + jitter;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return sign * best;
}

function enforceMaxConsecutiveSteps(intervals: number[], maxSteps: number): number[] {
  if (maxSteps < 1 || intervals.length === 0) return [...intervals];
  const out = [...intervals];
  let run = 0;
  for (let i = 0; i < out.length; i++) {
    const abs = Math.abs(out[i]!);
    if (abs <= 2) {
      run++;
      if (run > maxSteps) {
        const sign = out[i]! >= 0 ? 1 : -1;
        out[i] = sign * (abs === 2 ? 5 : 7);
        run = 0;
      }
    } else {
      run = 0;
    }
  }
  return out;
}

function buildRhythmFromPulseCell(
  pattern: readonly number[],
  noteCount: number,
  barBeats: number,
  barIndexInSection = 0,
  eighthDuration = barBeats >= 5 ? 1.0 : 0.5
): CoreMotif['rhythmPattern'] {
  if (pattern.length === 0 || noteCount <= 0) return [];
  const slotCount = Math.max(1, Math.round(barBeats / eighthDuration));
  const phase = barIndexInSection % 2;
  const noteDuration = barBeats >= 5 ? 1.0 : eighthDuration;
  const attackBeats: number[] = [];
  for (let s = 0; s < slotCount * 2 && attackBeats.length < noteCount; s++) {
    if (!pattern[(s + phase) % pattern.length]) continue;
    const beat = s * eighthDuration;
    if (beat + noteDuration > barBeats + 1e-6) continue;
    if (!attackBeats.some((b) => Math.abs(b - beat) < 1e-6)) attackBeats.push(beat);
  }
  let guard = 0;
  while (attackBeats.length < noteCount && guard < slotCount * 4) {
    const s = guard;
    if (pattern[(s + phase) % pattern.length]) {
      const beat = s * eighthDuration;
      if (beat + noteDuration <= barBeats + 1e-6 && !attackBeats.some((b) => Math.abs(b - beat) < 1e-6)) {
        attackBeats.push(beat);
      }
    }
    guard++;
  }
  attackBeats.sort((a, b) => a - b);
  return attackBeats.slice(0, noteCount).map((startBeat) => ({
    startBeat,
    duration: noteDuration,
  }));
}

function resolveNotesPerBar(vrb: VoiceRuleBundle, seed: number, sectionBar: number): number | undefined {
  const target = vrb.targetNotesPerBar;
  if (target === undefined) return undefined;
  const variance = vrb.densityVariance ?? 0;
  if (variance <= 0) return target;
  const min = Math.max(1, Math.round(target * (1 - variance)));
  const max = Math.max(min, Math.round(target * (1 + variance)));
  const u = seededUnit(seed, sectionBar, 94200);
  return min + Math.floor(u * (max - min + 1));
}

function expandMotifForVrbPolicy(
  motif: CoreMotif,
  vrb: VoiceRuleBundle,
  seed: number,
  barBeats: number,
  barIndexInSection: number
): CoreMotif {
  const notesPerBar = resolveNotesPerBar(vrb, seed, barIndexInSection);
  const pulseCell = vrb.rhythmPolicy.pulseCell;
  if (notesPerBar === undefined && !pulseCell) return motif;

  const noteCount = notesPerBar ?? motif.rhythmPattern.length;
  const weights = vrb.melodicPolicy.preferredIntervalWeights;
  const preferredSets = vrb.melodicPolicy.preferredIntervalSets;
  const frippCell = [1, 4, -5] as const;
  const wayneCell = [5, -2, 1, -2] as const;
  const isFrippFixedCell = vrb.voiceId === 'fripp' || vrb.voiceId?.startsWith('fripp');
  const isWayneFixedCell = vrb.voiceId === 'wayne_shorter' && Boolean(weights);
  let intervalPattern: number[];
  if (isFrippFixedCell && (weights || preferredSets?.length)) {
    intervalPattern = Array.from(
      { length: Math.max(0, noteCount - 1) },
      (_, i) => frippCell[i % frippCell.length]!
    );
  } else if (isWayneFixedCell) {
    intervalPattern = Array.from(
      { length: Math.max(0, noteCount - 1) },
      (_, i) => wayneCell[i % wayneCell.length]!
    );
  } else if (weights) {
    intervalPattern = [...motif.intervalPattern];
    while (intervalPattern.length < Math.max(0, noteCount - 1)) {
      const pickIdx = intervalPattern.length % Math.max(1, motif.intervalPattern.length);
      intervalPattern.push(motif.intervalPattern[pickIdx] ?? 5);
    }
    intervalPattern = intervalPattern.slice(0, Math.max(0, noteCount - 1));
    intervalPattern = intervalPattern.map((iv, i) =>
      snapIntervalToPreferredWeights(
        iv,
        weights,
        preferredSets,
        seed,
        94300 + barIndexInSection * 16 + i
      )
    );
  } else {
    intervalPattern = [...motif.intervalPattern];
    while (intervalPattern.length < Math.max(0, noteCount - 1)) {
      const pickIdx = intervalPattern.length % Math.max(1, motif.intervalPattern.length);
      intervalPattern.push(motif.intervalPattern[pickIdx] ?? 5);
    }
    intervalPattern = intervalPattern.slice(0, Math.max(0, noteCount - 1));
    intervalPattern = intervalPattern.map((iv, i) =>
      snapIntervalToPreferredWeights(
        iv,
        undefined,
        preferredSets,
        seed,
        94300 + barIndexInSection * 16 + i
      )
    );
  }
  if (vrb.melodicPolicy.maxConsecutiveSteps !== undefined) {
    intervalPattern = enforceMaxConsecutiveSteps(
      intervalPattern,
      vrb.melodicPolicy.maxConsecutiveSteps
    );
  }
  const rhythmPattern = pulseCell
    ? buildRhythmFromPulseCell(pulseCell.pattern, noteCount, barBeats, barIndexInSection)
    : motif.rhythmPattern.slice(0, noteCount).map((r) => ({ ...r }));

  return {
    ...motif,
    intervalPattern,
    rhythmPattern,
    contourPattern: contourFromIntervals(intervalPattern),
  };
}

export function mosaicVrbTilesMotifAcrossSection(songwriterStyleId: string): boolean {
  const vrb = getVoiceRuleBundle(songwriterStyleId);
  return vrb.targetNotesPerBar !== undefined || vrb.rhythmPolicy.pulseCell !== undefined;
}

export type MosaicMotifBarNote = { pitch: number; startBeat: number; duration: number };

function nudgePitchAwayFromBluesInterval(
  pitch: number,
  prevPitch: number,
  effectiveLow: number,
  effectiveHigh: number
): number {
  let p = pitch;
  let guard = 0;
  while (guard < 24) {
    const delta = p - prevPitch;
    if (Math.abs(delta) !== 3 && Math.abs(delta) !== 6) break;
    p += delta >= 0 ? 1 : -1;
    p = Math.max(effectiveLow, Math.min(effectiveHigh, p));
    guard++;
  }
  return p;
}

export function mosaicMotifNotesForBar(
  core: CoreMotif,
  songwriterStyleId: string,
  seed: number,
  barBeats: number,
  barIndexInSection: number,
  startMidi: number,
  effectiveLow: number,
  effectiveHigh: number,
  continueFromPitch?: number
): MosaicMotifBarNote[] {
  const vrb = getVoiceRuleBundle(songwriterStyleId);
  const expanded = expandMotifForVrbPolicy(core, vrb, seed, barBeats, barIndexInSection);
  const notes: MosaicMotifBarNote[] = [];
  let pitch = startMidi;
  let prevPitch: number | null = continueFromPitch ?? null;
  let intervalIdx = 0;
  const skipBluesNudge = vrb.voiceId === 'wayne_shorter';
  if (continueFromPitch != null && expanded.intervalPattern.length > 0) {
    pitch = continueFromPitch + expanded.intervalPattern[0]!;
    while (pitch < effectiveLow) pitch += 12;
    while (pitch > effectiveHigh) pitch -= 12;
    intervalIdx = 1;
  }
  for (let i = 0; i < expanded.rhythmPattern.length; i++) {
    const rh = expanded.rhythmPattern[i]!;
    if (rh.startBeat >= barBeats - 1e-6) continue;
    const tailGap = 0.5;
    const maxDur = Math.max(0, barBeats - rh.startBeat - tailGap);
    const duration = Math.min(rh.duration, maxDur);
    if (duration <= 0) continue;
    if (i > 0 && intervalIdx < expanded.intervalPattern.length) {
      pitch += expanded.intervalPattern[intervalIdx]!;
      intervalIdx++;
      while (pitch < effectiveLow) pitch += 12;
      while (pitch > effectiveHigh) pitch -= 12;
    }
    if (prevPitch !== null && !skipBluesNudge) {
      pitch = nudgePitchAwayFromBluesInterval(pitch, prevPitch, effectiveLow, effectiveHigh);
    }
    notes.push({ pitch, startBeat: rh.startBeat, duration });
    prevPitch = pitch;
  }
  return notes;
}

function applyVrbIntervalRhythmPolicy(
  intervalPattern: number[],
  rhythmPattern: CoreMotif['rhythmPattern'],
  vrb: VoiceRuleBundle,
  seed: number,
  barBeats: number
): { intervalPattern: number[]; rhythmPattern: CoreMotif['rhythmPattern'] } {
  const hasWeights = Boolean(vrb.melodicPolicy.preferredIntervalWeights);
  const hasSets = Boolean(vrb.melodicPolicy.preferredIntervalSets?.length);
  const hasPulse = Boolean(vrb.rhythmPolicy.pulseCell);
  const hasDensity = vrb.targetNotesPerBar !== undefined;
  if (!hasWeights && !hasSets && !hasPulse && !hasDensity && vrb.melodicPolicy.maxConsecutiveSteps === undefined) {
    return { intervalPattern, rhythmPattern };
  }

  const motif: CoreMotif = {
    id: 'vrb_policy_scratch',
    intervalPattern,
    rhythmPattern,
    contourPattern: contourFromIntervals(intervalPattern),
    roleTags: [],
    registerTags: [],
  };
  const expanded = expandMotifForVrbPolicy(motif, vrb, seed, barBeats, 0);
  return { intervalPattern: expanded.intervalPattern, rhythmPattern: expanded.rhythmPattern };
}

function snapToBluesInterval(iv: number, pool: readonly number[] = BLUES_INTERVAL_POOL): number {
  const sign = iv >= 0 ? 1 : -1;
  const mag = Math.abs(iv);
  let best: number = pool[0]!;
  let bestDist = Infinity;
  for (const p of pool) {
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

function salientLeapIndex(intervals: number[]): number {
  if (intervals.length === 0) return 0;
  return intervals.reduce(
    (best, iv, i) => (Math.abs(iv) > Math.abs(intervals[best]!) ? i : best),
    0
  );
}

function normalizePrefix(prefix: string): string {
  return prefix.endsWith(':') ? prefix.slice(0, -1) : prefix;
}

function shortestTonicDelta(delta: number): number {
  let d = delta;
  if (d > 6) d -= 12;
  if (d < -6) d += 12;
  return d;
}

function applyTonicTranspositionOnly(
  source: CoreMotif,
  sectionLabel: string,
  tonicDeltaSemitones: number
): CoreMotif {
  const delta = shortestTonicDelta(tonicDeltaSemitones);
  const intervalPattern = [...source.intervalPattern];
  if (intervalPattern.length > 0 && delta !== 0) {
    const last = intervalPattern.length - 1;
    intervalPattern[last] = clampIntervalMagnitude(intervalPattern[last]! + delta, 12);
  }
  return {
    id: `mosaic_variant_${sectionLabel}`,
    intervalPattern,
    rhythmPattern: source.rhythmPattern.map((r) => ({ ...r })),
    contourPattern: contourFromIntervals(intervalPattern),
    roleTags: ['mosaic_variant' as MotifRoleTag],
    registerTags: ['mid' as MotifRegisterTag],
  };
}

export function deriveMotifTransformFromVrb(songwriterStyleId: string): DerivedMotifTransform {
  const vrb = getVoiceRuleBundle(songwriterStyleId);
  const profileKey = normalizeSongwriterStyleKey(songwriterStyleId);
  const profile = profileKey ? SONGWRITER_STYLE_PROFILES[profileKey] : null;

  const intervalPref = vrb.duoVoicePolicy?.intervalPreference as string | undefined;
  let intervalNudge = 0;
  if (intervalPref === 'blues_chromatic' || intervalPref === 'narrow') {
    intervalNudge = -1;
  } else if (intervalPref === 'wide' || (vrb.melodicPolicy.maxLeapSemitones ?? 7) >= 12) {
    intervalNudge = 1;
  }

  const intervalClamp = Math.min(vrb.melodicPolicy.maxLeapSemitones ?? 7, 10);

  let rhythmScale = 1.0;
  if (vrb.rhythmPolicy.antiMetric === true) {
    rhythmScale = 1.25;
  } else if ((profile?.syncopationBias ?? 0) > 0.6) {
    rhythmScale = 0.75;
  }

  const rhythmAnticipation =
    (vrb.rhythmPolicy as { anticipationRateMax?: number }).anticipationRateMax ??
    vrb.anticipationRateMax ??
    0;
  const onsetDisplace =
    rhythmAnticipation > 0.3 ||
    (profile?.syncopationBias ?? 0) > 0.5 ||
    vrb.rhythmPolicy.antiMetric === true;

  const preserveContour = vrb.melodicPolicy.contour !== 'angular';
  const preserveSalientLeap = (vrb.melodicPolicy.maxLeapSemitones ?? 7) >= 7;

  return {
    intervalNudge,
    intervalClamp,
    rhythmScale,
    onsetDisplace,
    preserveContour,
    preserveSalientLeap,
  };
}

export function estimateMotifIntervalSimilarity(source: number[], result: number[]): number {
  const n = Math.max(source.length, result.length);
  if (n === 0) return 1;
  let diffSum = 0;
  for (let i = 0; i < Math.min(source.length, result.length); i++) {
    diffSum += Math.abs(result[i]! - source[i]!);
  }
  return 1 - diffSum / (n * 12);
}

function enforcePerplexityCorridor(
  sourceIntervals: number[],
  intervalPattern: number[],
  rhythmPattern: CoreMotif['rhythmPattern'],
  sourceRhythm: CoreMotif['rhythmPattern'],
  intervalClamp: number,
  preserveSalientLeap = false
): { intervalPattern: number[]; rhythmPattern: CoreMotif['rhythmPattern']; corrected: boolean } {
  let intervals = [...intervalPattern];
  const rhythm = rhythmPattern.map((r) => ({ ...r }));
  let corrected = false;
  const salientIdx = salientLeapIndex(sourceIntervals);
  const salientVal = sourceIntervals[salientIdx]!;
  const maxNonSalientDrift = 2;

  const nudgeIndexAwayFromSource = (i: number): boolean => {
    if (i < 0 || i >= intervals.length) return false;
    if (preserveSalientLeap && i === salientIdx) return false;
    const src = sourceIntervals[i] ?? 0;
    const cur = intervals[i]!;
    const step = Math.abs(cur - src + 1) >= Math.abs(cur - src - 1) ? 1 : -1;
    let toward = cur + step;
    if (i > 0 && i < intervals.length - 1 && Math.abs(toward - src) > maxNonSalientDrift) {
      toward = src + maxNonSalientDrift * Math.sign(toward - src);
    }
    intervals[i] = clampIntervalMagnitude(toward, intervalClamp);
    return intervals[i] !== cur;
  };

  let guard = 0;
  let similarity = estimateMotifIntervalSimilarity(sourceIntervals, intervals);
  while (similarity > 0.75 && guard < 24) {
    let moved = false;
    for (let i = 1; i < intervals.length - 1; i++) {
      if (nudgeIndexAwayFromSource(i)) {
        corrected = true;
        moved = true;
        break;
      }
    }
    if (!moved && intervals.length > 0) {
      moved = nudgeIndexAwayFromSource(0);
      if (moved) corrected = true;
    }
    if (!moved) break;
    similarity = estimateMotifIntervalSimilarity(sourceIntervals, intervals);
    guard++;
  }

  guard = 0;
  while (similarity > 0.75 && guard < 8) {
    let moved = false;
    for (let i = 0; i < intervals.length; i++) {
      if (preserveSalientLeap && i === salientIdx) continue;
      const src = sourceIntervals[i] ?? 0;
      const cur = intervals[i]!;
      const step = Math.abs(cur - src + 1) >= Math.abs(cur - src - 1) ? 1 : -1;
      const toward = cur + step;
      const next = clampIntervalMagnitude(toward, intervalClamp);
      if (next === cur) continue;
      intervals[i] = next;
      corrected = true;
      moved = true;
      break;
    }
    if (!moved) break;
    similarity = estimateMotifIntervalSimilarity(sourceIntervals, intervals);
    guard++;
  }

  guard = 0;
  while (similarity < 0.4 && guard < 8) {
    const resultSalientIdx = salientLeapIndex(intervals);
    if (resultSalientIdx >= 0 && resultSalientIdx < intervals.length) {
      intervals[resultSalientIdx] = salientVal;
      corrected = true;
    }
    similarity = estimateMotifIntervalSimilarity(sourceIntervals, intervals);
    guard++;
  }

  void sourceRhythm;
  void rhythm;
  return { intervalPattern: intervals, rhythmPattern, corrected };
}

export function getLastMosaicCorridorCorrectionApplied(): boolean {
  return lastCorridorCorrectionApplied;
}

export function applyDerivedTransform(
  source: CoreMotif,
  t: DerivedMotifTransform,
  tonicDeltaSemitones: number
): CoreMotif {
  lastCorridorCorrectionApplied = false;
  const sourceIntervals = [...source.intervalPattern];
  const sourceRhythm = source.rhythmPattern.map((r) => ({ ...r }));
  const sourceContour = [...source.contourPattern];
  const salientIdx = salientLeapIndex(sourceIntervals);
  const salientVal = sourceIntervals[salientIdx]!;

  const intervalPattern = [...sourceIntervals];
  const delta = shortestTonicDelta(tonicDeltaSemitones);
  if (intervalPattern.length > 0 && delta !== 0) {
    intervalPattern[0] = clampIntervalMagnitude(intervalPattern[0]! + delta, t.intervalClamp);
  }

  for (let i = 1; i < intervalPattern.length - 1; i++) {
    intervalPattern[i] = clampIntervalMagnitude(intervalPattern[i]! + t.intervalNudge, t.intervalClamp);
  }

  if (t.preserveSalientLeap && salientIdx >= 0 && salientIdx < intervalPattern.length) {
    intervalPattern[salientIdx] = salientVal;
  }

  if (t.preserveContour) {
    for (let i = 0; i < intervalPattern.length; i++) {
      const srcDir = sourceContour[i] ?? 0;
      const cur = intervalPattern[i]!;
      if (srcDir === 0 || cur === 0) continue;
      if (Math.sign(cur) !== Math.sign(srcDir)) {
        intervalPattern[i] = -cur;
      }
    }
  }

  let rhythmPattern = sourceRhythm.map((r) => ({ ...r }));
  if (t.rhythmScale !== 1.0) {
    rhythmPattern = rhythmPattern.map((r) => ({
      startBeat: r.startBeat,
      duration: Math.max(0.5, Math.min(3.0, roundHalf(r.duration * t.rhythmScale))),
    }));
  }

  if (t.onsetDisplace) {
    for (let i = 1; i < rhythmPattern.length - 1; i++) {
      const onset = rhythmPattern[i]!;
      if (Math.abs(onset.startBeat % 1) < 1e-6) {
        rhythmPattern[i] = { startBeat: onset.startBeat + 0.5, duration: onset.duration };
        break;
      }
    }
  }

  let similarity = estimateMotifIntervalSimilarity(sourceIntervals, intervalPattern);
  const corridor = enforcePerplexityCorridor(
    sourceIntervals,
    intervalPattern,
    rhythmPattern,
    sourceRhythm,
    t.intervalClamp,
    t.preserveSalientLeap
  );
  intervalPattern.splice(0, intervalPattern.length, ...corridor.intervalPattern);
  rhythmPattern = corridor.rhythmPattern;
  if (corridor.corrected) lastCorridorCorrectionApplied = true;
  similarity = estimateMotifIntervalSimilarity(sourceIntervals, intervalPattern);
  void similarity;

  return {
    id: source.id,
    intervalPattern,
    rhythmPattern,
    contourPattern: contourFromIntervals(intervalPattern),
    roleTags: ['mosaic_variant' as MotifRoleTag],
    registerTags: ['mid' as MotifRegisterTag],
  };
}

function transformWsDelta(
  intervals: number[],
  rhythm: CoreMotif['rhythmPattern'],
  sourceIntervals: number[]
): { intervalPattern: number[]; rhythmPattern: CoreMotif['rhythmPattern'] } {
  if (intervals.length === 0 || rhythm.length === 0) {
    return { intervalPattern: [...intervals], rhythmPattern: rhythm.map((r) => ({ ...r })) };
  }
  const leapIdx = Math.min(salientLeapIndex(sourceIntervals), intervals.length - 1);
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

  for (let i = 1; i < rhythmPattern.length - 1; i++) {
    if (Math.abs(rhythmPattern[i]!.startBeat % 1) < 1e-6) {
      rhythmPattern[i] = {
        startBeat: rhythmPattern[i]!.startBeat + 0.5,
        duration: rhythmPattern[i]!.duration,
      };
      break;
    }
  }

  return { intervalPattern, rhythmPattern };
}

function applyNamedDeltaOverride(
  prefix: string,
  motif: CoreMotif,
  source: CoreMotif,
  songwriterStyleId?: string
): CoreMotif {
  const key = normalizePrefix(prefix);
  let { intervalPattern, rhythmPattern } = {
    intervalPattern: [...motif.intervalPattern],
    rhythmPattern: motif.rhythmPattern.map((r) => ({ ...r })),
  };

  if (key === 'rf') {
    const styleId = songwriterStyleId ?? 'fripp';
    const vrb = getVoiceRuleBundle(styleId);
    if (vrb.melodicPolicy.preferredIntervalWeights || vrb.melodicPolicy.preferredIntervalSets?.length) {
      intervalPattern = intervalPattern.map((iv, i) =>
        clampIntervalMagnitude(
          snapIntervalToPreferredWeights(
            iv,
            vrb.melodicPolicy.preferredIntervalWeights,
            vrb.melodicPolicy.preferredIntervalSets,
            0,
            94400 + i
          ),
          vrb.melodicPolicy.maxLeapSemitones ?? 12
        )
      );
      if (vrb.melodicPolicy.maxConsecutiveSteps !== undefined) {
        intervalPattern = enforceMaxConsecutiveSteps(
          intervalPattern,
          vrb.melodicPolicy.maxConsecutiveSteps
        );
      }
    } else {
      intervalPattern = intervalPattern.map((iv) => {
        const sequenced = ((Math.abs(iv) + 2) % 12) * (iv >= 0 ? 1 : -1);
        return clampIntervalMagnitude(sequenced, 7);
      });
    }
    const barBeats = 5;
    if (vrb.rhythmPolicy.pulseCell || vrb.targetNotesPerBar !== undefined) {
      ({ intervalPattern, rhythmPattern } = applyVrbIntervalRhythmPolicy(
        intervalPattern,
        rhythmPattern,
        vrb,
        0,
        barBeats
      ));
    } else {
      rhythmPattern = rotateRhythmOnsets(rhythmPattern);
    }
  } else if (key === 'jw') {
    intervalPattern = intervalPattern.map((iv, i) => {
      if (i === 0 || i === intervalPattern.length - 1) return clampIntervalMagnitude(iv, 7);
      return clampIntervalMagnitude(snapToBluesInterval(iv, JW_BLUES_SNAP_POOL), 7);
    });
  } else if (key === 'ws') {
    ({ intervalPattern, rhythmPattern } = transformWsDelta(
      intervalPattern,
      rhythmPattern,
      source.intervalPattern
    ));
    const styleId = songwriterStyleId ?? 'wayne_shorter';
    const vrb = getVoiceRuleBundle(styleId);
    if (
      vrb.melodicPolicy.preferredIntervalWeights ||
      vrb.rhythmPolicy.pulseCell ||
      vrb.targetNotesPerBar !== undefined
    ) {
      ({ intervalPattern, rhythmPattern } = applyVrbIntervalRhythmPolicy(
        intervalPattern,
        rhythmPattern,
        vrb,
        0,
        4
      ));
    }
  } else if (key === 'tv') {
    intervalPattern = intervalPattern.map((iv) =>
      Math.abs(iv) > 3 ? (iv >= 0 ? 2 : -2) : iv
    );
  } else if (key === 'jma') {
    intervalPattern = intervalPattern.map((iv, i) => {
      if (i === 0 || i === intervalPattern.length - 1) return iv;
      const sign = iv >= 0 ? 1 : -1;
      return clampIntervalMagnitude(sign * (Math.abs(iv) + 1), 7);
    });
    rhythmPattern = rhythmPattern.map((r) => ({
      startBeat: r.startBeat,
      duration: Math.max(0.5, roundHalf(r.duration * 0.75)),
    }));
  } else {
    void source;
  }

  return {
    ...motif,
    intervalPattern,
    rhythmPattern,
    contourPattern: contourFromIntervals(intervalPattern),
  };
}

export function transformMotifForSection(
  source: CoreMotif,
  sectionLabel: string,
  composerPrefix: string,
  tonicDeltaSemitones: number,
  songwriterStyleId?: string
): CoreMotif {
  const styleId = songwriterStyleId ?? composerPrefix;
  const vrb = getVoiceRuleBundle(styleId);
  const profileKey = normalizeSongwriterStyleKey(styleId);
  const profile = profileKey ? SONGWRITER_STYLE_PROFILES[profileKey] : null;

  let result: CoreMotif;
  if (vrb.voiceId === NEUTRAL_VOICE_RULE_BUNDLE.voiceId && !profile) {
    result = applyTonicTranspositionOnly(source, sectionLabel, tonicDeltaSemitones);
  } else {
    const transform = deriveMotifTransformFromVrb(styleId);
    result = applyDerivedTransform(source, transform, tonicDeltaSemitones);
    result = { ...result, id: `mosaic_variant_${sectionLabel}` };
  }

  const prefixKey = normalizePrefix(composerPrefix);
  if (NAMED_DELTA_PREFIXES.has(prefixKey)) {
    result = applyNamedDeltaOverride(prefixKey, result, source, styleId);
    result = { ...result, id: `mosaic_variant_${sectionLabel}` };
  }

  return {
    ...result,
    id: `mosaic_variant_${sectionLabel}`,
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
      delta,
      section.songwriterStyleId
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
